import jpeg from 'jpeg-js';
import { createHash } from 'node:crypto';

export const MAX_JPEG_BYTES = 1024 * 1024;
export class CaptureError extends Error {
  constructor(message, status = 'error') { super(message); this.status = status; }
}
export function inspectJpeg(bytes) {
  if (!bytes?.length || bytes.length > MAX_JPEG_BYTES) throw new CaptureError('Image is empty or exceeds the 1 MiB limit.');
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9)
    throw new CaptureError('Camera did not return a complete JPEG.');
  try {
    const decoded = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: false, tolerantDecoding: false, maxResolutionInMP: 3, maxMemoryUsageInMB: 64 });
    if (!decoded.width || !decoded.height) throw new Error('empty dimensions');
    return { width: decoded.width, height: decoded.height, sha256: createHash('sha256').update(bytes).digest('hex') };
  } catch { throw new CaptureError('JPEG could not be decoded within image limits.'); }
}
async function readBounded(response) {
  if (Number(response.headers.get('content-length')) > MAX_JPEG_BYTES) throw new CaptureError('Image exceeds the 1 MiB limit.');
  const reader = response.body?.getReader();
  if (!reader) throw new CaptureError('Camera response has no image body.');
  const chunks = []; let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_JPEG_BYTES) throw new CaptureError('Image exceeds the 1 MiB limit.');
      chunks.push(value);
    }
  } catch (e) { await reader.cancel().catch(() => {}); throw e; }
  return Buffer.concat(chunks);
}
export function createCameraSource({ url, token, timeoutMs = 15000, fetchFn = fetch }) {
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.hash)
    throw new Error('Camera URL must be http(s), without credentials or fragments.');
  if (parsed.pathname !== '/capture.jpg' || parsed.search)
    throw new Error('Camera URL must point to /capture.jpg without query parameters; cached endpoints are not fresh captures.');
  if (!token || token.length < 16) throw new Error('Camera mode requires MUSEVIEW_CAMERA_TOKEN of at least 16 characters.');
  return {
    mode: 'camera', sourceLabel: 'MuseView camera · local network',
    async capture() {
      const abort = new AbortController();
      const timer = setTimeout(() => abort.abort(), timeoutMs);
      try {
        const response = await fetchFn(parsed, { headers: { Authorization: `Bearer ${token}`, Accept: 'image/jpeg', 'Cache-Control': 'no-cache' }, signal: abort.signal, redirect: 'error', cache: 'no-store' });
        if (!response.ok) throw new CaptureError(`Camera returned HTTP ${response.status}.`, response.status >= 500 ? 'offline' : 'error');
        if (!response.headers.get('content-type')?.toLowerCase().startsWith('image/jpeg')) throw new CaptureError('Camera response is not image/jpeg.');
        const id = response.headers.get('x-museview-capture-id');
        const uptime = response.headers.get('x-museview-capture-uptime-ms');
        const bootId = response.headers.get('x-museview-boot-id');
        if (!/^\d+$/.test(id ?? '') || !/^\d+$/.test(uptime ?? '') || !/^[a-f0-9]{16}$/i.test(bootId ?? ''))
          throw new CaptureError('Fresh-frame metadata is missing. Flash the monitoring firmware; freshness cannot be verified.');
        const captureId = Number(id), captureUptimeMs = Number(uptime);
        if (!Number.isSafeInteger(captureId) || captureId < 1 || !Number.isSafeInteger(captureUptimeMs))
          throw new CaptureError('Invalid fresh-frame metadata.');
        return { bytes: await readBounded(response), captureId, captureUptimeMs, bootId, source: 'camera' };
      } catch (error) {
        if (error instanceof CaptureError) throw error;
        // Never expose URLs or authorization values through error messages.
        throw new CaptureError(abort.signal.aborted ? 'Camera request timed out.' : 'Camera is unreachable or rejected the connection.', 'offline');
      } finally { clearTimeout(timer); abort.abort(); }
    }
  };
}

export function createReplaySource({ images }) {
  if (!images.length) throw new Error('Reference replay requires at least one fixture.');
  let condition = 'normal', count = 0;
  return {
    mode: 'demo', sourceLabel: 'Reference-photo replay · not MuseView footage',
    get condition() { return condition; },
    setCondition(value) {
      if (!['normal', 'offline', 'malformed', 'frozen'].includes(value)) throw new Error('Unknown demo condition.');
      condition = value;
    },
    async capture() {
      if (condition === 'offline') throw new CaptureError('Injected offline condition (demo only).', 'offline');
      if (condition !== 'frozen' || count === 0) count += 1;
      const item = images[(count - 1) % images.length];
      return { bytes: condition === 'malformed' ? Buffer.from('not a jpeg') : item.bytes,
        captureId: count, captureUptimeMs: count * 1000, bootId: '0000000000000001', source: 'demo',
        reference: item.reference ?? 'Software test fixture' };
    }
  };
}

export class Monitor {
  constructor({ source, intervalMs = 30000, retentionFrames = 120, staleAfterMs = intervalMs * 2 + 15000, now = Date.now, monotonicNow = () => performance.now() }) {
    this.source = source; this.intervalMs = intervalMs; this.retentionFrames = retentionFrames;
    this.staleAfterMs = staleAfterMs; this.now = now; this.monotonicNow = monotonicNow; this.lastSuccessTick = null;
    this.session = { startedAt: new Date(now()).toISOString(), paused: false, intervalMs };
    this.camera = { status: 'waiting', lastAttemptAt: null, lastSuccessAt: null, error: null, captureId: null };
    this.frames = []; this.events = []; this.busy = false; this.serial = 0; this.previous = null; this.timer = null;
    this.event('session', `${source.mode === 'demo' ? 'Reference replay' : 'Camera'} session started. Frames are kept in bounded memory.`);
  }
  event(kind, message) {
    this.events.unshift({ at: new Date(this.now()).toISOString(), kind, message });
    this.events.length = Math.min(this.events.length, 150);
  }
  state() {
    const camera = { ...this.camera };
    const tick = this.monotonicNow();
    camera.lastSuccessAgeMs = this.lastSuccessTick === null ? null : Math.max(0, tick - this.lastSuccessTick);
    if (camera.status === 'online' && camera.lastSuccessAgeMs > this.staleAfterMs)
      camera.status = 'stale';
    return { mode: this.source.mode, sourceLabel: this.source.sourceLabel, session: { ...this.session }, camera,
      frames: this.frames.map(({ bytes, receivedTick, ...metadata }) => ({ ...metadata, receivedAgeMs: Math.max(0, tick - receivedTick) })), events: [...this.events],
      limits: { retentionFrames: this.retentionFrames, maxJpegBytes: MAX_JPEG_BYTES, staleAfterMs: this.staleAfterMs },
      demoCondition: this.source.mode === 'demo' ? this.source.condition : null,
      claims: { physicalHardwareTested: false, automaticFailureDetection: false, internetRemoteAccess: false } };
  }
  async capture() {
    if (this.busy) return { ok: false, busy: true };
    this.busy = true; this.camera.lastAttemptAt = new Date(this.now()).toISOString();
    try {
      const result = await this.source.capture();
      const dimensions = inspectJpeg(result.bytes);
      if (this.previous && result.bootId === this.previous.bootId &&
          (result.captureId <= this.previous.captureId || result.captureUptimeMs < this.previous.captureUptimeMs))
        throw new CaptureError('Repeated or out-of-order capture metadata. The displayed image has not been refreshed.', 'stale');
      if (this.previous && result.bootId !== this.previous.bootId) this.event('reconnect', 'Camera reboot detected; a new frame sequence started.');
      const receivedAt = new Date(this.now()).toISOString();
      const receivedTick = this.monotonicNow();
      const id = String(++this.serial);
      const frame = { id, capturedAt: null, receivedAt, receivedTick, url: `/api/frames/${id}.jpg`, ...dimensions,
        source: result.source, captureId: result.captureId, captureUptimeMs: result.captureUptimeMs,
        bootId: result.bootId, reference: result.reference ?? null, bytes: result.bytes };
      this.frames.unshift(frame);
      this.frames.length = Math.min(this.frames.length, this.retentionFrames);
      const recovered = ['error', 'offline', 'stale'].includes(this.camera.status);
      this.previous = { bootId: result.bootId, captureId: result.captureId, captureUptimeMs: result.captureUptimeMs };
      this.lastSuccessTick = receivedTick;
      Object.assign(this.camera, { status: 'online', error: null, lastSuccessAt: receivedAt, captureId: result.captureId });
      this.event(recovered ? 'recovered' : 'capture', `${this.source.mode === 'demo' ? 'Reference frame replayed' : 'Fresh camera frame received'} (${dimensions.width} × ${dimensions.height}).`);
      return { ok: true, frame: this.state().frames[0] };
    } catch (e) {
      this.camera.status = e instanceof CaptureError ? e.status : 'error';
      this.camera.error = e instanceof CaptureError ? e.message : 'Capture failed. Check the camera connection.';
      this.event(this.camera.status, this.camera.error);
      return { ok: false, error: this.camera.error };
    } finally { this.busy = false; }
  }
  setPaused(paused) {
    this.session.paused = paused;
    this.event('session', paused ? 'Automatic capture paused. Existing images will age.' : 'Automatic capture resumed.');
    if (!paused) this.start(); else { clearTimeout(this.timer); this.timer = null; }
  }
  setDemoCondition(value) {
    if (this.source.mode !== 'demo') throw new Error('Fault injection is available only in reference replay.');
    this.source.setCondition(value); this.event('demo', `Injected transport condition: ${value}. This does not describe a printer fault.`);
  }
  start() {
    if (this.timer || this.session.paused) return;
    this.timer = setTimeout(async () => {
      this.timer = null;
      if (!this.session.paused) { await this.capture(); this.start(); }
    }, this.intervalMs);
    this.timer.unref?.();
  }
  stop() { this.session.paused = true; clearTimeout(this.timer); this.timer = null; }
}
