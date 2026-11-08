import { useMemo, useRef } from 'react';
import { highlightC, TOKEN_COLORS } from '../../utils/highlightC';

// Editable C code with syntax highlighting: a transparent <textarea> sits
// exactly on top of a highlighted <pre>. Both share one scroll container, so
// they never drift apart. Monospace, same size, no bold/italic, so widths match.
const LINE_H = 22;

export default function CodeEditor({ value, onChange, onRun, readOnly = false }) {
  const taRef = useRef(null);
  const lines = useMemo(() => highlightC(value), [value]);
  const lineCount = value.split('\n').length;

  const onKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onRun?.();
      return;
    }
    if (e.key === 'Tab' && !readOnly) {
      e.preventDefault();
      const ta = e.currentTarget;
      const { selectionStart: s, selectionEnd: en } = ta;
      const next = value.slice(0, s) + '    ' + value.slice(en);
      onChange(next);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 4; });
    }
  };

  const text = 'font-mono text-[13px] whitespace-pre';
  const style = { lineHeight: `${LINE_H}px`, tabSize: 4 };

  return (
    <div className="h-full overflow-auto bg-[#FCFBF8]" onClick={() => taRef.current?.focus()}>
      <div className="flex min-w-max">
        <div className={`sticky left-0 z-10 shrink-0 select-none bg-[#F4F2EA] border-r border-line py-3 pr-3 pl-3 text-right text-charcoal/30 ${text}`} style={style} aria-hidden="true">
          {Array.from({ length: lineCount }, (_, n) => <div key={n}>{n + 1}</div>)}
        </div>
        <div className="relative flex-1">
          <pre className={`m-0 py-3 pl-4 pr-8 ${text}`} style={style} aria-hidden="true">
            {lines.map((toks, n) => (
              <div key={n}>
                {toks.length === 0 ? ' ' : toks.map((t, k) => (
                  <span key={k} style={{ color: TOKEN_COLORS[t.kind] }}>{t.text}</span>
                ))}
              </div>
            ))}
          </pre>
          <textarea
            ref={taRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            readOnly={readOnly}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            aria-label="C source code editor"
            className={`absolute inset-0 w-full h-full resize-none overflow-hidden bg-transparent py-3 pl-4 pr-8 text-transparent caret-charcoal outline-none selection:bg-forest/20 ${text}`}
            style={{ ...style, WebkitTextFillColor: 'transparent' }}
          />
        </div>
      </div>
    </div>
  );
}
