import { useEffect, useRef } from 'react';
import { ScrollText, Trash2 } from 'lucide-react';

const DOT = {
  info: '#B9B6AA',
  semaphore: '#6C93B5',
  hungry: '#D8A63F',
  eating: '#5FA06C',
  success: '#315C46',
  warning: '#C98A2E',
};

export default function ExecutionLog({ log, onClear, height = 'h-[320px]', className = '' }) {
  const boxRef = useRef(null);

  // Keep the newest entry in view without scrolling the whole page.
  useEffect(() => {
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log.length]);

  return (
    <div className={`bg-white border border-border rounded-2xl shadow-card flex flex-col ${className}`}>
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <ScrollText size={15} className="text-forest" />
          <h3 className="text-base text-charcoal">Execution Log</h3>
          <span className="text-[10.5px] bg-ivory border border-border rounded-full px-2 py-0.5 text-charcoal/50 font-medium tabular-nums">
            {log.length}
          </span>
        </div>
        <button onClick={onClear}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-charcoal/55 hover:text-charcoal px-2.5 py-1.5 rounded-lg border border-border hover:bg-ivory transition-colors">
          <Trash2 size={12} /> Clear Log
        </button>
      </div>

      <div ref={boxRef} className={`${height} overflow-y-auto px-3 py-2 font-mono text-[12px]`}>
        {log.length === 0 && (
          <div className="h-full flex items-center justify-center text-charcoal/35 font-sans text-sm">
            Press Start or Step Forward to begin.
          </div>
        )}
        {log.map((e) => (
          <div key={e.id} className="flex items-start gap-2.5 px-2 py-[5px] rounded-md hover:bg-ivory">
            <span className="text-charcoal/35 tabular-nums shrink-0">{e.time}</span>
            <span className="mt-[6px] w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: DOT[e.type] ?? DOT.info }} />
            <span className={`leading-snug ${e.type === 'semaphore' ? 'text-[#3E6788]' : e.type === 'eating' || e.type === 'success' ? 'text-forest' : e.type === 'hungry' || e.type === 'warning' ? 'text-[#7A5410]' : 'text-charcoal/75'}`}>
              {e.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
