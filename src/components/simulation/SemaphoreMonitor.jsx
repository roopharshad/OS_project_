import { motion } from 'framer-motion';
import { Activity, Lock, Unlock } from 'lucide-react';
import { PHI_STATE, ALG_TEXT as LINE_TEXT, forkView, leftForkOf, rightForkOf } from '../../engine/simulationEngine';

function Row({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="text-charcoal/45 shrink-0">{label}</span>
      <span className="text-right text-charcoal">{children}</span>
    </div>
  );
}

export default function SemaphoreMonitor({ state, compact = false }) {
  const { mutex, mutexHolder, S, algLines, algPhil, semHistory, phiStates, phases } = state;
  const mainLine = algLines.find((k) => LINE_TEXT[k]);
  const forks = forkView(phiStates, phases);
  const waiting = phases
    .map((p, i) => (p === 'TF_WAIT_S' && S[i] === 0 ? i : null))
    .filter((i) => i !== null);
  const requesting = algPhil !== null && phiStates[algPhil] === PHI_STATE.HUNGRY ? algPhil
    : phiStates.findIndex((s) => s === PHI_STATE.HUNGRY);

  return (
    <div className={`bg-white border border-border rounded-2xl shadow-card overflow-hidden ${compact ? 'h-full flex flex-col' : ''}`}>
      <div className={`flex items-center justify-between border-b border-border ${compact ? 'px-4 py-2' : 'px-5 py-3.5'}`}>
        <div className="flex items-center gap-2">
          <Activity size={15} className="text-forest" />
          <h3 className="text-base text-charcoal">Semaphore Monitor</h3>
        </div>
        <span className="eyebrow">live</span>
      </div>

      <div className={`font-mono ${compact ? 'p-3 text-[11.5px] space-y-2 flex-1 min-h-0 overflow-hidden' : 'p-5 text-[12.5px] space-y-4'}`}>
        {/* mutex */}
        <div className={`flex items-center gap-3 rounded-xl border px-3.5 ${compact ? 'py-1.5' : 'py-3'} transition-colors ${
          mutex === 1 ? 'bg-ivory border-border' : 'bg-hungry/60 border-amber-200'}`}>
          {mutex === 1 ? <Unlock size={15} className="text-forest" /> : <Lock size={15} className="text-amber-700" />}
          <span className="text-charcoal">mutex</span>
          <span className="text-charcoal/40">=</span>
          <motion.span key={mutex} initial={{ y: -3, opacity: 0.5 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.12 }} className="font-semibold text-charcoal">
            {mutex}
          </motion.span>
          <span className={`ml-auto font-sans text-[10.5px] font-semibold tracking-wide ${mutex === 1 ? 'text-forest' : 'text-amber-800'}`}>
            {mutex === 1 ? 'AVAILABLE' : `HELD BY P${mutexHolder + 1}`}
          </span>
        </div>

        {/* S[i] */}
        <div className="grid grid-cols-5 gap-2">
          {S.map((v, i) => (
            <div key={i} className={`rounded-xl border text-center ${compact ? 'py-1' : 'py-2.5'} transition-colors ${
              v > 0 ? 'bg-eating border-[#B9D8BF]' : waiting.includes(i) ? 'bg-hungry/50 border-amber-200' : 'bg-ivory border-border'}`}>
              <div className="text-[10.5px] text-charcoal/50">S[{i}]</div>
              <motion.div key={`${i}-${v}`} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className="text-base font-semibold text-charcoal">
                {v}
              </motion.div>
              <div className="font-sans text-[9px] font-semibold tracking-wide text-charcoal/40">
                {v > 0 ? 'SIGNALLED' : waiting.includes(i) ? 'BLOCKED' : 'IDLE'}
              </div>
            </div>
          ))}
        </div>

        {/* Forks: computed from the same data as the table, so they always match */}
        {/* One entry per philosopher (each uses two forks), so nobody is listed twice */}
        <div className={`rounded-xl border border-border bg-ivory/60 px-3.5 ${compact ? 'py-1.5 space-y-1' : 'py-2.5 space-y-1.5'}`}>
          {phiStates.map((_, i) => {
            const L = leftForkOf(i), R = rightForkOf(i);
            if (forks.owner[L] === i && forks.owner[R] === i) {
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#3E8E55]" />
                  <span className="text-charcoal font-semibold">P{i + 1}</span>
                  <span className="text-[#24583A]">holding F{L} + F{R}</span>
                </div>
              );
            }
            if (forks.reserved[L] === i && forks.reserved[R] === i) {
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#D99A22]" />
                  <span className="text-charcoal font-semibold">P{i + 1}</span>
                  <span className="text-[#7A5410]">granted F{L} + F{R}, next: sem_wait(S[{i}])</span>
                </div>
              );
            }
            return null;
          })}
          {(() => {
            const free = forks.owner.map((o, j) => (o === null && forks.reserved[j] === null ? `F${j}` : null)).filter(Boolean);
            return (
              <div className="flex items-center gap-2 text-charcoal/55">
                <span className="w-2 h-2 rounded-full bg-[#C9C7BC]" />
                <span>{free.length === 5 ? 'All 5 forks are on the table' : free.length ? `On the table: ${free.join(', ')}` : 'No forks on the table'}</span>
              </div>
            );
          })()}
        </div>

        {/* Status rows */}
        <div className={`rounded-xl border border-border bg-ivory/60 px-3.5 divide-y divide-border ${compact ? 'py-0.5 [&>div]:py-1' : 'py-2'}`}>
          <Row label="critical section">
            {mutexHolder !== null ? <span className="text-forest font-semibold">P{mutexHolder + 1} inside</span> : <span className="text-charcoal/40">empty</span>}
          </Row>
          <Row label="requesting">
            {requesting >= 0 ? `Philosopher ${requesting + 1}` : <span className="text-charcoal/40">none</span>}
          </Row>
          <Row label="blocked on S[i]">
            {waiting.length ? waiting.map((i) => `P${i + 1}`).join(', ') : <span className="text-charcoal/40">none</span>}
          </Row>
          <Row label="executing">
            {/* No exit animation: the text must change on the same frame as the table */}
            <span>
              {mainLine && algPhil !== null ? `P${algPhil + 1}: ${LINE_TEXT[mainLine]}` : <span className="text-charcoal/40">time passing</span>}
            </span>
          </Row>
        </div>

        {/* Recent operations (the compact frame shows these in the execution log instead) */}
        {!compact && <div>
          <div className="eyebrow font-sans mb-2">recent operations</div>
          <div className="rounded-xl border border-border bg-[#FBFAF7] px-3 py-2 h-[148px] overflow-hidden">
            {semHistory.length === 0 && <div className="text-charcoal/35 py-1">$ waiting for first operation…</div>}
            {[...semHistory].reverse().slice(0, 6).map((op, k) => (
              <div key={op.id} className={`flex items-center gap-2 py-[3px] ${k === 0 ? 'opacity-100' : 'opacity-70'}`}>
                <span className="text-charcoal/30">P{op.phil + 1}</span>
                <span className={op.op === 'sem_wait' ? 'text-[#7A5410]' : 'text-forest'}>{op.op}</span>
                <span className="text-charcoal">({op.target})</span>
                <span className="ml-auto text-charcoal/40">→ {op.value}</span>
              </div>
            ))}
          </div>
        </div>}

        {!compact && <div className="grid grid-cols-2 gap-2 font-sans text-[11px] leading-snug">
          <div className="rounded-lg bg-ivory px-3 py-2"><code className="font-mono text-[#7A5410] font-semibold">sem_wait(s)</code><p className="text-charcoal/55 mt-0.5">Decrements s. Blocks the caller while s is 0.</p></div>
          <div className="rounded-lg bg-ivory px-3 py-2"><code className="font-mono text-forest font-semibold">sem_post(s)</code><p className="text-charcoal/55 mt-0.5">Increments s and wakes one waiting thread.</p></div>
        </div>}
      </div>
    </div>
  );
}
