import Section from '../components/layout/Section';
import DiningTable from '../components/simulation/DiningTable';
import SimulationControls from '../components/simulation/SimulationControls';
import SemaphoreMonitor from '../components/simulation/SemaphoreMonitor';
import ExecutionLog from '../components/simulation/ExecutionLog';
import PhilosopherCards from '../components/simulation/PhilosopherCards';
import { CheckCircle2 } from 'lucide-react';

export default function LiveSimulation({ sim }) {
  const { state } = sim;

  return (
    <Section
      id="simulation"
      index={2}
      title="Live Simulation"
      subtitle="Five philosopher threads share five forks. Each one must hold both neighbouring forks to eat, and all access to the shared state goes through semaphores."
    >
      <div className="space-y-5">
        <SimulationControls
          running={sim.running}
          speed={sim.speed}
          maxRounds={state.maxRounds}
          completed={state.completed}
          tick={state.tick}
          onStart={sim.start}
          onPause={sim.pause}
          onReset={sim.reset}
          onStep={sim.stepForward}
          onSpeedChange={sim.setSpeed}
          onRoundsChange={sim.setMaxRounds}
        />

        {state.completed && (
          <div className="flex items-center gap-3 rounded-xl border border-[#B9D8BF] bg-eating/60 px-4 py-3 text-sm text-[#24583A]">
            <CheckCircle2 size={17} />
            All philosophers finished {state.maxRounds} rounds with no deadlock and no neighbours eating together.
            <a href="#statistics" className="ml-auto font-semibold underline-offset-2 hover:underline"
              onClick={(e) => { e.preventDefault(); document.getElementById('statistics')?.scrollIntoView({ behavior: 'smooth' }); }}>
              View results
            </a>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-5 items-start">
          <div className="space-y-5 min-w-0">
            <div className="bg-white border border-border rounded-2xl shadow-card p-4 sm:p-8">
              <DiningTable phiStates={state.phiStates} phases={state.phases} algPhil={state.algPhil}
                algLines={state.algLines} mutex={state.mutex} mutexHolder={state.mutexHolder} />
            </div>
            <div>
              <h3 className="text-lg text-charcoal mb-3">Philosopher Status</h3>
              <PhilosopherCards phiStates={state.phiStates} phases={state.phases} stats={state.stats} />
            </div>
          </div>

          <div className="space-y-5 xl:sticky xl:top-6">
            <SemaphoreMonitor state={state} />
            <ExecutionLog log={state.log} onClear={sim.clearLog} />
          </div>
        </div>
      </div>
    </Section>
  );
}
