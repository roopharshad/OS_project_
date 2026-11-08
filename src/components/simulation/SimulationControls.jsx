import { Play, Pause, RotateCcw, StepForward, Gauge, Repeat } from 'lucide-react';
import { ROUND_OPTIONS } from '../../engine/simulationEngine';

const SPEEDS = [
  { id: 'slow', label: 'Slow' },
  { id: 'normal', label: 'Normal' },
  { id: 'fast', label: 'Fast' },
];

export default function SimulationControls({
  running, speed, maxRounds, completed, tick,
  onStart, onPause, onReset, onStep, onSpeedChange, onRoundsChange,
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-3 bg-white border border-border rounded-2xl px-4 py-3 shadow-card">
      <div className="flex items-center gap-2">
        {running ? (
          <button onClick={onPause} className="btn-control bg-hungry text-amber-900 border-amber-200 hover:bg-amber-100">
            <Pause size={14} /> Pause
          </button>
        ) : (
          <button onClick={onStart} className="btn-control bg-forest text-white border-forest hover:bg-forest-dark">
            <Play size={14} /> {completed ? 'Restart' : tick > 0 ? 'Resume' : 'Start'}
          </button>
        )}
        <button
          onClick={onStep}
          disabled={running || completed}
          className="btn-control bg-white text-charcoal border-border hover:bg-ivory disabled:opacity-40 disabled:cursor-not-allowed"
          title="Execute the next algorithm event"
        >
          <StepForward size={14} /> Step Forward
        </button>
        <button onClick={onReset} className="btn-control bg-white text-charcoal border-border hover:bg-ivory">
          <RotateCcw size={14} /> Reset
        </button>
      </div>

      <div className="hidden md:block w-px h-6 bg-border" />

      <div className="flex items-center gap-2">
        <Gauge size={14} className="text-olive" />
        <span className="text-xs font-medium text-charcoal/60">Speed</span>
        <div className="flex bg-ivory border border-border rounded-lg p-0.5">
          {SPEEDS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => onSpeedChange(id)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                speed === id ? 'bg-white text-forest shadow-card' : 'text-charcoal/60 hover:text-charcoal'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Repeat size={14} className="text-olive" />
        <label htmlFor="max-rounds" className="text-xs font-medium text-charcoal/60">Max rounds</label>
        <select
          id="max-rounds"
          value={Number.isFinite(maxRounds) ? String(maxRounds) : 'inf'}
          onChange={(e) => onRoundsChange(e.target.value === 'inf' ? Infinity : Number(e.target.value))}
          className="bg-ivory border border-border rounded-lg px-2 py-1 text-xs font-medium text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/30"
        >
          {ROUND_OPTIONS.map((r) => (
            <option key={String(r)} value={Number.isFinite(r) ? String(r) : 'inf'}>
              {Number.isFinite(r) ? `${r} per philosopher` : 'Unlimited'}
            </option>
          ))}
        </select>
      </div>

      <div className="ml-auto flex items-center gap-2 text-xs text-charcoal/50">
        <span className={`w-2 h-2 rounded-full ${running ? 'bg-forest animate-pulse' : completed ? 'bg-olive' : 'bg-border'}`} />
        <span className="font-medium">{running ? 'Running' : completed ? 'Completed' : tick > 0 ? 'Paused' : 'Ready'}</span>
        <span className="tabular-nums text-charcoal/40">· tick {tick}</span>
      </div>
    </div>
  );
}
