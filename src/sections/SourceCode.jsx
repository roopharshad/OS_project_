import { useState } from 'react';
import {
  Check, Copy, FileCode2, Play, Square, RotateCcw, Terminal, Trash2, CheckCircle2, XCircle, Loader2, Cpu,
} from 'lucide-react';
import Section from '../components/layout/Section';
import Panel, { HeaderButton } from '../components/dashboard/Panel';
import CodeEditor from '../components/code/CodeEditor';
import OutputConsole from '../components/code/OutputConsole';
import { useCRunner } from '../hooks/useCRunner';
import ORIGINAL from '../../c/dining_philosophers.c?raw';

const SOURCE = ORIGINAL.replace(/\r\n/g, '\n');

function StatusPill({ status, exit, elapsed }) {
  const secs = `${(elapsed / 1000).toFixed(1)}s`;
  if (status === 'compiling') return <span className="inline-flex items-center gap-1.5 text-[12px] text-white/85"><Loader2 size={13} className="animate-spin" /> Compiling…</span>;
  if (status === 'starting') return <span className="inline-flex items-center gap-1.5 text-[12px] text-white/85"><Loader2 size={13} className="animate-spin" /> Starting program…</span>;
  if (status === 'stopped') return <span className="inline-flex items-center gap-1.5 text-[12px] text-white/70"><Square size={11} fill="currentColor" /> Stopped · {secs}</span>;
  if (status === 'running') return <span className="inline-flex items-center gap-1.5 text-[12px] text-white/85"><span className="w-2 h-2 rounded-full bg-[#9BD3A8] animate-pulse" /> Running · {secs}</span>;
  if (status === 'done') return <span className="inline-flex items-center gap-1.5 text-[12px] text-[#CDEBD3]"><CheckCircle2 size={13} /> Exit code 0 · {secs}</span>;
  if (status === 'error' && exit) {
    return <span className="inline-flex items-center gap-1.5 text-[12px] text-[#F3C9C0]"><XCircle size={13} /> {exit.phase === 'compile' ? 'Compilation failed' : `Exit code ${exit.code ?? exit.signal}`}</span>;
  }
  if (status === 'error') return <span className="inline-flex items-center gap-1.5 text-[12px] text-[#F3C9C0]"><XCircle size={13} /> Error</span>;
  return <span className="text-[12px] text-white/60">Ready</span>;
}

export default function SourceCode() {
  const [code, setCode] = useState(SOURCE);
  const [copied, setCopied] = useState(false);
  const runner = useCRunner();
  const modified = code !== SOURCE;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const run = () => runner.runCode(code);
  const available = runner.info?.available;

  return (
    <Section id="source" index={3} title="Source Code"
      subtitle="The complete POSIX C implementation using pthread.h and semaphore.h. Edit it on the left, press Run, and watch the real program's output on the right as the five threads run.">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button onClick={run} disabled={available === false}
          title={runner.busy ? 'Stop the current run and start again' : 'Compile and run (Ctrl + Enter)'}
          className="inline-flex items-center gap-2 rounded-lg bg-forest-dark px-5 py-2.5 text-sm font-semibold text-white shadow-card hover:bg-forest transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          {runner.busy ? <RotateCcw size={15} /> : <Play size={15} fill="currentColor" />}
          {runner.busy ? 'Restart Run' : 'Run Code'}
        </button>
        <button onClick={runner.stop} disabled={!runner.busy}
          className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-medium text-charcoal hover:bg-ivory transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          <Square size={13} fill="currentColor" /> Stop
        </button>
        <span className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-xs text-charcoal/60">
          <Cpu size={13} className="text-olive" />
          {runner.info == null ? 'Checking compiler…'
            : available ? runner.info.compiler
              : runner.info.server === false ? 'Run Code needs the Node server (static hosting cannot run C)'
                : runner.info.error || 'No C compiler available on the server'}
        </span>
        {modified && <span className="text-xs text-[#8A5A12] bg-hungry/60 border border-amber-200 rounded-full px-2.5 py-1">Edited. The original file is unchanged.</span>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel icon={FileCode2} title="dining_philosophers.c" className="h-[640px]"
          right={(
            <div className="flex items-center gap-2">
              {modified && <HeaderButton icon={RotateCcw} onClick={() => setCode(SOURCE)} title="Restore the original code">Reset</HeaderButton>}
              <HeaderButton icon={copied ? Check : Copy} onClick={copy}>{copied ? 'Copied' : 'Copy'}</HeaderButton>
            </div>
          )}>
          <CodeEditor value={code} onChange={setCode} onRun={run} />
        </Panel>

        <Panel icon={Terminal} title="Program Output" className="h-[640px]"
          right={(
            <div className="flex items-center gap-3">
              <StatusPill status={runner.status} exit={runner.exit} elapsed={runner.elapsed} />
              <HeaderButton icon={Trash2} onClick={runner.clear}>Clear</HeaderButton>
            </div>
          )}>
          <OutputConsole lines={runner.lines} status={runner.status} />
        </Panel>
      </div>

      <p className="mt-3 text-xs text-charcoal/50 leading-relaxed">
        The code is compiled by gcc on the server and runs as a real multi-threaded program. Each philosopher
        sleeps 1 second to think and 1 second to eat, so a full run takes about 20 seconds.
        Runs stop automatically after {runner.info?.limits?.runTimeoutSec ?? 60} seconds.
        {runner.info?.platform === 'win32' && ' On Windows, the website adds a small compatibility header (win_compat.h) that provides sleep() for MinGW. The program itself is not changed.'}
      </p>
    </Section>
  );
}
