// Two visitors run code at the same time: neither run may stop the other.
import { readFileSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:8080';
const code = readFileSync(new URL('../c/dining_philosophers.c', import.meta.url), 'utf8');

async function run(clientId) {
  const res = await fetch(`${base}/api/c/run`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, clientId }) });
  if (!res.ok) return { status: res.status, body: await res.text() };
  const text = await res.text();
  const events = text.split('\n').filter(Boolean).map((l) => JSON.parse(l));
  return { status: 200, exit: events.find((e) => e.type === 'exit')?.data };
}

const [a, b] = await Promise.all([run('visitorAAAA1111'), new Promise((r) => setTimeout(r, 1500)).then(() => run('visitorBBBB2222'))]);
const ok = a.exit?.code === 0 && b.exit?.code === 0;
console.log(`${ok ? 'PASS' : 'FAIL'}  two visitors both finish: A exit=${a.exit?.code} B exit=${b.exit?.code}`);
process.exit(ok ? 0 : 1);
