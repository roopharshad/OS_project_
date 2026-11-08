// Compiles and runs C code with gcc for the Source Code section.
//
// Used in two places:
//   - the Vite dev/preview server (default export, localhost only)
//   - the production server in server/index.js (createCRunner, public)
//
// Endpoints:
//   GET  /api/c/info  -> { available, compiler, platform, running, limits }
//   POST /api/c/run   -> body { code, clientId }, streams NDJSON events:
//        { type: 'status' | 'cmd' | 'stdout' | 'stderr' | 'compile-error' | 'exit' | 'error', data, t }
//   POST /api/c/stop  -> body { clientId }, stops that visitor's program
//
// Behaviour:
//   - gcc is found once (PATH, then common MinGW/MSYS2 folders on Windows).
//   - Each visitor (clientId, or IP if none) has at most one program running.
//     A new Run replaces their previous one. Other visitors are not affected.
//   - Total concurrent programs and runs per IP per minute are capped.
//   - Compiled programs are cached by a hash of the code.
//   - On Linux each compile and run is wrapped in prlimit (memory, CPU, file
//     size, open files, processes), gets a minimal environment with no server
//     secrets, stdin closed, its own process group and temp folder, and runs as
//     an unprivileged user when the server runs as root (C_RUNNER_UID).
//     This is resource limiting, not a full security sandbox: the program can
//     still use the network. See README "Deployment" for details.
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, writeFile, readdir, stat, rm, access, rename, chown, chmod } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ENV = process.env;
const IS_WIN = process.platform === 'win32';
const num = (v, d) => (v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : d);

const CACHE_DIR = path.join(tmpdir(), 'dp-c-runner');
const CACHE_KEEP = 30;
const MAX_SOURCE_BYTES = 64 * 1024;
const MAX_OUTPUT_BYTES = 256 * 1024;
const COMPILE_TIMEOUT_MS = num(ENV.C_RUNNER_COMPILE_TIMEOUT_SEC, 60) * 1000;
const RUN_TIMEOUT_MS = num(ENV.C_RUNNER_RUN_TIMEOUT_SEC, 60) * 1000;
const LOCAL = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const EXE_NAME = IS_WIN ? 'dining_philosophers.exe' : 'dining_philosophers';
const WIN_COMPAT = path.join(HERE, 'win_compat.h');
const CLIENT_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

// ─── Linux limits ────────────────────────────────────────────────────────────
const PRLIMIT = IS_WIN ? null : ['/usr/bin/prlimit', '/bin/prlimit'].find((p) => existsSync(p)) || null;
const STDBUF = IS_WIN ? null : ['/usr/bin/stdbuf', '/bin/stdbuf'].find((p) => existsSync(p)) || null;
const IS_ROOT = typeof process.getuid === 'function' && process.getuid() === 0;
const SANDBOX_UID = !IS_WIN && IS_ROOT && ENV.C_RUNNER_UID ? Number(ENV.C_RUNNER_UID) : null;
const SANDBOX_GID = SANDBOX_UID != null ? num(ENV.C_RUNNER_GID, SANDBOX_UID) : null;
const SAFE_PATH = '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin';
const LIMITS = {
  compile: { memMb: 1024, cpuSec: 30, fileMb: 64 },
  run: { memMb: num(ENV.C_RUNNER_MEM_MB, 512), cpuSec: num(ENV.C_RUNNER_CPU_SEC, 20), fileMb: 8 },
};

const WIN_CANDIDATES = [
  'C:\\MinGW\\bin\\gcc.exe',
  'C:\\msys64\\ucrt64\\bin\\gcc.exe',
  'C:\\msys64\\mingw64\\bin\\gcc.exe',
  'C:\\TDM-GCC-64\\bin\\gcc.exe',
  'C:\\mingw64\\bin\\gcc.exe',
  'C:\\Program Files\\CodeBlocks\\MinGW\\bin\\gcc.exe',
];

// ─── Compiler discovery ──────────────────────────────────────────────────────
let compiler = null; // { cmd, dir, version, env }
let lastProbe = 0;
let probeError = '';

function probe(cmd) {
  try {
    const r = spawnSync(cmd, ['--version'], { windowsHide: true, encoding: 'utf8', timeout: 20_000 });
    if (r.status !== 0) return null;
    let dir = path.isAbsolute(cmd) ? path.dirname(cmd) : null;
    if (!dir) {
      const w = spawnSync(IS_WIN ? 'where' : 'which', [cmd], { windowsHide: true, encoding: 'utf8' });
      const first = (w.stdout || '').split(/\r?\n/).find(Boolean);
      if (first) dir = path.dirname(first.trim());
    }
    return { cmd, dir, version: (r.stdout || '').split(/\r?\n/)[0] || cmd };
  } catch {
    return null;
  }
}

function findCompiler() {
  if (compiler) return compiler;
  if (Date.now() - lastProbe < 5000) return null;
  lastProbe = Date.now();
  const list = [ENV.CC, 'gcc', ...(IS_WIN ? WIN_CANDIDATES.filter((p) => existsSync(p)) : [])].filter(Boolean);
  for (const cmd of list) {
    const found = probe(cmd);
    if (!found) continue;
    let env;
    if (IS_WIN) {
      // Put the compiler's bin folder first so gcc and the pthread DLL are always found.
      env = { ...ENV };
      const key = Object.keys(env).find((k) => k.toLowerCase() === 'path') || 'PATH';
      if (found.dir) env[key] = found.dir + path.delimiter + (env[key] || '');
    } else {
      // Never pass server environment variables (secrets) to user programs.
      env = { PATH: found.dir ? `${found.dir}:${SAFE_PATH}` : SAFE_PATH, LANG: 'C.UTF-8' };
    }
    compiler = { ...found, env };
    probeError = '';
    return compiler;
  }
  probeError = IS_WIN
    ? 'No C compiler found. Install MinGW (gcc) to C:\\MinGW, then restart the website.'
    : 'No C compiler found on the server. Install gcc (Debian/Ubuntu: apt install gcc libc6-dev), then restart.';
  return null;
}

function compileArgs(src, exe) {
  if (IS_WIN) {
    // MinGW.org: pthreads-w32 needs HAVE_STRUCT_TIMESPEC; win_compat.h adds sleep() and live output.
    return ['-std=gnu99', '-Wall', '-Wextra', '-DHAVE_STRUCT_TIMESPEC', '-include', WIN_COMPAT, src, '-o', exe, '-lpthread'];
  }
  return ['-Wall', '-Wextra', '-pthread', src, '-o', exe];
}

const DISPLAY_COMPILE = IS_WIN
  ? 'gcc -Wall -Wextra -DHAVE_STRUCT_TIMESPEC -include win_compat.h dining_philosophers.c -o dining_philosophers.exe -lpthread'
  : 'gcc -Wall -Wextra -pthread dining_philosophers.c -o dining_philosophers';
const DISPLAY_RUN = IS_WIN ? '$ dining_philosophers.exe' : '$ ./dining_philosophers';

const winCompat = IS_WIN ? readFileSync(WIN_COMPAT, 'utf8') : '';
const keyFor = (cc, code) => createHash('sha1').update(cc).update('\0').update(winCompat).update('\0').update(code).digest('hex').slice(0, 16);

function compileHint(diag) {
  if (/pthread\.h: No such file/i.test(diag)) {
    return IS_WIN
      ? 'Hint: the pthread library is missing. Run:  C:\\MinGW\\bin\\mingw-get.exe install mingw32-pthreads-w32-dev'
      : 'Hint: the pthread headers are missing. Install libc6-dev.';
  }
  if (/semaphore\.h: No such file/i.test(diag)) return 'Hint: semaphore.h is missing. It comes with the pthreads / libc development package.';
  if (/cannot find -lpthread/i.test(diag)) return 'Hint: the pthread library file is missing. Reinstall the pthreads package.';
  if (/Permission denied/i.test(diag)) return 'Hint: the output file is locked, often by antivirus. Press Run again.';
  if (/virtual memory exhausted|Cannot allocate memory/i.test(diag)) return 'Hint: the compiler ran out of its memory limit.';
  return '';
}

function exitHint(code, signal) {
  if (signal === 'SIGXCPU') return `The program used more than ${LIMITS.run.cpuSec} seconds of CPU time and was stopped.`;
  if (signal === 'SIGSEGV') return 'The program crashed with a segmentation fault (invalid memory access).';
  if (signal === 'SIGKILL') return 'The program was killed because it exceeded a resource limit.';
  if (signal === 'SIGXFSZ') return 'The program tried to write a file larger than the allowed limit.';
  if (!IS_WIN || code == null) return '';
  const u = code >>> 0;
  if (u === 0xC0000135) return 'The program could not start because a DLL (usually pthreadGC2.dll) was not found.';
  if (u === 0xC0000005) return 'The program crashed with an access violation (invalid memory access).';
  if (u === 0xC000013A) return 'The program was interrupted.';
  return '';
}

// ─── Process helpers ─────────────────────────────────────────────────────────
function limitedSpawn(kind, cmd, args, { cwd, env }) {
  const stdio = ['ignore', 'pipe', 'pipe'];
  if (IS_WIN) return spawn(cmd, args, { cwd, env, stdio, windowsHide: true });
  const lim = LIMITS[kind];
  let file = cmd;
  let argv = args;
  if (PRLIMIT) {
    const mb = (n) => String(n * 1024 * 1024);
    const flags = [`--as=${mb(lim.memMb)}`, `--cpu=${lim.cpuSec}`, `--fsize=${mb(lim.fileMb)}`, '--nofile=64', '--core=0'];
    if (SANDBOX_UID != null) flags.push(`--nproc=${num(ENV.C_RUNNER_NPROC, 128)}`);
    file = PRLIMIT;
    argv = [...flags, '--', cmd, ...args];
  }
  return spawn(file, argv, {
    cwd, env, stdio,
    detached: true, // own process group, so the whole tree can be killed
    ...(SANDBOX_UID != null ? { uid: SANDBOX_UID, gid: SANDBOX_GID } : {}),
  });
}

function killTree(child) {
  if (!child) return;
  if (IS_WIN) {
    if (child.exitCode !== null || child.signalCode !== null) return;
    try {
      const k = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
      k.on('error', () => {});
    } catch { /* ignore */ }
    try { child.kill(); } catch { /* already gone */ }
    return;
  }
  try { process.kill(-child.pid, 'SIGKILL'); } catch {
    try { child.kill('SIGKILL'); } catch { /* already gone */ }
  }
}

function waitForExit(child) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (code, signal, err) => { if (!done) { done = true; resolve({ code, signal, err }); } };
    child.on('error', (e) => finish(-1, null, e.message));
    child.on('close', (code, signal) => finish(code, signal));
    child.on('exit', (code, signal) => setTimeout(() => finish(code, signal), 3000));
  });
}

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

async function removeDir(dir) {
  for (let k = 0; k < 5; k++) {
    try { await rm(dir, { recursive: true, force: true }); return; } catch { await new Promise((r) => setTimeout(r, 400)); }
  }
}

async function giveTo(p, uid, gid) {
  if (SANDBOX_UID == null) return;
  await chown(p, uid, gid);
}

async function pruneCache() {
  try {
    const names = (await readdir(CACHE_DIR)).filter((n) => /^[0-9a-f]{16}$/.test(n));
    if (names.length <= CACHE_KEEP) return;
    const withTime = await Promise.all(names.map(async (n) => ({ n, t: (await stat(path.join(CACHE_DIR, n))).mtimeMs })));
    withTime.sort((a, b) => b.t - a.t);
    for (const { n } of withTime.slice(CACHE_KEEP)) await rm(path.join(CACHE_DIR, n), { recursive: true, force: true }).catch(() => {});
  } catch { /* best effort */ }
}

// ─── Build (cached) ──────────────────────────────────────────────────────────
const inflight = new Map();
function build(cc, code, onSpawn) {
  const key = keyFor(cc.cmd, code);
  if (inflight.has(key)) return inflight.get(key);
  const p = buildUncached(cc, key, code, onSpawn).finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

async function buildUncached(cc, key, code, onSpawn) {
  const dir = path.join(CACHE_DIR, key);
  const exe = path.join(dir, EXE_NAME);
  if (await exists(exe)) return { ok: true, exe, cached: true, diagnostics: '' };

  await mkdir(CACHE_DIR, { recursive: true, mode: 0o755 });
  await rm(dir, { recursive: true, force: true }).catch(() => {});
  await mkdir(dir, { mode: 0o755 });
  const src = path.join(dir, 'dining_philosophers.c');
  await writeFile(src, code, 'utf8');
  // The unprivileged compiler user may write only into this folder.
  await giveTo(dir, SANDBOX_UID, SANDBOX_GID);
  await giveTo(src, SANDBOX_UID, SANDBOX_GID);
  const tmpExe = path.join(dir, `build-${process.pid}-${Date.now()}${IS_WIN ? '.exe' : ''}`);
  const env = IS_WIN ? cc.env : { ...cc.env, TMPDIR: dir, HOME: dir };

  let last = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const child = limitedSpawn('compile', cc.cmd, compileArgs(src, tmpExe), { cwd: dir, env });
    onSpawn?.(child);
    let out = '';
    child.stdout.on('data', (b) => { if (out.length < 64 * 1024) out += b; });
    child.stderr.on('data', (b) => { if (out.length < 64 * 1024) out += b; });
    const timer = setTimeout(() => killTree(child), COMPILE_TIMEOUT_MS);
    const r = await waitForExit(child);
    clearTimeout(timer);
    killTree(child);
    const diagnostics = out.split(dir + path.sep).join('').split(dir).join('');
    last = { r, diagnostics };
    if (r.code === 0) break;
    // Retry once only for file-lock problems (antivirus on Windows).
    if (!/Permission denied|cannot open output file/i.test(diagnostics)) break;
    await new Promise((res) => setTimeout(res, 1500));
  }

  if (last.r.code !== 0) {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
    const hint = compileHint(last.diagnostics);
    const why = last.r.signal ? `Compiler stopped (${last.r.signal}).` : last.r.err;
    return { ok: false, code: last.r.code, diagnostics: (last.diagnostics || why || 'Compilation failed.') + (hint ? `\n${hint}` : '') };
  }
  // Hand the folder back to root so running programs cannot replace cached files.
  if (SANDBOX_UID != null) {
    await giveTo(tmpExe, 0, 0);
    await chmod(tmpExe, 0o755);
    await giveTo(src, 0, 0);
    await giveTo(dir, 0, 0);
    await chmod(dir, 0o755);
  }
  try {
    await rename(tmpExe, exe);
  } catch (e) {
    if (!(await exists(exe))) throw e;
    await rm(tmpExe, { force: true }).catch(() => {});
  }
  pruneCache();
  return { ok: true, exe, cached: false, diagnostics: last.diagnostics };
}

// ─── HTTP helpers ────────────────────────────────────────────────────────────
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new Error('Source code is too large (limit 64 KB).')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function parseJson(text) {
  try { return text ? JSON.parse(text) : {}; } catch { return null; }
}

function json(res, status, obj) {
  if (res.headersSent) { res.end(); return; }
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

function rateLimiter(perMinute) {
  const hits = new Map();
  return (key) => {
    if (!perMinute) return true;
    const now = Date.now();
    const recent = (hits.get(key) || []).filter((t) => now - t < 60_000);
    const ok = recent.length < perMinute;
    if (ok) recent.push(now);
    hits.set(key, recent);
    if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < 60_000)) hits.delete(k);
    return ok;
  };
}

// Every run from every runner instance, so all can be killed on exit.
const ALL_RUNS = new Set();
process.on('exit', () => { for (const r of ALL_RUNS) killTree(r.child); });

let prewarmed = false;
function prewarm() {
  const cc = findCompiler();
  if (prewarmed || !cc) return;
  prewarmed = true;
  const file = path.join(HERE, '..', 'c', 'dining_philosophers.c');
  if (!existsSync(file)) return;
  build(cc, readFileSync(file, 'utf8').replace(/\r\n/g, '\n')).catch(() => {});
}

// ─── Runner ──────────────────────────────────────────────────────────────────
export function createCRunner({ allowRemote = false, trustProxy = false, maxConcurrent = 3, runsPerMinute = 0 } = {}) {
  const runs = new Map(); // visitor key -> run
  const allowRun = rateLimiter(runsPerMinute);

  const clientIp = (req) => {
    const fwd = trustProxy ? String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() : '';
    return fwd || req.socket.remoteAddress || 'unknown';
  };
  const visitorKey = (req, body) => (body && CLIENT_ID_RE.test(String(body.clientId || '')) ? `c:${body.clientId}` : `ip:${clientIp(req)}`);
  const permitted = (req) => allowRemote || LOCAL.has(req.socket.remoteAddress);

  function endRun(run, reason) {
    if (run.ended) return;
    run.ended = true;
    run.send('error', reason);
    run.send('exit', { code: null, signal: null, phase: 'stopped', ms: Date.now() - run.started });
    if (!run.res.writableEnded) run.res.end();
    killTree(run.child);
    if (runs.get(run.key) === run) runs.delete(run.key);
    ALL_RUNS.delete(run);
  }

  async function handleRun(req, res) {
    if (req.method !== 'POST') return json(res, 405, { error: 'Use POST' });
    if (!permitted(req)) return json(res, 403, { error: 'Running C code is only available on localhost.' });

    let body;
    try {
      body = parseJson(await readBody(req, MAX_SOURCE_BYTES + 1024));
    } catch (e) {
      return json(res, 413, { error: e.message });
    }
    if (!body) return json(res, 400, { error: 'Invalid request.' });
    const code = String(body.code ?? '').replace(/\r\n/g, '\n');
    if (!code.trim()) return json(res, 400, { error: 'No source code given.' });
    if (Buffer.byteLength(code) > MAX_SOURCE_BYTES) return json(res, 413, { error: 'Source code is too large (limit 64 KB).' });

    const cc = findCompiler();
    if (!cc) return json(res, 503, { error: probeError || 'No C compiler found.' });

    const key = visitorKey(req, body);
    const previous = runs.get(key);
    if (previous) endRun(previous, 'Stopped because a new run was started.');
    if (!allowRun(clientIp(req))) return json(res, 429, { error: `Too many runs. You can start ${runsPerMinute} runs per minute. Please wait a moment.` });
    if (runs.size >= maxConcurrent) return json(res, 429, { error: 'The server is busy running other programs. Please try again in a few seconds.' });

    res.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' });
    res.flushHeaders?.();
    const me = { key, res, child: null, ended: false, started: Date.now() };
    me.send = (type, data) => {
      if (!res.writableEnded && !res.destroyed) res.write(JSON.stringify({ type, data, t: Date.now() - me.started }) + '\n');
    };
    runs.set(key, me);
    ALL_RUNS.add(me);
    res.on('close', () => { if (!me.ended) endRun(me, 'Stopped: the browser closed the connection.'); });

    let runDir = null;
    try {
      // ── compile (or reuse) ──
      me.send('status', 'compiling');
      me.send('cmd', `$ ${DISPLAY_COMPILE}`);
      const b = await build(cc, code, (child) => { if (!me.ended) me.child = child; });
      me.child = null;
      if (me.ended) return;
      if (!b.ok) {
        me.send('compile-error', b.diagnostics);
        me.ended = true;
        me.send('exit', { code: b.code, phase: 'compile', ms: Date.now() - me.started });
        return;
      }
      if (b.cached) me.send('cmd', '(code unchanged, reusing the compiled program)');
      if (b.diagnostics.trim()) me.send('stderr', b.diagnostics);

      // ── run in a fresh folder ──
      runDir = await mkdtemp(path.join(tmpdir(), 'dp-run-'));
      if (SANDBOX_UID != null) {
        await giveTo(runDir, SANDBOX_UID, SANDBOX_GID);
        await chmod(runDir, 0o700);
      }
      if (me.ended) return;
      me.send('status', 'starting');
      me.send('cmd', DISPLAY_RUN);
      const runStarted = Date.now();
      const env = IS_WIN ? cc.env : { ...cc.env, HOME: runDir, TMPDIR: runDir };
      // stdbuf makes printf output appear line by line instead of at the end.
      const [file, args] = STDBUF ? [STDBUF, ['-o0', '-e0', b.exe]] : [b.exe, []];
      const child = limitedSpawn('run', file, args, { cwd: runDir, env });
      me.child = child;
      let bytes = 0;
      let gotOutput = false;
      const timer = setTimeout(() => endRun(me, `Stopped: the program ran longer than ${RUN_TIMEOUT_MS / 1000} seconds.`), RUN_TIMEOUT_MS);
      const onData = (type) => (buf) => {
        if (me.ended) return;
        if (!gotOutput) { gotOutput = true; me.send('status', 'running'); }
        bytes += buf.length;
        if (bytes > MAX_OUTPUT_BYTES) { endRun(me, 'Stopped: the program printed more than 256 KB of output.'); return; }
        me.send(type, buf.toString('utf8'));
      };
      child.stdout.on('data', onData('stdout'));
      child.stderr.on('data', onData('stderr'));
      const r = await waitForExit(child);
      clearTimeout(timer);
      if (me.ended) return;
      if (r.err) me.send('error', `Could not start the program: ${r.err}`);
      const hint = r.code !== 0 ? exitHint(r.code, r.signal) : '';
      if (hint) me.send('error', hint);
      me.ended = true;
      me.send('exit', { code: r.code, signal: r.signal, phase: 'run', ms: Date.now() - runStarted });
    } catch (e) {
      if (!me.ended) {
        me.send('error', e.message || String(e));
        me.ended = true;
        me.send('exit', { code: -1, phase: 'error', ms: Date.now() - me.started });
      }
    } finally {
      killTree(me.child);
      if (runs.get(key) === me) runs.delete(key);
      ALL_RUNS.delete(me);
      if (!res.writableEnded) res.end();
      if (runDir) removeDir(runDir);
    }
  }

  async function handleStop(req, res) {
    if (req.method !== 'POST') return json(res, 405, { error: 'Use POST' });
    if (!permitted(req)) return json(res, 403, { error: 'Not allowed.' });
    let body = {};
    try { body = parseJson(await readBody(req, 1024)) || {}; } catch { body = {}; }
    const run = runs.get(visitorKey(req, body));
    if (run) endRun(run, 'Stopped by user.');
    json(res, 200, { stopped: Boolean(run) });
  }

  function handleInfo(req, res) {
    if (!permitted(req)) return json(res, 403, { error: 'Not allowed.' });
    const cc = findCompiler();
    prewarm();
    const limits = { runTimeoutSec: RUN_TIMEOUT_MS / 1000, maxConcurrent, runsPerMinute };
    json(res, 200, cc
      ? { available: true, compiler: cc.version, platform: process.platform, running: runs.size > 0, limits }
      : { available: false, compiler: null, platform: process.platform, running: false, limits, error: probeError });
  }

  function handle(req, res, next) {
    const url = String(req.originalUrl || req.url || '').split('?')[0];
    const fail = (e) => json(res, 500, { error: e?.message || 'Internal error' });
    if (url === '/api/c/run') { handleRun(req, res).catch(fail); return; }
    if (url === '/api/c/stop') { handleStop(req, res).catch(fail); return; }
    if (url === '/api/c/info') { handleInfo(req, res); return; }
    if (next) next(); else json(res, 404, { error: 'Not found' });
  }

  function shutdown() {
    for (const r of runs.values()) endRun(r, 'Stopped: the server is shutting down.');
  }

  return { handle, shutdown, prewarm };
}

// Vite plugin for `npm run dev` and `npm run preview` (localhost only).
export default function cRunnerPlugin() {
  const runner = createCRunner({ allowRemote: false });
  return {
    name: 'c-runner',
    configureServer(server) { server.middlewares.use(runner.handle); },
    configurePreviewServer(server) { server.middlewares.use(runner.handle); },
  };
}
