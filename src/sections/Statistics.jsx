import { motion } from 'framer-motion';
import { Utensils, Brain, Hourglass, Users, Repeat, Hash, CheckCircle2, Clock } from 'lucide-react';
import Section from '../components/layout/Section';
import MiniControls from '../components/simulation/MiniControls';
import { N, PHI_STATE } from '../engine/simulationEngine';

const STATE_CLS = {
  [PHI_STATE.THINKING]: 'state-thinking',
  [PHI_STATE.HUNGRY]: 'state-hungry',
  [PHI_STATE.EATING]: 'state-eating',
};

function StatCard({ icon: Icon, label, value, note }) {
  return (
    <div className="section-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-8 h-8 rounded-lg bg-ivory flex items-center justify-center">
          <Icon size={15} strokeWidth={1.8} className="text-forest" />
        </span>
        <span className="text-[12.5px] text-charcoal/60 leading-tight">{label}</span>
      </div>
      <motion.div key={String(value)} initial={{ opacity: 0.4, y: -3 }} animate={{ opacity: 1, y: 0 }}
        className="font-serif text-[34px] leading-none text-charcoal tabular-nums">
        {value}
      </motion.div>
      {note && <div className="mt-2 text-[11.5px] text-charcoal/45">{note}</div>}
    </div>
  );
}

export default function Statistics({ sim }) {
  const { state } = sim;
  const { stats, phiStates, completed, maxRounds, tick } = state;
  const roundsLabel = Number.isFinite(maxRounds) ? `${stats.rounds} / ${maxRounds}` : String(stats.rounds);
  const maxMeals = Math.max(1, ...stats.eatCount);
  const totalWait = stats.waitMs.reduce((a, b) => a + b, 0);

  return (
    <Section id="statistics" index={7} title="Statistics & Results"
      subtitle="Counters collected by the simulation engine. They update on every tick, and a final results table appears when all rounds are finished."
      aside={<MiniControls sim={sim} />}>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard icon={Utensils} label="Total Eating Operations" value={stats.totalEat} />
        <StatCard icon={Brain} label="Total Thinking Operations" value={stats.totalThink} note="meals finished, forks released" />
        <StatCard icon={Hourglass} label="Total Hungry Operations" value={stats.totalHungry} />
        <StatCard icon={Users} label="Max Simultaneous Eating" value={stats.maxEating} note="at most 2 are possible with 5 forks" />
        <StatCard icon={Repeat} label="Completed Rounds" value={roundsLabel} note="rounds every philosopher finished" />
        <StatCard icon={Hash} label="Total Semaphore Operations" value={stats.semOpCount} note="sem_wait + sem_post calls" />
      </div>

      <div className="mt-6 bg-white border border-border rounded-2xl shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h3 className="text-lg">{completed ? 'Final Results' : 'Per-Philosopher Statistics'}</h3>
            {completed ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-eating px-2.5 py-0.5 text-[11px] font-semibold text-[#24583A]">
                <CheckCircle2 size={12} /> Simulation complete
              </span>
            ) : (
              <span className="rounded-full bg-ivory border border-border px-2.5 py-0.5 text-[11px] font-medium text-charcoal/55">
                {tick === 0 ? 'Not started' : 'In progress'}
              </span>
            )}
          </div>
          <span className="text-xs text-charcoal/45 tabular-nums">{tick} ticks · total waiting {(totalWait / 1000).toFixed(1)}s</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-charcoal/45 bg-ivory/60">
                <th className="px-6 py-3 font-semibold">Philosopher</th>
                <th className="px-3 py-3 font-semibold">State</th>
                <th className="px-3 py-3 font-semibold text-right">Meals</th>
                <th className="px-3 py-3 font-semibold text-right">Times Hungry</th>
                <th className="px-3 py-3 font-semibold text-right">Times Thinking</th>
                <th className="px-3 py-3 font-semibold text-right">Waiting Time</th>
                <th className="px-3 py-3 font-semibold text-right">Avg Wait / Meal</th>
                <th className="px-6 py-3 font-semibold w-[180px]">Share of Meals</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Array.from({ length: N }, (_, i) => {
                const meals = stats.eatCount[i];
                const avg = meals ? stats.waitMs[i] / meals / 1000 : 0;
                return (
                  <tr key={i} className="hover:bg-ivory/50">
                    <td className="px-6 py-3.5 font-medium text-charcoal">Philosopher {i + 1}</td>
                    <td className="px-3 py-3.5">
                      <span className={`state-badge ${STATE_CLS[phiStates[i]]}`}>{phiStates[i]}</span>
                    </td>
                    <td className="px-3 py-3.5 text-right tabular-nums">{meals}</td>
                    <td className="px-3 py-3.5 text-right tabular-nums">{stats.hungryCount[i]}</td>
                    <td className="px-3 py-3.5 text-right tabular-nums">{stats.thinkCount[i]}</td>
                    <td className="px-3 py-3.5 text-right tabular-nums">
                      <span className="inline-flex items-center gap-1"><Clock size={12} className="text-olive" />{(stats.waitMs[i] / 1000).toFixed(1)}s</span>
                    </td>
                    <td className="px-3 py-3.5 text-right tabular-nums text-charcoal/70">{avg.toFixed(2)}s</td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                          <motion.div className="h-full rounded-full bg-forest" initial={false}
                            animate={{ width: `${(meals / maxMeals) * 100}%` }} transition={{ duration: 0.4 }} />
                        </div>
                        <span className="w-9 text-right text-xs tabular-nums text-charcoal/55">
                          {stats.totalEat ? Math.round((meals / stats.totalEat) * 100) : 0}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-ivory/60 font-semibold text-charcoal">
                <td className="px-6 py-3">Total</td>
                <td className="px-3 py-3" />
                <td className="px-3 py-3 text-right tabular-nums">{stats.totalEat}</td>
                <td className="px-3 py-3 text-right tabular-nums">{stats.totalHungry}</td>
                <td className="px-3 py-3 text-right tabular-nums">{stats.totalThink}</td>
                <td className="px-3 py-3 text-right tabular-nums">{(totalWait / 1000).toFixed(1)}s</td>
                <td className="px-3 py-3 text-right tabular-nums">{stats.totalEat ? (totalWait / stats.totalEat / 1000).toFixed(2) : '0.00'}s</td>
                <td className="px-6 py-3" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          ['Safety', stats.maxEating <= 2 ? 'Held' : 'Violated',
            `At most ${stats.maxEating} philosopher${stats.maxEating === 1 ? '' : 's'} ate at once, and no two neighbours ever ate together.`],
          ['Deadlock', completed ? 'None' : tick ? 'None so far' : 'Not run',
            completed ? 'Every philosopher finished all its rounds, so the threads never got stuck.' : 'The run finishes only if no deadlock happens.'],
          ['Fairness', stats.totalEat ? `${Math.min(...stats.eatCount)}–${Math.max(...stats.eatCount)} meals` : 'Not run',
            'Meal counts per philosopher. A capped number of rounds evens them out, but this algorithm does not guarantee it.'],
        ].map(([t, v, d]) => (
          <div key={t} className="section-card p-5">
            <div className="eyebrow mb-1.5">{t}</div>
            <div className="font-serif text-xl text-charcoal mb-1.5">{v}</div>
            <p className="text-[13px] text-charcoal/60 leading-relaxed">{d}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
