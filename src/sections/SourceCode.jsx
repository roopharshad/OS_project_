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

const API_DOCS = [
  {
    name: 'pthread_create()',
    sig: 'int pthread_create(pthread_t *thread, const pthread_attr_t *attr, void *(*start)(void *), void *arg);',
    text: 'Starts a new thread that runs start(arg). main() calls it five times, once per philosopher, passing &id[i] so each thread knows its number. pthread_join() later waits for each thread to finish.',
  },
  {
    name: 'sem_init()',
    sig: 'int sem_init(sem_t *sem, int pshared, unsigned int value);',
    text: 'Creates a semaphore with a starting value. pshared = 0 shares it between threads of one process. mutex starts at 1 (unlocked). Each S[i] starts at 0, so wait(S[i]) blocks until test(i) grants the forks.',
  },
  {
    name: 'sem_wait()',
    sig: 'int sem_wait(sem_t *sem);',
    text: 'The wait() or P() operation. If the value is above 0 it is decreased and the call returns at once. If it is 0 the thread sleeps until another thread calls sem_post(). Checking and decreasing is one atomic step.',
  },
  {
    name: 'sem_post()',
    sig: 'int sem_post(sem_t *sem);',
    text: 'The signal() or V() operation. Increases the value by 1 and wakes one thread sleeping in sem_wait() on it. Used to release mutex and to give a philosopher permission to eat through S[i].',
  },
];

const FN_DOCS = [
  ['take_forks(i)', 'Locks mutex, marks philosopher i HUNGRY and calls test(i). It then unlocks mutex and calls sem_wait(&S[i]). If test() succeeded, S[i] is already 1 and the wait returns at once. Otherwise the thread sleeps until a neighbour wakes it.'],
  ['test(i)', 'If i is HUNGRY and neither LEFT(i) nor RIGHT(i) is EATING, sets state[i] = EATING and calls sem_post(&S[i]). It only runs with mutex held, so the check and the update cannot be interleaved with another thread.'],
  ['put_forks(i)', 'Locks mutex, sets philosopher i back to THINKING (releasing both forks) and calls test() on both neighbours. This is how a blocked philosopher gets woken. Then it unlocks mutex.'],
];

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
    <Section id="source" index={6} title="Source Code"
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

      <div className="mt-8 grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Panel icon={Cpu} title="POSIX functions used">
          <div className="divide-y divide-border">
            {API_DOCS.map((d) => (
              <div key={d.name} className="px-5 py-4">
                <code className="font-mono text-[13.5px] font-semibold text-forest">{d.name}</code>
                <pre className="mt-1.5 mb-2 font-mono text-[11px] text-charcoal/50 whitespace-pre-wrap break-words">{d.sig}</pre>
                <p className="text-[13.5px] text-charcoal/70 leading-relaxed">{d.text}</p>
              </div>
            ))}
          </div>
        </Panel>
        <Panel icon={FileCode2} title="Program functions">
          <div className="divide-y divide-border">
            {FN_DOCS.map(([name, text]) => (
              <div key={name} className="px-5 py-4">
                <code className="font-mono text-[13.5px] font-semibold text-charcoal">{name}</code>
                <p className="mt-1.5 text-[13.5px] text-charcoal/70 leading-relaxed">{text}</p>
              </div>
            ))}
            <div className="px-5 py-4 bg-ivory/60">
              <div className="text-[12px] font-semibold text-olive uppercase tracking-wider mb-1.5">Reading the output</div>
              <p className="text-[13px] text-charcoal/65 leading-relaxed">
                Thread scheduling is decided by the operating system, so the order changes between runs. Two philosophers who are
                not neighbours may eat at the same time. Two neighbours never do.
              </p>
            </div>
          </div>
        </Panel>
      </div>
    </Section>
  );
}
