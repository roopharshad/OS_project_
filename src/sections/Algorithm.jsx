import { motion } from 'framer-motion';
import Section from '../components/layout/Section';
import MiniControls from '../components/simulation/MiniControls';
import { ALG } from '../engine/simulationEngine';

// [algorithm key or null, indent level, text]
const BLOCKS = [
  {
    name: 'TAKE_FORKS(i)',
    note: 'Called when philosopher i becomes hungry.',
    lines: [
      [ALG.TF_WAIT_MUTEX, 1, 'wait(mutex)'],
      [ALG.TF_SET_HUNGRY, 1, 'state[i] = HUNGRY'],
      [ALG.TF_TEST, 1, 'test(i)'],
      [ALG.TF_SIG_MUTEX, 1, 'signal(mutex)'],
      [ALG.TF_WAIT_S, 1, 'wait(S[i])'],
    ],
  },
  {
    name: 'TEST(i)',
    note: 'Always runs while the caller holds mutex.',
    lines: [
      [ALG.TEST_IF, 1, 'if state[i] == HUNGRY'],
      [ALG.TEST_IF, 1, 'and left neighbor is not EATING'],
      [ALG.TEST_IF, 1, 'and right neighbor is not EATING:'],
      [ALG.TEST_SET_EATING, 2, 'state[i] = EATING'],
      [ALG.TEST_SIG_S, 2, 'signal(S[i])'],
    ],
  },
  {
    name: 'PUT_FORKS(i)',
    note: 'Called when philosopher i finishes eating.',
    lines: [
      [ALG.PF_WAIT_MUTEX, 1, 'wait(mutex)'],
      [ALG.PF_SET_THINKING, 1, 'state[i] = THINKING'],
      [ALG.PF_TEST_LEFT, 1, 'test(left neighbor)'],
      [ALG.PF_TEST_RIGHT, 1, 'test(right neighbor)'],
      [ALG.PF_SIG_MUTEX, 1, 'signal(mutex)'],
    ],
  },
];

const EXPLAIN = {
  [ALG.TF_WAIT_MUTEX]: 'Enter the critical section so no other philosopher can change state[] at the same time.',
  [ALG.TF_SET_HUNGRY]: 'Record that this philosopher wants both forks.',
  [ALG.TF_TEST]: 'Check immediately whether both neighbours are away from the table.',
  [ALG.TF_SIG_MUTEX]: 'Leave the critical section. The decision has already been recorded in state[] and S[i].',
  [ALG.TF_WAIT_S]: 'Proceed if test() signalled S[i]; otherwise sleep until a neighbour signals it.',
  [ALG.PF_WAIT_MUTEX]: 'Enter the critical section before releasing the forks.',
  [ALG.PF_SET_THINKING]: 'Put both forks down by leaving the EATING state.',
  [ALG.PF_TEST_LEFT]: 'The left neighbour may have been waiting for this fork; give it a chance to eat.',
  [ALG.PF_TEST_RIGHT]: 'Do the same for the right neighbour.',
  [ALG.PF_SIG_MUTEX]: 'Leave the critical section.',
};

export default function Algorithm({ sim }) {
  const { algLines, algPhil, testTarget, testResult } = sim.state;
  const active = new Set(algLines);
  const callerLine = algLines.find((k) => EXPLAIN[k]);

  return (
    <Section id="algorithm" index={4} title="Algorithm"
      subtitle="The semaphore solution from Tanenbaum's Modern Operating Systems. The line being executed by the simulation is highlighted in green."
      aside={<MiniControls sim={sim} />}>
      <div className="mb-5 rounded-2xl border border-border bg-white px-5 py-4 shadow-card flex flex-wrap items-center gap-x-6 gap-y-2 text-sm min-h-[60px]">
        <span className="eyebrow">Now executing</span>
        {callerLine && algPhil !== null ? (
          <motion.div key={`${callerLine}-${algPhil}-${sim.state.tick}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-semibold text-forest">Philosopher {algPhil + 1} (i = {algPhil})</span>
            <span className="text-charcoal/65">{EXPLAIN[callerLine]}</span>
            {testTarget !== null && (
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${testResult ? 'bg-eating text-[#24583A]' : 'bg-ivory text-charcoal/60 border border-border'}`}>
                test({testTarget}) → {testResult ? 'P' + (testTarget + 1) + ' may eat' : 'condition false'}
              </span>
            )}
          </motion.div>
        ) : (
          <span className="text-charcoal/45">No algorithm line on this tick. Philosophers are thinking or eating. Press Run or Step.</span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {BLOCKS.map((b) => {
          const blockActive = b.lines.some(([k]) => active.has(k));
          return (
            <div key={b.name} className={`bg-white rounded-2xl border shadow-card overflow-hidden transition-colors ${blockActive ? 'border-forest/40' : 'border-border'}`}>
              <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                <code className="font-mono text-[14px] font-semibold text-charcoal">{b.name}:</code>
                {blockActive && <span className="text-[10.5px] font-semibold text-forest tracking-wide">ACTIVE</span>}
              </div>
              <div className="py-3 font-mono text-[13.5px]">
                {b.lines.map(([k, indent, text], n) => {
                  const on = active.has(k);
                  return (
                    <div key={n} className={`relative flex items-center gap-4 py-[7px] pr-4 transition-colors duration-200 ${on ? 'bg-eating/70 text-charcoal' : 'text-charcoal/70'}`}>
                      <span className={`absolute left-0 top-0 bottom-0 w-[3px] ${on ? 'bg-forest' : 'bg-transparent'}`} />
                      <span className="w-8 text-right text-[11px] text-charcoal/30 tabular-nums select-none">{n + 1}</span>
                      <span style={{ paddingLeft: `${(indent - 1) * 22}px` }} className={on ? 'font-semibold' : ''}>{text}</span>
                    </div>
                  );
                })}
              </div>
              <div className="px-5 py-3 border-t border-border bg-ivory/50 text-xs text-charcoal/55">{b.note}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          ['Initial values', 'mutex = 1, so one philosopher at a time may enter. Every S[i] = 0, so wait(S[i]) blocks until test(i) signals it.'],
          ['Why test() is called twice', 'A hungry philosopher tests itself in take_forks(). If it fails, it relies on a neighbour calling test() on it from put_forks().'],
          ['Why wait(S[i]) is outside mutex', 'Sleeping while holding mutex would stop every other philosopher, including the one who must wake it up.'],
        ].map(([t, d]) => (
          <div key={t} className="section-card">
            <h3 className="text-[17px] mb-2">{t}</h3>
            <p className="text-sm text-charcoal/65 leading-relaxed">{d}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
