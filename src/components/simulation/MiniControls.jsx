import { Play, Pause, StepForward, RotateCcw } from 'lucide-react';

// Compact controls so sections far from the table can still drive the simulation.
export default function MiniControls({ sim }) {
  const { running, state } = sim;
  return (
    <div className="flex items-center gap-1.5 rounded-xl border border-border bg-white p-1 shadow-card">
      {running ? (
        <button onClick={sim.pause} className="btn-control border-transparent py-1.5 text-[#7A5410] hover:bg-hungry/60"><Pause size={14} /> Pause</button>
      ) : (
        <button onClick={sim.start} className="btn-control border-transparent py-1.5 bg-forest text-white hover:bg-forest-dark"><Play size={14} /> {state.completed ? 'Restart' : 'Run'}</button>
      )}
      <button onClick={sim.stepForward} disabled={running || state.completed} className="btn-control border-transparent py-1.5 text-charcoal hover:bg-ivory disabled:opacity-40 disabled:cursor-not-allowed">
        <StepForward size={14} /> Step
      </button>
      <button onClick={sim.reset} className="btn-control border-transparent py-1.5 text-charcoal/70 hover:bg-ivory" aria-label="Reset simulation"><RotateCcw size={14} /></button>
      <span className="px-2 text-[11px] tabular-nums text-charcoal/45">tick {state.tick}</span>
    </div>
  );
}
