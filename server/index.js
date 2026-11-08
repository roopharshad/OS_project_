// Production server: serves the built website (dist/) and the C runner API.
// No npm packages needed at runtime.
//
//   npm run build && npm start        -> http://localhost:8080
//
// Environment variables (all optional):
//   PORT                        port to listen on (default 8080; hosts like Render set it)
//   HOST                        interface (default 0.0.0.0)
//   C_RUNNER_PUBLIC=0           only allow Run Code from localhost
//   TRUST_PROXY=0               ignore X-Forwarded-For (set when not behind a proxy)
//   C_RUNNER_MAX_CONCURRENT     programs running at once for all visitors (default 3)
//   C_RUNNER_RUNS_PER_MINUTE    runs per visitor IP per minute (default 10)
//   C_RUNNER_RUN_TIMEOUT_SEC    wall-clock limit per run (default 60)
//   C_RUNNER_CPU_SEC            CPU-time limit per run, Linux (default 20)
//   C_RUNNER_MEM_MB             memory limit per run, Linux (default 512)
//   C_RUNNER_UID / C_RUNNER_GID run user programs as this user, Linux + root only
import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { createCRunner } from './cRunner.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || '0.0.0.0';

const runner = createCRunner({
  allowRemote: process.env.C_RUNNER_PUBLIC !== '0',
  trustProxy: process.env.TRUST_PROXY !== '0',
  maxConcurrent: Number(process.env.C_RUNNER_MAX_CONCURRENT) || 3,
  runsPerMinute: Number(process.env.C_RUNNER_RUNS_PER_MINUTE) || 10,
});
runner.prewarm(); // compile the bundled program once so the first Run is quick

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.c': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};
const COMPRESSIBLE = /^(text\/|application\/json|image\/svg)/;

function send(res, status, text, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type });
  res.end(text);
}

async function serveStatic(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    res.end();
    return;
  }
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    send(res, 400, 'Bad request');
    return;
  }
  let file = path.join(ROOT, pathname);
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) {
    send(res, 403, 'Forbidden');
    return;
  }
  let st = await stat(file).catch(() => null);
  if (st?.isDirectory()) {
    file = path.join(file, 'index.html');
    st = await stat(file).catch(() => null);
  }
  if (!st) {
    // Missing files with an extension are real 404s; other paths get the single-page app.
    if (path.extname(pathname)) {
      send(res, 404, 'Not found');
      return;
    }
    file = path.join(ROOT, 'index.html');
    st = await stat(file).catch(() => null);
    if (!st) {
      send(res, 500, 'dist/ is missing. Run "npm run build" first.');
      return;
    }
  }

  const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const headers = {
    'Content-Type': type,
    'Cache-Control': pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
  };
  const gzip = COMPRESSIBLE.test(type) && st.size > 1024 && /\bgzip\b/.test(String(req.headers['accept-encoding'] || ''));
  if (gzip) {
    headers['Content-Encoding'] = 'gzip';
    headers.Vary = 'Accept-Encoding';
  } else {
    headers['Content-Length'] = st.size;
  }
  res.writeHead(200, headers);
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  const stream = createReadStream(file);
  stream.on('error', () => res.destroy());
  (gzip ? stream.pipe(zlib.createGzip()) : stream).pipe(res);
}

const server = http.createServer((req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  const url = String(req.url || '').split('?')[0];
  if (url === '/healthz') {
    send(res, 200, 'ok');
    return;
  }
  if (url.startsWith('/api/')) {
    runner.handle(req, res, () => send(res, 404, '{"error":"Not found"}', 'application/json'));
    return;
  }
  serveStatic(req, res).catch(() => {
    if (!res.headersSent) send(res, 500, 'Internal error');
    else res.destroy();
  });
});

// Longer than typical load-balancer idle timeouts, avoids random 502s behind proxies.
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

server.listen(PORT, HOST, () => {
  console.log(`Dining Philosophers running on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
});

function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  runner.shutdown();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
