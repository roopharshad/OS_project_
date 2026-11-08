// Drives a headless Chrome via the DevTools protocol: clicks through the
// controls, collects console errors, and saves screenshots of each section.
// Usage: node scripts/browser-check.mjs <chromePath> <outDir> [url]
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const [chrome, outDir, url = 'http://localhost:4173/'] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const port = 9333;
const proc = spawn(chrome, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`,
  `--user-data-dir=${join(outDir, 'profile')}`, '--window-size=1440,900', 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets;
for (let k = 0; k < 50; k++) {
  try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await sleep(200); }
}
const page = targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));

let id = 0;
const pending = new Map();
const errors = [];
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
  if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) {
    errors.push(`${msg.params.type}: ` + msg.params.args.map((a) => a.value ?? a.description).join(' '));
  }
});
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
const shot = async (name, w = 1440, h = 900) => {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 800 });
  await sleep(500);
  const { result } = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(outDir, `${name}.png`), Buffer.from(result.data, 'base64'));
};
const click = (text) => evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(${JSON.stringify(text)}) && b.offsetParent); if (!b) return false; b.click(); return true; })()`);
const scrollTo = async (sel) => { await evaluate(`document.querySelector(${JSON.stringify(sel)}).scrollIntoView({block:'start'})`); await sleep(400); };

await send('Runtime.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url });
await sleep(2500);
await shot('01-hero');

const report = {};
report.stepClicks = [];
await scrollTo('#simulation');
for (let k = 0; k < 6; k++) { report.stepClicks.push(await click('Step Forward')); await sleep(150); }
report.logAfterSteps = await evaluate(`[...document.querySelectorAll('#simulation .font-mono.text-\\\\[12px\\\\] > div')].length`);
report.speedFast = await click('Fast');
report.start = await click('Start') || await click('Resume');
await sleep(6000);
await scrollTo('#simulation');
await shot('02-simulation');
await evaluate('window.scrollBy(0, 820)');
await sleep(300);
await shot('03-cards');
report.pause = await click('Pause');
await scrollTo('#semaphore'); await shot('04-semaphore');
await scrollTo('#algorithm'); await shot('05-algorithm');
await scrollTo('#concepts'); await shot('06-concepts');
await scrollTo('#source'); await shot('07-source');
await scrollTo('#statistics'); await shot('08-statistics');
report.activeNav = await evaluate(`document.querySelector('aside a[aria-current]')?.textContent`);

// Run to completion at 3 rounds, then check results table.
await scrollTo('#simulation');
report.reset = await click('Reset');
await evaluate(`(() => { const s = document.getElementById('max-rounds'); const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; set.call(s, '3'); s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
await click('Start');
for (let k = 0; k < 60; k++) {
  await sleep(1000);
  if (await evaluate(`document.body.innerText.includes('Final Results')`)) break;
}
report.completed = await evaluate(`document.body.innerText.includes('Final Results')`);
await scrollTo('#statistics'); await shot('09-results');

// Mobile drawer
await shot('10-mobile', 390, 844);
await evaluate(`window.scrollTo(0,0)`);
await evaluate(`document.querySelector('button[aria-label="Open navigation"]').click()`);
await sleep(600);
await shot('11-mobile-drawer', 390, 844);

report.errors = errors;
console.log(JSON.stringify(report, null, 2));
ws.close();
proc.kill();
process.exit(0);
