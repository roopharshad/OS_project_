import { useEffect, useReducer, useState } from 'react';
import {
  createInitialState, step, stepToNextEvent, setMaxRounds, setMode, DEFAULT_ROUNDS, DEFAULT_MODE,
} from '../engine/simulationEngine';

// `event` = how long each logged step stays on screen before the next one.
// `idle`  = length of a tick where only thinking/eating time passes.
export const SPEEDS = {
  slow: { label: 'Slow', event: 3200, idle: 900 },
  normal: { label: 'Normal', event: 2000, idle: 600 },
  fast: { label: 'Fast', event: 900, idle: 300 },
};

function reducer(state, action) {
  switch (action.type) {
    case 'TICK': return step(state, action.dt);
    case 'STEP': return stepToNextEvent(state, action.dt);
    case 'RESET': return createInitialState(state.maxRounds, state.mode);
    case 'CLEAR_LOG': return { ...state, log: [] };
    case 'SET_ROUNDS': return setMaxRounds(state, action.value);
    case 'SET_MODE': return setMode(state, action.value);
    default: return state;
  }
}

export function useSimulation() {
  const [state, dispatch] = useReducer(reducer, undefined, () => createInitialState(DEFAULT_ROUNDS, DEFAULT_MODE));
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState('normal');

  // One tick at a time: wait longer after a tick that produced a log entry,
  // so every step can be read and explained.
  useEffect(() => {
    if (!running || state.completed) return undefined;
    const delay = state.eventful ? SPEEDS[speed].event : SPEEDS[speed].idle;
    const id = setTimeout(() => dispatch({ type: 'TICK', dt: delay }), delay);
    return () => clearTimeout(id);
  }, [running, speed, state]);

  useEffect(() => {
    if (state.completed && running) setRunning(false);
  }, [state.completed, running]);

  return {
    state,
    running,
    speed,
    setSpeed,
    start: () => {
      if (state.completed) dispatch({ type: 'RESET' });
      setRunning(true);
    },
    pause: () => setRunning(false),
    reset: () => { setRunning(false); dispatch({ type: 'RESET' }); },
    stepForward: () => { if (!running) dispatch({ type: 'STEP', dt: SPEEDS[speed].event }); },
    clearLog: () => dispatch({ type: 'CLEAR_LOG' }),
    setMaxRounds: (value) => dispatch({ type: 'SET_ROUNDS', value }),
    setMode: (value) => dispatch({ type: 'SET_MODE', value }),
  };
}
