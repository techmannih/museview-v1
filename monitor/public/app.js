const $ = (id) => document.getElementById(id);
let state = null;
let selectedId = null;
let displayedKey = null;
let historyKey = null;
let eventsKey = null;
let requestBusy = false;
let pollBusy = false;
let lastPollAt = null;
let authRequired = false;

const dateValue = (value) => {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date : null;
};
const clock = (value, seconds = true) => dateValue(value)?.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', ...(seconds ? {second: '2-digit'} : {})}) ?? '—';
const timestamp = (value) => dateValue(value)?.toLocaleString([], {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'}) ?? '—';
const elapsed = (ageMs) => {
  if (!Number.isFinite(ageMs) || ageMs < 0) return null;
  const seconds = Math.floor(ageMs / 1000);
  if (seconds < 2) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor(seconds % 3600 / 60)}m ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};
const intervalLabel = (milliseconds) => {
  const seconds = Number(milliseconds) / 1000;
  if (!Number.isFinite(seconds) || seconds <= 0) return 'Not set';
  return seconds >= 60 && seconds % 60 === 0 ? `Every ${seconds / 60} min` : `Every ${seconds} sec`;
};
const safeFrameUrl = (value) => {
  try {
    const url = new URL(value, location.origin);
    return url.origin === location.origin && url.pathname.startsWith('/api/frames/') ? `${url.pathname}${url.search}` : null;
  } catch { return null; }
};
function getFrames() {
  return Array.isArray(state?.frames) ? [...state.frames].sort((a, b) => (dateValue(b.receivedAt)?.getTime() ?? 0) - (dateValue(a.receivedAt)?.getTime() ?? 0)) : [];
}
function buttonState() {
  $('capture-button').disabled = requestBusy || !state || authRequired;
  $('pause-button').disabled = requestBusy || !state || authRequired;
  $('apply-condition').disabled = requestBusy || !state || authRequired;
  $('pause-button').textContent = state?.session?.paused ? 'Resume automatic capture' : 'Pause automatic capture';
}
function showMessage(id, message, error = false) {
  const target = $(id);
  target.textContent = message;
  target.classList.toggle('has-error', error);
}
function render() {
  if (!state) return;
  const frames = getFrames();
  const latest = frames[0];
  const demo = state.mode === 'demo';
  const paused = Boolean(state.session?.paused);
  const status = ['waiting', 'online', 'offline', 'stale', 'error'].includes(state.camera?.status) ? state.camera.status : 'waiting';
  const statusText = {waiting:'Waiting', online:'Online', offline:'Offline', stale:'Stale source', error:'Source error'}[status];
  const viewingHistory = selectedId && latest?.id !== selectedId;
  const selected = frames.find((frame) => frame.id === selectedId);
  if (selectedId && !selected) selectedId = null;
  const frame = selected || latest;

  $('source-mode').textContent = demo ? 'Reference replay' : 'Live camera';
  $('source-badge').className = 'source-badge';
  $('source-explanation').textContent = demo
    ? 'Reference replay · A single public reference photo is replayed to test the software workflow. This is not a print sequence or MuseView footage.'
    : `Live camera mode · ${state.sourceLabel || 'Configured camera endpoint'}. Connection status below reports the actual source response. This view does not establish that the MuseView PCB has been qualified.`;
  $('demo-controls').hidden = !demo;
  $('camera-status').textContent = statusText;
  $('camera-status').style.color = status === 'online' ? 'var(--sage)' : ['offline', 'error'].includes(status) ? 'var(--red)' : 'var(--amber)';
  $('session-running-dot').style.color = paused ? 'var(--quiet)' : status === 'online' ? 'var(--sage)' : 'var(--amber)';
  $('schedule').textContent = paused ? 'Paused' : intervalLabel(state.session?.intervalMs);
  $('frame-count').textContent = String(frames.length);
  $('session-start').textContent = clock(state.session?.startedAt, false);
  $('retention-label').textContent = state.limits?.retentionFrames ? `Up to ${state.limits.retentionFrames} frames retained` : '';
  $('viewer-title').textContent = viewingHistory && selected ? 'Saved snapshot' : 'Latest snapshot';
  $('history-overlay').hidden = !(viewingHistory && selected);
  const freshness = !frame ? 'Waiting' : viewingHistory && selected ? 'History' : paused ? 'Paused' : status === 'online' ? 'Received' : statusText;
  $('freshness-badge').textContent = freshness;
  $('freshness-badge').className = `small-badge is-${viewingHistory && selected ? 'waiting' : paused ? 'paused' : status}`;
  $('image-provenance').hidden = !frame;
  $('image-source-label').textContent = demo || frame?.source === 'demo' ? 'REFERENCE REPLAY' : 'CAMERA SNAPSHOT';
  $('capture-time').textContent = dateValue(frame?.capturedAt) ? timestamp(frame.capturedAt) : 'Not verified';
  $('received-time').textContent = timestamp(frame?.receivedAt);
  $('resolution').textContent = frame?.width && frame?.height ? `${frame.width} × ${frame.height}` : '—';
  $('device-details').hidden = !frame;
  $('frame-sequence').textContent = Number.isSafeInteger(frame?.captureId) ? `${demo ? 'Injected replay counter' : 'Device capture counter'}: ${frame.captureId}` : '';
  $('frame-uptime').textContent = Number.isFinite(frame?.captureUptimeMs) ? `${demo ? 'Injected' : 'Device'} uptime: ${(frame.captureUptimeMs / 1000).toFixed(1)}s` : '';
  $('reference-caption').textContent = frame?.reference ? `Reference: ${frame.reference}` : '';
  $('frame-age').textContent = frame ? `Received ${elapsed(frame.receivedAgeMs) || 'at an unknown time'}` : 'No frame yet';
  const imageKey = frame ? `${frame.id}:${frame.url}` : null;
  if (imageKey !== displayedKey) {
    displayedKey = imageKey;
    const url = safeFrameUrl(frame?.url);
    $('main-frame').hidden = !url;
    $('empty-frame').hidden = Boolean(url);
    if (url) {
      $('main-frame').src = url;
      $('main-frame').alt = `${demo || frame.source === 'demo' ? 'Reference replay' : 'Camera'} snapshot, received by the monitor ${timestamp(frame.receivedAt)}`;
    } else $('main-frame').removeAttribute('src');
  }
  if (state.camera?.error) {
    $('connection-alert').hidden = false;
    $('connection-alert').textContent = `${demo ? 'Demo source' : 'Camera'}: ${state.camera.error}${frame ? ' The last saved image remains visible; it is not a fresh capture.' : ''}`;
  } else if (lastPollAt) {
    $('connection-alert').hidden = true;
  }
  renderHistory(frames, frame?.id);
  renderEvents();
  buttonState();
}
function renderHistory(frames, currentId) {
  const key = `${frames.map((frame) => `${frame.id}:${frame.url}`).join(',')}|${currentId}`;
  if (key === historyKey) return;
  historyKey = key;
  const scrollLeft = $('history-list').scrollLeft;
  const fragment = document.createDocumentFragment();
  if (!frames.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-history';
    empty.textContent = 'Received snapshots will be saved here for this session.';
    fragment.append(empty);
  }
  frames.forEach((frame, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `history-frame${frame.id === currentId ? ' selected' : ''}`;
    button.setAttribute('aria-pressed', String(frame.id === currentId));
    button.setAttribute('aria-label', `View snapshot received ${timestamp(frame.receivedAt)}`);
    const image = document.createElement('img');
    const url = safeFrameUrl(frame.url);
    if (url) image.src = url;
    image.alt = '';
    image.loading = 'lazy';
    const time = document.createElement('time');
    time.textContent = clock(frame.receivedAt);
    if (dateValue(frame.receivedAt)) time.dateTime = dateValue(frame.receivedAt).toISOString();
    button.append(image, time);
    if (!index) {
      const tag = document.createElement('span');
      tag.className = 'latest-tag';
      tag.textContent = 'LATEST';
      button.append(tag);
    }
    button.addEventListener('click', () => { selectedId = !index ? null : frame.id; render(); });
    fragment.append(button);
  });
  $('history-list').replaceChildren(fragment);
  $('history-list').scrollLeft = scrollLeft;
}
function renderEvents() {
  const events = Array.isArray(state.events) ? [...state.events].sort((a,b) => (dateValue(b.at)?.getTime() ?? 0) - (dateValue(a.at)?.getTime() ?? 0)).slice(0,6) : [];
  const key = JSON.stringify(events);
  if (key === eventsKey) return;
  eventsKey = key;
  const fragment = document.createDocumentFragment();
  if (!events.length) {
    const empty = document.createElement('li');
    empty.className = 'empty-events';
    empty.textContent = 'No activity yet.';
    fragment.append(empty);
  }
  events.forEach((event) => {
    const li = document.createElement('li');
    const dot = document.createElement('span');
    dot.className = `event-dot${/error|offline|invalid|fail/i.test(event.kind || '') ? ' error' : ''}`;
    dot.setAttribute('aria-hidden','true');
    const content = document.createElement('div');
    const message = document.createElement('p');
    message.textContent = event.message || event.kind || 'Session event';
    const time = document.createElement('time');
    time.textContent = clock(event.at);
    if (dateValue(event.at)) time.dateTime = dateValue(event.at).toISOString();
    content.append(message, time);
    li.append(dot, content);
    fragment.append(li);
  });
  $('event-list').replaceChildren(fragment);
}
async function api(path, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(path, {method:body === undefined ? 'GET' : 'POST', headers:body === undefined ? {} : {'Content-Type':'application/json'}, ...(body === undefined ? {} : {body:JSON.stringify(body)}), signal:controller.signal, cache:'no-store'});
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(result.error || result.message || `Server returned ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return result;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The request timed out. The last saved frame may be outdated.');
    throw error;
  } finally { clearTimeout(timeout); }
}
async function poll() {
  if (pollBusy || authRequired) return;
  pollBusy = true;
  try {
    const response = await api('/api/state');
    if (!response || !['demo','camera'].includes(response.mode)) throw new Error('The server returned an unrecognized state.');
    state = response;
    lastPollAt = Date.now();
    $('last-refresh').textContent = `Server checked ${clock(lastPollAt)}`;
    render();
  } catch (error) {
    if (error.status === 401) {
      authRequired = true;
      $('login-panel').hidden = false;
      document.querySelector('.dashboard-grid').hidden = true;
      $('connection-alert').hidden = true;
      $('source-mode').textContent = 'Access required';
      $('source-explanation').textContent = 'Enter the monitor access token to load source information. No camera connection has been confirmed.';
      $('last-refresh').textContent = 'Monitor locked';
      buttonState();
      return;
    }
    $('connection-alert').hidden = false;
    $('connection-alert').textContent = `Monitor server unavailable: ${error.message}. ${state ? 'Displayed data is from the last successful update.' : 'No live source has been confirmed.'}`;
    $('last-refresh').textContent = lastPollAt ? `Last server update ${clock(lastPollAt)}` : 'Server unavailable';
    $('freshness-badge').textContent = 'Disconnected';
    $('freshness-badge').className = 'small-badge is-offline';
  } finally { pollBusy = false; }
}
async function perform(path, body, resultId, successMessage) {
  if (requestBusy) return;
  requestBusy = true;
  buttonState();
  showMessage(resultId, 'Sending request…');
  try {
    const result = await api(path, body);
    if (result.ok === false) throw new Error(result.error || result.message || 'The request could not be completed.');
    showMessage(resultId, result.message || successMessage);
  } catch (error) { showMessage(resultId, error.message, true); }
  finally { requestBusy = false; await poll(); buttonState(); }
}
$('capture-button').addEventListener('click', () => perform('/api/capture', {}, 'action-result', 'Capture request completed. Check the timestamp of the latest snapshot.'));
$('pause-button').addEventListener('click', () => {
  const paused = !state?.session?.paused;
  perform('/api/session', {paused}, 'action-result', paused ? 'Automatic capture paused. Manual capture is still available.' : 'Automatic capture resumed.');
});
$('apply-condition').addEventListener('click', () => perform('/api/demo', {condition:$('demo-condition').value}, 'demo-result', 'Source test applied. Request a snapshot to inspect the result.'));
$('return-latest').addEventListener('click', () => { selectedId = null; render(); });
$('main-frame').addEventListener('error', () => {
  $('main-frame').hidden = true;
  $('empty-frame').hidden = false;
  $('empty-frame').querySelector('h3').textContent = 'This snapshot could not be loaded';
  $('empty-frame').querySelector('p').textContent = 'It may have expired from the retained history. Select the latest snapshot or capture another image.';
});
$('main-frame').addEventListener('load', () => {
  $('main-frame').hidden = false;
  $('empty-frame').hidden = true;
});
$('login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const token = $('access-token').value;
  if (!token) return;
  $('login-button').disabled = true;
  showMessage('login-result', 'Unlocking monitor…');
  try {
    await api('/api/login', {token});
    $('access-token').value = '';
    authRequired = false;
    $('login-panel').hidden = true;
    document.querySelector('.dashboard-grid').hidden = false;
    showMessage('login-result', '');
    await poll();
  } catch (error) { showMessage('login-result', error.message, true); }
  finally { $('login-button').disabled = false; }
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(); });
poll();
setInterval(() => { if (!document.hidden) poll(); }, 2000);
