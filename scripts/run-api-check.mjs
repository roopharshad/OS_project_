// End-to-end checks of the website's C runner (server/cRunner.js).
// Usage: node scripts/run-api-check.mjs [baseUrl]
import { readFileSync } from 'node:fs';

const base = process.argv[2] || process.env.RUNNER_URL || 'http://localhost:5173';
const code = readFileSync(new URL('../c/dining_philosophers.c', import.meta.url), 'utf8');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
};

// Start a run. `done` resolves with all streamed events.
function start(src, abortAfterMs) {
  const ctrl = new AbortController();
  if (abortAfterMs) setTimeout(() => ctrl.abort(), abortAfterMs);
  const t0 = Date.now();
  const done = (async () => {
    const events = [];
    try {
      const res = await fetch(`${base}/api/c/run`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: src }), signal: ctrl.signal,
      });
      if (!res.ok) return { httpStatus: res.status, body: await res.text(), events };
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { value, done: end } = await reader.read();
        if (end) break;
        buf += dec.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf('\n')) >= 0) {
          events.push({ ...JSON.parse(buf.slice(0, nl)), at: Date.now() - t0 });
          buf = buf.slice(nl + 1);
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') throw e;
      events.push({ type: 'aborted', at: Date.now() - t0 });
    }
    return { httpStatus: 200, events };
  })();
  return { done };
}

const summary = (r) => {
  const exit = r.events.find((e) => e.type === 'exit');
  const out = r.events.filter((e) => e.type === 'stdout').map((e) => e.data).join('').split(/\r?\n/).filter(Boolean);
  const firstOut = r.events.find((e) => e.type === 'stdout');
  return { exit: exit?.data, lines: out, firstOutAt: firstOut?.at, errors: r.events.filter((e) => e.type === 'error').map((e) => e.data), cached: r.events.some((e) => e.type === 'cmd' && /reusing/.test(e.data)) };
};

console.log('info:', await (await fetch(`${base}/api/c/info`)).json());

// 1. Full run
let r = summary(await start(code).done);
check('full run exits with code 0', r.exit?.code === 0, `${r.lines.length} lines, ${r.exit?.ms} ms`);
check('full run prints the final line', r.lines.at(-1) === 'All philosophers finished 3 rounds.');

// 2. Same code again: should reuse the compiled program and start fast
r = summary(await start(code).done);
check('second run reuses the compiled program', r.cached);
check('second run shows output within 3 s', r.firstOutAt < 3000, `first output at ${r.firstOutAt} ms`);

// 3. Starting a new run while one is running replaces it (no "Another program is still running")
const a = start(code);
await sleep(2500);
const b = start(code);
const [ra, rb] = await Promise.all([a.done, b.done]);
const sa = summary(ra), sb = summary(rb);
check('second run is accepted while first is running', rb.httpStatus === 200, `HTTP ${rb.httpStatus} ${rb.body || ''}`);
check('first run is stopped with a clear message', sa.exit?.phase === 'stopped' && sa.errors.some((m) => /new run/.test(m)), JSON.stringify(sa.errors));
check('replacement run completes', sb.exit?.code === 0, `${sb.lines.length} lines`);

// 4. Stop button (POST /api/c/stop) ends the run quickly
const c = start(code);
await sleep(3000);
const t = Date.now();
const stopRes = await (await fetch(`${base}/api/c/stop`, { method: 'POST' })).json();
const sc = summary(await c.done);
check('stop endpoint reports a stopped run', stopRes.stopped === true);
check('stopped run ends within 3 s', Date.now() - t < 3000 && sc.exit?.phase === 'stopped', `${Date.now() - t} ms`);

// 5. Browser disconnects mid-run (reload / closed tab): next run must still work
await start(code, 2500).done;
await sleep(300);
const info = await (await fetch(`${base}/api/c/info`)).json();
check('nothing left running after disconnect', info.running === false);
const tiny = summary(await start('#include <stdio.h>\nint main(void){ printf("ok\\n"); return 0; }\n').done);
check('a new run works right after a disconnect', tiny.exit?.code === 0 && tiny.lines[0] === 'ok');

// 6. Compile error is reported, not hung
const bad = summary(await start(code.replace('sem_post(&S[i]);', 'sem_post(&S[i])')).done);
check('compile error is reported', bad.exit?.phase === 'compile');

console.log(failures ? `\n${failures} check(s) failed` : '\nAll C runner checks passed');
process.exit(failures ? 1 : 0);
