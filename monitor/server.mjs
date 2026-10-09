import { readFile } from 'node:fs/promises';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { Monitor, createCameraSource, createReplaySource } from './core.mjs';

const base = new URL('.', import.meta.url);
const equalSecret = (a, b) => typeof a === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const json = (body, status = 200, headers = {}) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
async function smallJson(req) {
  const reader = req.body?.getReader();
  if (!reader) return {};
  let total = 0; const chunks = [];
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    total += value.length; if (total > 4096) { await reader.cancel(); throw new Error('Request is too large.'); }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
export async function loadReferences() {
  const manifest = JSON.parse(await readFile(new URL('fixtures/references.json', base), 'utf8'));
  return Promise.all(manifest.images.map(async item => ({ bytes: await readFile(new URL(`fixtures/${item.file}`, base)), reference: item.label })));
}
export function createHandler({ monitor, accessToken = '', port = 3040, host = '127.0.0.1', now = Date.now }) {
  const sessions = new Map(); const loginAttempts = new Map();
  const isLocal = ['127.0.0.1', 'localhost', '::1'].includes(host);
  if (!isLocal && accessToken.length < 16) throw new Error('Binding to a LAN interface requires MONITOR_ACCESS_TOKEN (at least 16 characters).');
  const security = {
    'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' blob: data:; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
  };
  function authorized(req) {
    if (!accessToken) return true;
    const cookie = req.headers.get('cookie')?.match(/(?:^|;\s*)mv_session=([a-f0-9]{48})(?:;|$)/)?.[1];
    return cookie && (sessions.get(cookie) ?? 0) > now();
  }
  return async (req, server) => {
    try {
      const url = new URL(req.url);
      // Loopback servers reject rebinding; LAN instances have explicit authentication.
      if (isLocal && !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) return json({ error: 'Invalid host.' }, 403);
      const origin = req.headers.get('origin');
      if (origin && origin !== url.origin) return json({ error: 'Cross-origin requests are not accepted.' }, 403);
      if (req.headers.get('sec-fetch-site') === 'cross-site') return json({ error: 'Cross-site requests are not accepted.' }, 403);
      if (url.pathname === '/api/login' && req.method === 'POST') {
        const ip = server?.requestIP?.(req)?.address ?? 'local';
        const old = loginAttempts.get(ip);
        const record = old && now() - old.since < 60000 ? old : { count: 0, since: now() };
        if (record.count >= 10) return json({ error: 'Too many attempts. Retry in a minute.' }, 429);
        record.count++; loginAttempts.set(ip, record);
        if (loginAttempts.size > 1000) loginAttempts.clear();
        const body = await smallJson(req);
        if (accessToken && !equalSecret(body.token, accessToken)) return json({ error: 'Incorrect access token.' }, 401);
        const session = randomBytes(24).toString('hex');
        for (const [id, expires] of sessions) if (expires <= now()) sessions.delete(id);
        if (sessions.size >= 100) sessions.delete(sessions.keys().next().value);
        sessions.set(session, now() + 8 * 3600000);
        return json({ ok: true }, 200, { 'Set-Cookie': `mv_session=${session}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${url.protocol === 'https:' ? '; Secure' : ''}` });
      }
      if (url.pathname.startsWith('/api/') && !authorized(req)) return json({ error: 'Monitor access token required.' }, 401);
      if (url.pathname === '/api/state' && req.method === 'GET') return json(monitor.state());
      if (url.pathname === '/api/export' && req.method === 'GET') return json({ exportedAt: new Date(now()).toISOString(), ...monitor.state() }, 200, { 'Content-Disposition': 'attachment; filename="museview-monitor-session.json"' });
      if (url.pathname === '/api/capture' && req.method === 'POST') {
        await smallJson(req); const result = await monitor.capture();
        return json({ ...result, state: monitor.state() }, result.busy ? 409 : result.ok ? 200 : 502);
      }
      if (url.pathname === '/api/session' && req.method === 'POST') {
        const body = await smallJson(req); if (typeof body.paused !== 'boolean') return json({ error: 'paused must be a boolean.' }, 400);
        monitor.setPaused(body.paused); return json(monitor.state());
      }
      if (url.pathname === '/api/demo' && req.method === 'POST') {
        const body = await smallJson(req);
        if (monitor.source.mode !== 'demo') return json({ error: 'Demo controls are disabled for a real camera.' }, 403);
        if (!['normal', 'offline', 'malformed', 'frozen'].includes(body.condition)) return json({ error: 'Unknown condition.' }, 400);
        monitor.setDemoCondition(body.condition); return json(monitor.state());
      }
      const frameMatch = url.pathname.match(/^\/api\/frames\/([1-9]\d*)\.jpg$/);
      if (frameMatch && req.method === 'GET') {
        const frame = monitor.frames.find(f => f.id === frameMatch[1]);
        if (!frame) return json({ error: 'Image expired from the bounded session history.' }, 404);
        return new Response(frame.bytes, { headers: { ...security, 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store' } });
      }
      if (req.method !== 'GET') return json({ error: 'Unsupported route or method.' }, 404);
      const assets = { '/': ['index.html', 'text/html; charset=utf-8'], '/app.js': ['app.js', 'text/javascript'], '/styles.css': ['styles.css', 'text/css'] };
      const asset = assets[url.pathname];
      if (!asset) return json({ error: 'Not found.' }, 404);
      return new Response(await readFile(new URL(`public/${asset[0]}`, base)), { headers: { ...security, 'Content-Type': asset[1], 'Cache-Control': 'no-store' } });
    } catch { return json({ error: 'Invalid request or unavailable resource.' }, 400); }
  };
}
export async function main(env = process.env) {
  const mode = env.MUSEVIEW_MODE ?? 'demo';
  if (!['demo', 'camera'].includes(mode)) throw new Error('MUSEVIEW_MODE must be demo or camera.');
  const port = Number(env.MONITOR_PORT ?? 3040), host = env.MONITOR_HOST ?? '127.0.0.1';
  const intervalMs = Number(env.MONITOR_INTERVAL_MS ?? (mode === 'demo' ? 5000 : 30000));
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid monitor port.');
  if (!Number.isInteger(intervalMs) || intervalMs < (mode === 'demo' ? 1000 : 10000) || intervalMs > 3600000) throw new Error('Invalid capture interval.');
  const source = mode === 'camera' ? createCameraSource({ url: env.MUSEVIEW_CAMERA_URL ?? '', token: env.MUSEVIEW_CAMERA_TOKEN }) : createReplaySource({ images: await loadReferences() });
  const monitor = new Monitor({ source, intervalMs });
  const handler = createHandler({ monitor, host, port, accessToken: env.MONITOR_ACCESS_TOKEN ?? '' });
  const server = Bun.serve({ hostname: host, port, fetch: handler, idleTimeout: 30 });
  console.log(`MuseView ${mode === 'demo' ? 'REFERENCE REPLAY (not board footage)' : 'LOCAL CAMERA'} monitor: http://${host}:${server.port}`);
  console.log('Visual checks only. No automatic failure detection or printer control.');
  await monitor.capture(); monitor.start();
  const close = () => { monitor.stop(); server.stop(true); process.exit(0); };
  process.once('SIGINT', close); process.once('SIGTERM', close);
  return { server, monitor };
}
if (import.meta.main) main().catch(error => { console.error(error.message); process.exitCode = 1; });
