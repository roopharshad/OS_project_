import { useEffect, useRef } from 'react';

// Colour each line by what it says, so the output lines up with the simulation.
function lineColor(l) {
  if (l.kind === 'cmd') return 'text-[#6B6F66]';
  if (l.kind === 'compile' || l.kind === 'error') return /warning/i.test(l.text) ? 'text-[#8A5A12]' : 'text-[#A33A2B]';
  if (l.kind === 'stderr') return 'text-[#8A5A12]';
  if (/EATING/.test(l.text)) return 'text-[#24583A]';
  if (/HUNGRY/.test(l.text)) return 'text-[#8A5A12]';
  if (/THINKING/.test(l.text)) return 'text-[#2F5E80]';
  if (/finished/i.test(l.text)) return 'text-forest font-semibold';
  return 'text-charcoal';
}

function dot(l) {
  if (/EATING/.test(l.text)) return '#3E8E55';
  if (/HUNGRY/.test(l.text)) return '#D99A22';
  if (/THINKING/.test(l.text)) return '#4C86B5';
  return null;
}

export default function OutputConsole({ lines, status }) {
  const boxRef = useRef(null);
  useEffect(() => {
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  return (
    <div ref={boxRef} className="h-full overflow-auto bg-[#FBFAF7] px-4 py-3 font-mono text-[12.5px] leading-[21px]">
      {lines.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center text-center text-charcoal/40 font-sans text-sm gap-1">
          <span>Press <strong className="text-charcoal/60">Run</strong> to compile the code with gcc and run it.</span>
          <span className="text-xs">Output appears here line by line while the threads run. Shortcut: Ctrl + Enter</span>
        </div>
      )}
      {lines.map((l) => {
        const d = l.kind === 'stdout' ? dot(l) : null;
        return (
          <div key={l.id} className="flex items-start gap-3">
            <span className="w-12 shrink-0 text-right text-charcoal/30 tabular-nums select-none">
              {l.kind === 'cmd' ? '' : `${(l.t / 1000).toFixed(1)}s`}
            </span>
            <span className="w-2 shrink-0 pt-[7px]">{d && <span className="block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d }} />}</span>
            <span className={`whitespace-pre-wrap break-words ${lineColor(l)}`}>{l.text}</span>
          </div>
        );
      })}
      {status === 'starting' && (
        <div className="flex items-center gap-3 mt-1 text-charcoal/45 font-sans text-xs">
          <span className="w-12" /><span className="w-2" />
          <span>Starting the program… The first launch of a newly compiled program can take a few seconds while Windows checks it.</span>
        </div>
      )}
      {(status === 'running' || status === 'compiling') && (
        <div className="flex items-center gap-3 mt-1 text-charcoal/40">
          <span className="w-12" /><span className="w-2" />
          <span className="inline-block w-2 h-4 bg-forest/60 animate-pulse" />
        </div>
      )}
    </div>
  );
}
