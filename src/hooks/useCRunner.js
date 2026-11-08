import { useCallback, useEffect, useRef, useState } from 'react';

// One ID per browser tab, so the server keeps each visitor's run separate.
let clientId = null;
function getClientId() {
  if (clientId) return clientId;
  const make = () => (globalThis.crypto?.randomUUID?.() || `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`).replace(/[^A-Za-z0-9_-]/g, '');
  try {
    clientId = sessionStorage.getItem('dp-client-id') || make();
    sessionStorage.setItem('dp-client-id', clientId);
  } catch {
    clientId = make();
  }
  return clientId;
}

// Talks to the /api/c/* endpoints provided by server/cRunner.js and turns the
// NDJSON stream into a list of output lines.
// status: idle | compiling | starting | running | done | stopped | error
export function useCRunner() {
  const [lines, setLines] = useState([]);
  const [status, setStatus] = useState('idle');
  const [exit, setExit] = useState(null);
  const [info, setInfo] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const activeRef = useRef(null); // AbortController of the run currently shown
  const startRef = useRef(0);
  const partial = useRef({ stdout: '', stderr: '' });
  const nextId = useRef(0);

  useEffect(() => {
    fetch('/api/c/info')
      // A static host answers with HTML (or 404), which also means "no runner".
      .then((r) => (r.ok && (r.headers.get('content-type') || '').includes('json') ? r.json() : { available: false, server: false }))
      .then(setInfo)
      .catch(() => setInfo({ available: false, server: false }));
  }, []);

  const busy = status === 'compiling' || status === 'starting' || status === 'running';

  useEffect(() => {
    if (!busy) return undefined;
    const id = setInterval(() => setElapsed(Date.now() - startRef.current), 100);
    return () => clearInterval(id);
  }, [busy]);

  const push = useCallback((kind, text, t) => {
    setLines((prev) => [...prev, { id: ++nextId.current, kind, text, t }]);
  }, []);

  // Split streamed chunks into whole lines, keeping any unfinished tail.
  const pushStream = useCallback((kind, chunk, t) => {
    const buf = partial.current[kind] + chunk.replace(/\r\n/g, '\n');
    const parts = buf.split('\n');
    partial.current[kind] = parts.pop();
    if (parts.length) setLines((prev) => [...prev, ...parts.map((text) => ({ id: ++nextId.current, kind, text, t }))]);
  }, []);

  const flushAll = useCallback((t) => {
    for (const kind of ['stdout', 'stderr']) {
      if (partial.current[kind]) push(kind, partial.current[kind], t);
      partial.current[kind] = '';
    }
  }, [push]);

  const runCode = useCallback(async (code) => {
    // A new run replaces any run still streaming (the server stops it too).
    activeRef.current?.abort();
    const ctrl = new AbortController();
    activeRef.current = ctrl;
    const mine = () => activeRef.current === ctrl;

    partial.current = { stdout: '', stderr: '' };
    setLines([]);
    setExit(null);
    setElapsed(0);
    startRef.current = Date.now();
    setStatus('compiling');

    try {
      const res = await fetch('/api/c/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, clientId: getClientId() }),
        signal: ctrl.signal,
      });
      if (!mine()) return;
      if (!res.ok) {
        let msg = `Server returned ${res.status}`;
        try { msg = (await res.json()).error || msg; } catch { /* not JSON */ }
        if (res.status === 404 || res.status === 405) msg = 'The C runner is not available on this host. Run the site with "npm run dev", or deploy it with the included Dockerfile (see README).';
        push('error', msg, 0);
        setStatus('error');
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let sawExit = false;
      for (;;) {
        const { value, done } = await reader.read();
        if (done || !mine()) break;
        buf += decoder.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf('\n')) >= 0) {
          const raw = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (!raw.trim()) continue;
          const ev = JSON.parse(raw);
          if (ev.type === 'status') {
            setStatus(ev.data);
            if (ev.data === 'starting') startRef.current = Date.now();
          } else if (ev.type === 'cmd') push('cmd', ev.data, ev.t);
          else if (ev.type === 'stdout' || ev.type === 'stderr') pushStream(ev.type, ev.data, ev.t);
          else if (ev.type === 'compile-error') {
            ev.data.replace(/\r\n/g, '\n').split('\n').filter(Boolean).forEach((l) => push('compile', l, ev.t));
          } else if (ev.type === 'error') push('error', ev.data, ev.t);
          else if (ev.type === 'exit') {
            sawExit = true;
            flushAll(ev.t);
            setExit(ev.data);
            setElapsed(ev.data.ms);
            setStatus(ev.data.phase === 'stopped' ? 'stopped' : ev.data.code === 0 ? 'done' : 'error');
          }
        }
      }
      if (mine() && !sawExit) {
        flushAll(Date.now() - startRef.current);
        push('error', 'The connection to the C runner ended unexpectedly.', Date.now() - startRef.current);
        setStatus('error');
      }
    } catch (e) {
      if (!mine()) return; // replaced by a newer run, nothing to report
      if (e.name === 'AbortError') {
        flushAll(Date.now() - startRef.current);
        push('error', 'Stopped by user.', Date.now() - startRef.current);
        setStatus('stopped');
      } else {
        push('error', `Could not reach the C runner: ${e.message}`, 0);
        setStatus('error');
      }
    } finally {
      if (mine()) activeRef.current = null;
    }
  }, [push, pushStream, flushAll]);

  // Ask the server to kill the program. The stream then ends with an exit event.
  // If the server cannot be reached, drop the stream locally.
  const stop = useCallback(async () => {
    const ctrl = activeRef.current;
    try {
      const r = await fetch('/api/c/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: getClientId() }),
      });
      if (!r.ok) throw new Error(String(r.status));
      setTimeout(() => { if (activeRef.current === ctrl) ctrl?.abort(); }, 3000);
    } catch {
      ctrl?.abort();
    }
  }, []);

  const clear = useCallback(() => {
    setLines([]);
    setExit(null);
    if (!activeRef.current) setStatus('idle');
  }, []);

  // Stop the program if the user leaves the page mid-run.
  useEffect(() => () => activeRef.current?.abort(), []);

  return { lines, status, exit, info, elapsed, runCode, stop, clear, busy };
}
