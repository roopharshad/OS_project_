// Headless check of the simulation engine: run many simulations and assert
// safety (no adjacent eaters), semaphore bounds, and termination (no deadlock).
// In sequential mode, also assert that only one philosopher is active at a time.
import { createInitialState, step, violatesSafety, forkView, PHASE, N } from '../src/engine/simulationEngine.js';

const CS = ['TF_SET_HUNGRY', 'TF_TEST', 'TF_SIG_MUTEX', 'PF_SET_THINKING', 'PF_TEST_LEFT', 'PF_TEST_RIGHT', 'PF_SIG_MUTEX'];
let runs = 0;
let concurrentMaxEating = 0;

for (const mode of ['sequential', 'concurrent']) {
  for (const rounds of [1, 3, 5, 10]) {
    for (let r = 0; r < 200; r++) {
      let s = createInitialState(rounds, mode);
      let ticks = 0;
      while (!s.completed) {
        s = step(s);
        ticks++;
        if (violatesSafety(s.phiStates)) throw new Error(`[${mode}] adjacent philosophers eating at tick ${ticks}`);
        // Sync: forks shown in hand only after sem_wait(S[i]) passed, and never shared.
        const fv = forkView(s.phiStates, s.phases);
        for (let i = 0; i < N; i++) {
          const holding = fv.owner[(i + N - 1) % N] === i && fv.owner[i] === i;
          const shouldHold = ['EATING', 'PF_WAIT_MUTEX', 'PF_SET_THINKING'].includes(s.phases[i]);
          if (holding !== shouldHold) throw new Error(`[${mode}] fork view out of sync for P${i + 1} at tick ${ticks}`);
          if (holding && s.S[i] !== 0) throw new Error(`[${mode}] P${i + 1} holds forks but S[${i}] = ${s.S[i]}`);
          if (s.phases[i] === 'TF_WAIT_S' && s.phiStates[i] === 'EATING' && s.S[i] !== 1) throw new Error(`[${mode}] P${i + 1} granted but S[${i}] = ${s.S[i]}`);
        }
        if (s.mutex < 0 || s.mutex > 1) throw new Error(`[${mode}] mutex out of range: ${s.mutex}`);
        if (s.S.some((v) => v < 0 || v > 1)) throw new Error(`[${mode}] S out of range: ${s.S}`);
        if (s.phases.filter((p) => CS.includes(p)).length > 1) throw new Error(`[${mode}] two philosophers in the critical section at tick ${ticks}`);
        if (mode === 'sequential') {
          const active = s.phases.filter((p) => p !== PHASE.THINKING && p !== PHASE.DONE).length;
          if (active > 1) throw new Error(`[sequential] ${active} philosophers active at tick ${ticks}: ${s.phases}`);
        }
        if (ticks > 50000) throw new Error(`[${mode}] did not terminate (possible deadlock)`);
      }
      if (s.stats.mealsDone.some((m) => m !== rounds)) throw new Error(`[${mode}] wrong meal counts ${s.stats.mealsDone}`);
      if (s.mutex !== 1) throw new Error(`[${mode}] mutex not released at the end`);
      if (mode === 'sequential' && s.stats.maxEating !== 1) throw new Error(`[sequential] maxEating = ${s.stats.maxEating}`);
      if (mode === 'concurrent') concurrentMaxEating = Math.max(concurrentMaxEating, s.stats.maxEating);
      runs++;
    }
  }
}
console.log(`OK: ${runs} simulations, N=${N}, both modes, no safety violations, all terminated.`);
console.log(`Sequential mode: exactly one philosopher active at a time. Concurrent mode max eating together: ${concurrentMaxEating}.`);
