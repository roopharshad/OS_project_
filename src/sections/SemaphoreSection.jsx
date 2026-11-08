import { motion } from 'framer-motion';
import Section from '../components/layout/Section';
import MiniControls from '../components/simulation/MiniControls';
import { N, PHI_STATE } from '../engine/simulationEngine';

const STATE_CLS = {
  [PHI_STATE.THINKING]: 'state-thinking',
  [PHI_STATE.HUNGRY]: 'state-hungry',
  [PHI_STATE.EATING]: 'state-eating',
};

function Value({ v, highlight }) {
  return (
    <motion.span key={String(v)} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
      className={`font-mono font-semibold ${highlight ? 'text-forest' : 'text-charcoal'}`}>
      {v}
    </motion.span>
  );
}

export default function SemaphoreSection({ sim }) {
  const { state } = sim;
  const { mutex, mutexHolder, S, phiStates, semHistory, phases } = state;

  const rows = [
    { name: 'mutex', type: 'binary semaphore', init: 1, cur: mutex, note: mutex === 1 ? 'Critical section is free' : `Philosopher ${mutexHolder + 1} is in the critical section`, hl: mutex === 0 },
    ...Array.from({ length: N }, (_, i) => ({
      name: `S[${i}]`, type: 'semaphore', init: 0, cur: S[i],
      note: S[i] > 0 ? `Signalled: P${i + 1} may proceed to eat`
        : phases[i] === 'TF_WAIT_S' ? `P${i + 1} is blocked in sem_wait(S[${i}])` : `P${i + 1} is not waiting`,
      hl: S[i] > 0,
    })),
  ];

  return (
    <Section id="semaphore" index={3} title="Semaphore Monitor"
      subtitle="Every shared variable used by the algorithm, with its initial and current value. The table updates with each sem_wait() and sem_post() executed by the simulation."
      aside={<MiniControls sim={sim} />}>
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-5">
        <div className="section-card p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-lg">Semaphores</h3>
            <span className="text-xs text-charcoal/45">sem_init(&amp;s, 0, value)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-charcoal/45 bg-ivory/60">
                  <th className="px-6 py-2.5 font-semibold">Variable</th>
                  <th className="px-3 py-2.5 font-semibold">Kind</th>
                  <th className="px-3 py-2.5 font-semibold text-center">Initial</th>
                  <th className="px-3 py-2.5 font-semibold text-center">Current</th>
                  <th className="px-6 py-2.5 font-semibold">Meaning right now</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.name} className={r.hl ? 'bg-eating/30' : ''}>
                    <td className="px-6 py-3 font-mono text-charcoal">{r.name}</td>
                    <td className="px-3 py-3 text-charcoal/55">{r.type}</td>
                    <td className="px-3 py-3 text-center font-mono text-charcoal/50">{r.init}</td>
                    <td className="px-3 py-3 text-center"><Value v={r.cur} highlight={r.hl} /></td>
                    <td className="px-6 py-3 text-charcoal/65">{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 border-t border-border">
            <div className="eyebrow mb-3">Shared array state[N] (protected by mutex)</div>
            <div className="grid grid-cols-5 gap-2">
              {phiStates.map((s, i) => (
                <div key={i} className="rounded-xl border border-border bg-ivory/60 py-2.5 text-center">
                  <div className="font-mono text-[11px] text-charcoal/50 mb-1">state[{i}]</div>
                  <span className={`state-badge ${STATE_CLS[s]}`}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="section-card p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-border"><h3 className="text-lg">Operation Trace</h3></div>
            <div className="font-mono text-[12.5px] px-5 py-3 min-h-[244px] bg-[#FBFAF7]">
              {semHistory.length === 0 && <div className="text-charcoal/35">$ no semaphore operations yet</div>}
              {[...semHistory].reverse().map((op, k) => (
                <div key={op.id} className={`flex items-center gap-3 py-1.5 ${k === 0 ? 'text-charcoal' : 'text-charcoal/60'}`}>
                  <span className="text-charcoal/30 w-10 tabular-nums">t{op.tick}</span>
                  <span className="text-charcoal/45 w-6">P{op.phil + 1}</span>
                  <span className={op.op === 'sem_wait' ? 'text-[#7A5410]' : 'text-forest'}>{op.op}</span>
                  <span>({op.target})</span>
                  <span className="ml-auto text-charcoal/45">value → {op.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="section-card">
            <h3 className="text-lg mb-3">Reading the monitor</h3>
            <ul className="space-y-2.5 text-sm text-charcoal/65 leading-relaxed">
              <li><code className="font-mono text-charcoal">mutex = 0</code> means one philosopher is reading or writing <code className="font-mono">state[]</code>. Everyone else calling <code className="font-mono">sem_wait(mutex)</code> must wait.</li>
              <li><code className="font-mono text-charcoal">S[i] = 1</code> means <code className="font-mono">test(i)</code> granted philosopher <em>i</em> both forks. Its next <code className="font-mono">sem_wait(S[i])</code> returns immediately.</li>
              <li>A philosopher shown as <em>blocked</em> called <code className="font-mono">sem_wait(S[i])</code> while <code className="font-mono">S[i] = 0</code>. A neighbour wakes it from <code className="font-mono">put_forks()</code>.</li>
            </ul>
          </div>
        </div>
      </div>
    </Section>
  );
}
