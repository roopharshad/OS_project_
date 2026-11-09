import { motion } from 'framer-motion';
import { Clock, Utensils, Hourglass } from 'lucide-react';
import { PHI_STATE, SHOWN, shownState, forkView, leftForkOf, rightForkOf } from '../../engine/simulationEngine';

const BADGE = {
  [PHI_STATE.THINKING]: ['state-thinking', 'Thinking', 'border-t-[#9DBFD9]'],
  [PHI_STATE.HUNGRY]: ['state-hungry', 'Hungry', 'border-t-[#DDB65A]'],
  [PHI_STATE.EATING]: ['state-eating', 'Eating', 'border-t-[#7DB487]'],
  [SHOWN.GRANTED]: ['state-hungry', 'Granted', 'border-t-[#7DB487]'],
};

function ForkPill({ id, owner, self }) {
  const mine = owner === self;
  const busy = owner !== null && !mine;
  return (
    <div className={`flex-1 min-w-0 truncate rounded-lg px-2 py-1.5 text-[11px] font-medium text-center border ${
      mine ? 'bg-eating border-[#B9D8BF] text-[#24583A]' : busy ? 'bg-hungry/50 border-amber-200 text-[#7A5410]' : 'bg-ivory border-border text-charcoal/55'}`}>
      <span className="font-mono">F{id}</span>{' · '}
      {mine ? 'held' : busy ? `used by P${owner + 1}` : 'free'}
    </div>
  );
}

export default function PhilosopherCards({ phiStates, phases, stats, compact = false }) {
  const { owner: owners } = forkView(phiStates, phases);

  // Compact: five small cards in one row, for the one-screen dashboard.
  if (compact) {
    return (
      <div className="grid grid-cols-5 gap-2">
        {phiStates.map((st, i) => {
          const [cls, label, top] = BADGE[phases ? shownState(phiStates, phases, i) : st];
          const L = leftForkOf(i), R = rightForkOf(i);
          const has = owners[L] === i && owners[R] === i;
          return (
            <div key={i} className={`min-w-0 overflow-hidden bg-white border border-border border-t-[3px] ${top} rounded-xl px-2.5 py-2 shadow-card`}>
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="font-serif text-[13.5px] text-charcoal whitespace-nowrap">P{i + 1}</span>
                <span className={`state-badge shrink-0 whitespace-nowrap !px-2 !text-[10px] ${cls}`}>{label}</span>
              </div>
              <div className="grid grid-cols-3 text-center text-[10px] leading-tight text-charcoal/50">
                <div><div className="text-[12.5px] font-semibold text-charcoal tabular-nums">{stats.eatCount[i]}</div>eaten</div>
                <div><div className="text-[12.5px] font-semibold text-charcoal tabular-nums">{stats.hungryCount[i]}</div>hungry</div>
                <div><div className="text-[12.5px] font-semibold text-charcoal tabular-nums">{(stats.waitMs[i] / 1000).toFixed(1)}s</div>wait</div>
              </div>
              <div className={`mt-1.5 truncate rounded-md text-center text-[10px] font-medium py-0.5 ${has ? 'bg-eating text-[#24583A]' : 'bg-ivory text-charcoal/50'}`}>
                {has ? `holds F${L} + F${R}` : 'forks: none'}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {phiStates.map((st, i) => {
        const [cls, label, top] = BADGE[phases ? shownState(phiStates, phases, i) : st];
        const L = leftForkOf(i), R = rightForkOf(i);
        const waitSec = (stats.waitMs[i] / 1000).toFixed(1);
        return (
          <motion.div key={i} layout className={`min-w-0 overflow-hidden bg-white border border-border border-t-[3px] ${top} rounded-xl p-4 shadow-card transition-colors`}>
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 mb-3">
              <span className="min-w-0 font-serif text-[15px] text-charcoal whitespace-nowrap">Philosopher {i + 1}</span>
              <span className={`state-badge shrink-0 whitespace-nowrap ${cls}`}>{label}</span>
            </div>
            <dl className="grid grid-cols-3 gap-2 text-center mb-3">
              <div className="rounded-lg bg-ivory py-2">
                <Utensils size={12} className="mx-auto text-olive mb-1" />
                <dd className="text-sm font-semibold tabular-nums">{stats.eatCount[i]}</dd>
                <dt className="text-[10px] text-charcoal/45">meals</dt>
              </div>
              <div className="rounded-lg bg-ivory py-2">
                <Hourglass size={12} className="mx-auto text-olive mb-1" />
                <dd className="text-sm font-semibold tabular-nums">{stats.hungryCount[i]}</dd>
                <dt className="text-[10px] text-charcoal/45">hungry</dt>
              </div>
              <div className="rounded-lg bg-ivory py-2" title={`${stats.waitTicks[i]} ticks`}>
                <Clock size={12} className="mx-auto text-olive mb-1" />
                <dd className="text-sm font-semibold tabular-nums">{waitSec}s</dd>
                <dt className="text-[10px] text-charcoal/45">waiting</dt>
              </div>
            </dl>
            <div className="flex gap-2">
              <ForkPill id={L} owner={owners[L]} self={i} />
              <ForkPill id={R} owner={owners[R]} self={i} />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
