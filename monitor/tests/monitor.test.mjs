import { describe, test, expect, afterEach } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { Monitor, CaptureError, createCameraSource, createReplaySource, inspectJpeg, MAX_JPEG_BYTES } from '../core.mjs';
import { createHandler } from '../server.mjs';

const bytes = await readFile(new URL('../fixtures/reference-benchy.jpg', import.meta.url));
const images = [{ bytes, reference: 'Public reference; not board footage' }];
const token = 'test-camera-token-32-characters';
const boot = '0123456789abcdef';
const headers = id => ({ 'Content-Type': 'image/jpeg', 'X-MuseView-Capture-Id': String(id), 'X-MuseView-Capture-Uptime-Ms': String(id * 1000), 'X-MuseView-Boot-Id': boot });
const servers = [], monitors = [];
afterEach(() => { servers.splice(0).forEach(s => s.stop(true)); monitors.splice(0).forEach(m => m.stop()); });
function monitor(opts = {}) { const m = new Monitor({ source: createReplaySource({ images }), intervalMs: 1000, ...opts }); monitors.push(m); return m; }
function server(fetch) { const s = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch }); servers.push(s); return s; }

describe('image acquisition and freshness', () => {
  test('decodes a real reference JPEG and rejects truncated, mislabeled and oversized payloads', () => {
    expect(inspectJpeg(bytes)).toMatchObject({ width: 1280, height: 720 });
    expect(() => inspectJpeg(bytes.subarray(0, bytes.length - 50))).toThrow();
    expect(() => inspectJpeg(Buffer.from('<html>login</html>'))).toThrow();
    expect(() => inspectJpeg(Buffer.alloc(MAX_JPEG_BYTES + 1))).toThrow();
  });
  test('identical image content with increasing capture metadata remains valid for a static scene', async () => {
    const m = monitor(); await m.capture(); await m.capture();
    expect(m.state().camera.status).toBe('online');
    expect(m.frames).toHaveLength(2); expect(m.frames[0].sha256).toBe(m.frames[1].sha256);
  });
  test('repeated frame metadata is stale and cannot replace the last valid image', async () => {
    const m = monitor(); await m.capture(); m.setDemoCondition('frozen');
    expect((await m.capture()).ok).toBe(false); expect(m.state().camera.status).toBe('stale');
    expect(m.frames).toHaveLength(1);
  });
  test('offline/malformed responses retain the last frame and recovery clears the error', async () => {
    const m = monitor(); await m.capture(); const first = m.frames[0].id;
    for (const condition of ['offline','malformed']) {
      m.setDemoCondition(condition); expect((await m.capture()).ok).toBe(false);
      expect(m.frames[0].id).toBe(first); expect(m.state().camera.error).toBeTruthy();
    }
    m.setDemoCondition('normal'); expect((await m.capture()).ok).toBe(true);
    expect(m.state().camera.status).toBe('online'); expect(m.state().camera.error).toBeNull();
  });
  test('paused history ages to stale, retention is bounded, and no absolute capture time is invented', async () => {
    let now = 1700000000000; const m = monitor({ now: () => now, monotonicNow: () => now, retentionFrames: 2, staleAfterMs: 5000 });
    for (let i = 0; i < 3; i++) { await m.capture(); now += 1000; }
    expect(m.frames.map(f => f.id)).toEqual(['3','2']); expect(m.state().frames[0].capturedAt).toBeNull();
    m.setPaused(true); now += 6000; expect(m.state().camera.status).toBe('stale');
  });
  test('clock corrections and browser clock skew cannot make old frames fresh', async () => {
    let wall = 1700000000000, elapsed = 0;
    const m = monitor({ now: () => wall, monotonicNow: () => elapsed, staleAfterMs: 5000 });
    await m.capture(); m.setPaused(true); wall -= 3600000; elapsed += 6000;
    expect(m.state().camera.status).toBe('stale'); expect(m.state().frames[0].receivedAgeMs).toBe(6000);
  });
  test('a device reboot starts a new sequence; an out-of-order frame within the boot is rejected', async () => {
    const sequence = [
      { captureId: 10, captureUptimeMs: 10000, bootId: boot },
      { captureId: 1, captureUptimeMs: 500, bootId: '1111111111111111' },
      { captureId: 2, captureUptimeMs: 400, bootId: '1111111111111111' }
    ];
    const m = monitor({ source: { mode: 'camera', sourceLabel: 'test', capture: async () => ({ bytes, source: 'camera', ...sequence.shift() }) } });
    expect((await m.capture()).ok).toBe(true); expect((await m.capture()).ok).toBe(true);
    expect(m.events.some(e => e.kind === 'reconnect')).toBe(true);
    expect((await m.capture()).ok).toBe(false); expect(m.frames).toHaveLength(2);
  });
  test('concurrent requests share no mutable camera transaction', async () => {
    let release; let calls = 0;
    const m = monitor({ source: { mode: 'camera', capture: () => { calls++; return new Promise(resolve => { release = () => resolve({ bytes, source: 'camera', captureId: 1, captureUptimeMs: 1, bootId: boot }); }); } } });
    const first = m.capture(); expect(await m.capture()).toEqual({ ok: false, busy: true });
    release(); expect((await first).ok).toBe(true); expect(calls).toBe(1);
  });
  test('scheduler really acquires periodically and stops when paused', async () => {
    const m = monitor({ intervalMs: 35 }); m.start();
    await Bun.sleep(190); m.setPaused(true); const count = m.frames.length;
    expect(count).toBeGreaterThanOrEqual(2); await Bun.sleep(100); expect(m.frames).toHaveLength(count);
  });
});

describe('real HTTP camera transport', () => {
  test('cached and arbitrary endpoints cannot be configured as fresh capture sources', () => {
    for (const path of ['/last.jpg', '/status.json', '/capture.jpg?cached=true'])
      expect(() => createCameraSource({ url: `http://localhost${path}`, token })).toThrow('/capture.jpg');
  });
  test('sends authentication only to configured source and consumes fresh-frame headers', async () => {
    const s = server(req => {
      expect(req.headers.get('authorization')).toBe(`Bearer ${token}`);
      return new Response(bytes, { headers: headers(2) });
    });
    const source = createCameraSource({ url: `${s.url}capture.jpg`, token });
    const result = await source.capture(); expect(result.captureId).toBe(2); expect(result.bootId).toBe(boot);
    expect(inspectJpeg(result.bytes).width).toBe(1280);
  });
  test('rejects camera redirects without forwarding the bearer token', async () => {
    let destinationCalled = false;
    const dest = server(() => { destinationCalled = true; return new Response(bytes, { headers: headers(1) }); });
    const s = server(() => Response.redirect(dest.url, 302));
    const source = createCameraSource({ url: `${s.url}capture.jpg`, token });
    await expect(source.capture()).rejects.toThrow(); expect(destinationCalled).toBe(false);
  });
  test('missing metadata never becomes an apparently fresh camera frame', async () => {
    const s = server(() => new Response(bytes, { headers: { 'Content-Type': 'image/jpeg' } }));
    await expect(createCameraSource({ url: `${s.url}capture.jpg`, token }).capture()).rejects.toThrow('metadata');
  });
  test('rejects authentication errors, non-JPEG content, and oversized streaming responses', async () => {
    let variant = 0;
    const s = server(() => {
      if (variant === 0) return new Response('denied', { status: 401 });
      if (variant === 1) return new Response('login', { headers: { 'Content-Type': 'text/html' } });
      return new Response(Buffer.alloc(MAX_JPEG_BYTES + 1), { headers: headers(1) });
    });
    const source = createCameraSource({ url: `${s.url}capture.jpg`, token });
    for (variant = 0; variant < 3; variant++) await expect(source.capture()).rejects.toThrow();
  });
  test('request timeout terminates an unresponsive source', async () => {
    const s = server(async () => { await Bun.sleep(100); return new Response(bytes, { headers: headers(1) }); });
    await expect(createCameraSource({ url: `${s.url}capture.jpg`, token, timeoutMs: 20 }).capture()).rejects.toThrow('timed out');
  });
});

describe('dashboard access and HTTP integration', () => {
  test('unauthenticated LAN binding is refused', () => {
    expect(() => createHandler({ monitor: monitor(), host: '0.0.0.0' })).toThrow('MONITOR_ACCESS_TOKEN');
  });
  test('login protects state, frames and export; secrets never appear in state', async () => {
    const m = monitor(); await m.capture();
    const accessToken = 'monitor-access-test-123456';
    const s = server(createHandler({ monitor: m, host: '0.0.0.0', accessToken }));
    for (const path of ['api/state','api/frames/1.jpg','api/export']) expect((await fetch(new URL(path,s.url))).status).toBe(401);
    const denied = await fetch(new URL('api/login',s.url), { method: 'POST', body: JSON.stringify({ token: 'wrong' }) }); expect(denied.status).toBe(401);
    const login = await fetch(new URL('api/login',s.url), { method: 'POST', body: JSON.stringify({ token: accessToken }) });
    expect(login.status).toBe(200); expect(login.headers.get('set-cookie')).toContain('HttpOnly');
    const cookie = login.headers.get('set-cookie').split(';')[0];
    const state = await (await fetch(new URL('api/state',s.url), { headers: { cookie } })).text();
    expect(state).toContain('"mode":"demo"'); expect(state).not.toContain(accessToken);
    expect((await fetch(new URL('api/frames/1.jpg',s.url), { headers: { cookie } })).status).toBe(200);
  });
  test('cross-origin mutation and loopback DNS rebinding are rejected', async () => {
    const h = createHandler({ monitor: monitor() });
    expect((await h(new Request('http://127.0.0.1:3040/api/capture', { method: 'POST', headers: { origin: 'https://evil.example' }, body: '{}' }))).status).toBe(403);
    expect((await h(new Request('http://evil.example/api/state'))).status).toBe(403);
  });
  test('capture, bounded frame fetch, pause and export operate over HTTP', async () => {
    const m = monitor({ retentionFrames: 1 }); const s = server(createHandler({ monitor: m }));
    const post = (path, body) => fetch(new URL(path, s.url), { method: 'POST', body: JSON.stringify(body) });
    expect((await post('api/capture',{})).status).toBe(200);
    expect((await fetch(new URL('api/frames/1.jpg',s.url))).headers.get('content-type')).toBe('image/jpeg');
    expect((await post('api/capture',{})).status).toBe(200);
    expect((await fetch(new URL('api/frames/1.jpg',s.url))).status).toBe(404);
    expect((await (await post('api/session',{ paused: true })).json()).session.paused).toBe(true);
    const exported = await (await fetch(new URL('api/export',s.url))).json();
    expect(exported.mode).toBe('demo'); expect(exported.claims.physicalHardwareTested).toBe(false);
    expect(exported.frames[0]).not.toHaveProperty('bytes');
  });
  test('test injection cannot be enabled for a live camera session', async () => {
    const m = monitor({ source: { mode: 'camera', sourceLabel: 'test' } });
    const h = createHandler({ monitor: m });
    expect((await h(new Request('http://localhost/api/demo',{ method:'POST',body:'{"condition":"offline"}' }))).status).toBe(403);
  });
  test('oversized JSON payloads are rejected before processing', async () => {
    const h = createHandler({ monitor: monitor() });
    expect((await h(new Request('http://localhost/api/session',{method:'POST',body:' '.repeat(5000)}))).status).toBe(400);
  });
});
