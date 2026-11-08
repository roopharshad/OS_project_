import {
  GitMerge, Hash, ToggleLeft, Lock, Square, ShieldCheck, RefreshCcw, Hourglass, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import Section from '../components/layout/Section';

const CONCEPTS = [
  {
    icon: GitMerge, term: 'Process Synchronization',
    text: 'Coordinating processes or threads that run at the same time so that they use shared data in a safe order. Without it, two threads can change the same value at once and leave it wrong.',
    here: 'Five philosopher threads share one state[] array and five forks.',
  },
  {
    icon: Hash, term: 'Semaphore',
    text: 'An integer counter, introduced by Dijkstra, that can only be changed by two atomic operations. wait() (sem_wait) decreases it and blocks the caller if it is 0. signal() (sem_post) increases it and wakes one blocked thread.',
    here: 'mutex and S[0]…S[4] are POSIX semaphores.',
  },
  {
    icon: ToggleLeft, term: 'Binary Semaphore',
    text: 'A semaphore whose value is only ever 0 or 1. It works like an on/off switch: 1 means the resource is available, 0 means it is taken or the event has not happened yet.',
    here: 'All six semaphores in this program stay between 0 and 1.',
  },
  {
    icon: Lock, term: 'Mutex',
    text: 'Short for mutual exclusion lock. A thread locks it before touching shared data and unlocks it afterwards. A binary semaphore initialised to 1 is the classic way to build one.',
    here: 'mutex guards every read and write of state[].',
  },
  {
    icon: Square, term: 'Critical Section',
    text: 'The part of a program that accesses shared data and must never be run by two threads at once.',
    here: 'The code between wait(mutex) and signal(mutex) in take_forks() and put_forks().',
  },
  {
    icon: ShieldCheck, term: 'Mutual Exclusion',
    text: 'The guarantee that at most one thread is inside a critical section at any moment. It is the first requirement of any correct synchronization solution.',
    here: 'Also applies to forks: two neighbours are never EATING together.',
  },
  {
    icon: RefreshCcw, term: 'Deadlock',
    text: 'A situation where every thread in a group waits for a resource held by another thread in the same group, so none of them can ever continue. It needs four conditions: mutual exclusion, hold and wait, no preemption and circular wait.',
    here: 'The naive "pick up left fork, then right fork" solution deadlocks if all five pick up their left fork together.',
  },
  {
    icon: Hourglass, term: 'Starvation',
    text: 'A thread that waits forever even though the system as a whole keeps making progress, because others keep getting the resource first.',
    here: 'Possible in this solution. See the note below.',
  },
];

export default function Concepts() {
  return (
    <Section id="concepts" index={5} title="Concepts & Learning"
      subtitle="The operating-system ideas behind the simulation, in plain English.">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {CONCEPTS.map(({ icon: Icon, term, text, here }) => (
          <article key={term} className="section-card p-5 flex flex-col">
            <span className="w-9 h-9 rounded-lg bg-ivory flex items-center justify-center mb-4">
              <Icon size={17} strokeWidth={1.8} className="text-forest" />
            </span>
            <h3 className="text-[18px] text-charcoal mb-2">{term}</h3>
            <p className="text-[13.5px] text-charcoal/65 leading-relaxed flex-1">{text}</p>
            <p className="mt-4 pt-3 border-t border-border text-[12.5px] text-charcoal/55 leading-relaxed">
              <span className="font-semibold text-olive">In this project: </span>{here}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-8 bg-white border border-border rounded-2xl shadow-card overflow-hidden">
        <div className="px-6 sm:px-8 py-6 border-b border-border">
          <div className="eyebrow mb-2">Correctness argument</div>
          <h3 className="text-[26px] text-charcoal">WHY DOES OUR SOLUTION WORK?</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="px-6 sm:px-8 py-7 lg:border-r border-border space-y-4 text-[14.5px] text-charcoal/70 leading-relaxed">
            <p>
              In the naive solution each philosopher picks up the left fork and then waits for the right one. If all five pick up
              their left fork at the same moment, each one holds a fork and waits for a fork held by the next philosopher.
              That cycle is a <strong className="text-charcoal">circular wait</strong>, and nobody can ever eat.
            </p>
            <p>
              Our solution never lets a philosopher hold just one fork. The forks are not picked up one at a time. Instead,
              <code className="font-mono text-[13px] bg-ivory px-1.5 py-0.5 rounded mx-1">test(i)</code>
              looks at <strong className="text-charcoal">both neighbours together</strong>, inside the critical section protected by
              <code className="font-mono text-[13px] bg-ivory px-1.5 py-0.5 rounded mx-1">mutex</code>.
              If neither neighbour is eating, philosopher <em>i</em> is given both forks in a single step by setting
              <code className="font-mono text-[13px] bg-ivory px-1.5 py-0.5 rounded mx-1">state[i] = EATING</code>.
              If either neighbour is eating, philosopher <em>i</em> gets nothing and waits on its own semaphore
              <code className="font-mono text-[13px] bg-ivory px-1.5 py-0.5 rounded mx-1">S[i]</code>.
            </p>
            <p>
              Because a waiting philosopher holds no forks, the hold-and-wait condition never occurs, so a circular wait
              cannot form. When an eating philosopher calls <code className="font-mono text-[13px] bg-ivory px-1.5 py-0.5 rounded">put_forks()</code>,
              it re-tests both neighbours and wakes any of them that can now eat. A hungry philosopher therefore waits only while
              a neighbour is actually eating, and every meal ends.
            </p>
          </div>

          <div className="px-6 sm:px-8 py-7">
            <ol className="space-y-4">
              {[
                ['Mutual exclusion on state[]', 'Every change to state[] happens between wait(mutex) and signal(mutex), so two philosophers never update it at the same time.'],
                ['Neighbours never eat together', 'test(i) sets EATING only when state[LEFT] and state[RIGHT] are both not EATING, and that check cannot be interrupted.'],
                ['No hold and wait', 'A philosopher holds either zero forks or two forks. It never holds one fork while waiting for another.'],
                ['No deadlock', 'Without hold and wait there is no circular wait. At least one philosopher can always make progress.'],
                ['Waiting philosophers are woken', 'put_forks() calls test() on both neighbours, so a philosopher blocked in wait(S[i]) is signalled as soon as both its forks are free.'],
              ].map(([t, d], n) => (
                <li key={t} className="flex gap-4">
                  <span className="mt-0.5 w-6 h-6 shrink-0 rounded-full bg-forest text-white text-xs font-semibold flex items-center justify-center">{n + 1}</span>
                  <div>
                    <div className="text-[14.5px] font-semibold text-charcoal flex items-center gap-1.5">
                      {t} {n === 3 && <CheckCircle2 size={15} className="text-forest" />}
                    </div>
                    <p className="text-[13.5px] text-charcoal/65 leading-relaxed mt-0.5">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="mx-6 sm:mx-8 mb-7 rounded-xl border border-amber-200 bg-hungry/50 px-5 py-4 flex gap-3">
          <AlertTriangle size={18} className="text-[#7A5410] shrink-0 mt-0.5" />
          <div className="text-[14px] text-[#5E430F] leading-relaxed">
            <strong>Starvation freedom is not guaranteed by this implementation.</strong> The solution prevents deadlock, but it
            does not promise that every philosopher eventually eats. If Philosopher 1 and Philosopher 3 keep taking turns so
            that at least one of them is always eating, Philosopher 2 never sees both forks free and can wait indefinitely.
            Fixing this needs an extra fairness rule, such as a queue of waiting philosophers or giving priority to whoever
            has waited longest.
          </div>
        </div>
      </div>
    </Section>
  );
}
