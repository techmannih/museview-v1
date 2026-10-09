import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Monitor, createReplaySource } from './core.mjs';
import { loadReferences } from './server.mjs';

const dir = fileURLToPath(new URL('.', import.meta.url));
const startedAt = new Date().toISOString();
const test = Bun.spawn(['bun', 'test', 'tests/'], { cwd: dir, stdout: 'pipe', stderr: 'pipe' });
const [stdout, stderr, exitCode] = await Promise.all([new Response(test.stdout).text(), new Response(test.stderr).text(), test.exited]);
const log = stdout + stderr;
await writeFile(new URL('validation-tests.log', import.meta.url), log);
process.stdout.write(log);

const monitor = new Monitor({ source: createReplaySource({ images: await loadReferences() }), intervalMs: 60, retentionFrames: 12 });
const started = performance.now();
monitor.start();
while (monitor.frames.length < 10 && performance.now() - started < 10000) await Bun.sleep(20);
monitor.setPaused(true);
while (monitor.busy) await Bun.sleep(10);
const ordered = monitor.state().frames;
const scheduledPass = ordered.length >= 10 && ordered.every((frame, i) =>
  frame.source === 'demo' && frame.capturedAt === null && (i === 0 || frame.captureId < ordered[i - 1].captureId));
const lastGoodId = ordered[0]?.id;
monitor.setDemoCondition('offline'); await monitor.capture();
const offline = monitor.state();
const offlinePass = offline.camera.status === 'offline' && offline.frames[0]?.id === lastGoodId;
monitor.setDemoCondition('normal'); await monitor.capture();
const recoveryPass = monitor.state().camera.status === 'online' && monitor.frames[0]?.id !== lastGoodId;
monitor.setDemoCondition('malformed');
const beforeInvalid = monitor.frames[0]?.id;
await monitor.capture();
const invalidPass = monitor.state().camera.status === 'error' && monitor.frames[0]?.id === beforeInvalid;
monitor.stop();

const files = ['core.mjs','server.mjs','validate.mjs','package.json','bun.lock',
  'public/index.html','public/app.js','public/styles.css','tests/monitor.test.mjs','fixtures/reference-benchy.jpg','fixtures/references.json'];
const hashes = {};
for (const path of files) hashes[path] = createHash('sha256').update(await readFile(new URL(path, import.meta.url))).digest('hex');
const report = {
  startedAt, finishedAt: new Date().toISOString(), hardwareBaselineCommit: 'd8bd91ff042b64b5c5cbeeaea4a164596c285392',
  environment: { runtime: `Bun ${Bun.version}`, platform: process.platform, architecture: process.arch },
  command: 'bun monitor/validate.mjs',
  verdict: exitCode === 0 && scheduledPass && offlinePass && recoveryPass && invalidPass ? 'SOFTWARE CHECKS PASS' : 'SOFTWARE CHECKS FAIL',
  automatedTests: { exitCode, passed: Number(log.match(/(\d+) pass/)?.[1] ?? 0), failed: Number(log.match(/(\d+) fail/)?.[1] ?? 0), log: 'validation-tests.log' },
  scenarios: {
    scheduledReplay: { passed: scheduledPass, retainedFrames: ordered.length, intervalMs: 60, note: 'Accelerated local reference replay. No inference about camera frame rate or board timing.' },
    offlinePreservesLastImage: { passed: offlinePass },
    recoveryWithoutSessionRestart: { passed: recoveryPass },
    malformedImageRejected: { passed: invalidPass }
  },
  evidenceScope: 'Software state/HTTP regression tests and licensed single-photo replay only. Photo was not captured by MuseView. No physical scene or user task was tested.',
  hardwareOperation: 'NOT RUN: user confirmed no camera board or printer available',
  customerNeed: 'NOT VALIDATED: no user interviews or comparative task observations',
  automaticFailureDetection: 'NOT IMPLEMENTED; visual inspection only',
  manufacturingStatus: 'NOT READY: existing camera mating/pin mapping and JLC placement approval remain open',
  sourceHashes: hashes,
  replayEvents: monitor.state().events
};
await writeFile(new URL('validation-results.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(report.verdict);
if (report.verdict !== 'SOFTWARE CHECKS PASS') process.exitCode = 1;
