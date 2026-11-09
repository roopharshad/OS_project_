import { CheckCircle2 } from 'lucide-react';
import DiningTable from '../components/simulation/DiningTable';
import SimulationControls from '../components/simulation/SimulationControls';
import SemaphoreMonitor from '../components/simulation/SemaphoreMonitor';
import ExecutionLog from '../components/simulation/ExecutionLog';
import PhilosopherCards from '../components/simulation/PhilosopherCards';

// On screens 1280px and wider this section is one fixed frame (100% of the
// window height): table, controls, monitor, log and status cards are all
// visible at once and the page does not need to scroll. Only the log scrolls
// inside its own box. On smaller screens the panels stack and the page scrolls.
export default function LiveSimulation({ sim }) {
  const { state } = sim;
  const table = (
    <DiningTable phiStates={state.phiStates} phases={state.phases} algPhil={state.algPhil}
      algLines={state.algLines} mutex={state.mutex} mutexHolder={state.mutexHolder}
      className="block h-full w-full max-w-full max-h-full mx-auto select-none" />
  );

  return (
    <section id="simulation" data-section
      className="scroll-mt-0 border-t border-border px-4 sm:px-6 py-4 xl:h-screen xl:min-h-[700px] xl:flex xl:flex-col xl:overflow-hidden">
      <div className="max-w-[1500px] w-full mx-auto flex flex-col gap-3 xl:h-full xl:min-h-0">
        {/* Header row */}
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1 shrink-0">
          <div>
            <div className="eyebrow">Section 02</div>
            <h2 className="text-[26px] leading-tight text-charcoal">Live Simulation</h2>
          </div>
          <p className="text-[13px] text-charcoal/55 max-w-xl xl:text-right">
            Five philosopher threads share five forks. Each must hold both neighbouring forks to eat,
            and every change to the shared state goes through semaphores.
          </p>
        </div>

        <div className="shrink-0">
          <SimulationControls
            running={sim.running} speed={sim.speed} maxRounds={state.maxRounds}
            completed={state.completed} tick={state.tick}
            onStart={sim.start} onPause={sim.pause} onReset={sim.reset} onStep={sim.stepForward}
            onSpeedChange={sim.setSpeed} onRoundsChange={sim.setMaxRounds}
          />
        </div>

        {state.completed && (
          <div className="shrink-0 flex items-center gap-3 rounded-xl border border-[#B9D8BF] bg-eating/60 px-4 py-2 text-sm text-[#24583A]">
            <CheckCircle2 size={16} />
            All philosophers finished {state.maxRounds} rounds with no deadlock and no neighbours eating together.
          </div>
        )}

        {/* Main frame */}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-3 xl:flex-1 xl:min-h-0">
          <div className="flex flex-col gap-3 min-w-0 xl:min-h-0">
            <div className="bg-white border border-border rounded-2xl shadow-card p-3 aspect-square xl:aspect-auto xl:flex-1 xl:min-h-0 flex items-center justify-center overflow-hidden">
              {table}
            </div>
            <div className="shrink-0 hidden xl:block">
              <PhilosopherCards compact phiStates={state.phiStates} phases={state.phases} stats={state.stats} />
            </div>
            <div className="xl:hidden">
              <h3 className="text-lg text-charcoal mb-3">Philosopher Status</h3>
              <PhilosopherCards phiStates={state.phiStates} phases={state.phases} stats={state.stats} />
            </div>
          </div>

          <div className="flex flex-col gap-3 min-w-0 xl:min-h-0">
            <div className="shrink-0">
              <SemaphoreMonitor compact state={state} />
            </div>
            <ExecutionLog log={state.log} onClear={sim.clearLog}
              className="xl:flex-1 xl:min-h-[140px]" height="h-[300px] xl:h-auto xl:flex-1 xl:min-h-0" />
          </div>
        </div>
      </div>
    </section>
  );
}
