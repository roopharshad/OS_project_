// ─── Dining Philosophers Simulation Engine ───────────────────────────────────
// Pure JavaScript (no React). Each call to step() advances the system by one
// discrete scheduling tick. The engine follows the classic semaphore solution:
//
//   take_forks(i): wait(mutex); state[i]=HUNGRY; test(i); signal(mutex); wait(S[i])
//   test(i):       if state[i]==HUNGRY && state[L]!=EATING && state[R]!=EATING
//                      { state[i]=EATING; signal(S[i]) }
//   put_forks(i):  wait(mutex); state[i]=THINKING; test(L); test(R); signal(mutex)
//
// Every philosopher is a small state machine whose "phase" is the next
// algorithm line it will execute. At most one line runs per tick, so only one
// philosopher ever acts at a time and the semaphore values shown in the UI
// always match the algorithm exactly.
//
// Two scheduling modes:
//   'sequential' – a philosopher may only start take_forks() when nobody else
//                  is hungry or eating. Exactly one philosopher is active at
//                  the table, which is the easiest way to explain the steps.
//   'concurrent' – philosophers get hungry independently, so you can see a
//                  philosopher blocked because a neighbour is eating, and two
//                  non-neighbours eating at the same time.

export const N = 5;

export const PHI_STATE = {
  THINKING: 'THINKING',
  HUNGRY: 'HUNGRY',
  EATING: 'EATING',
};

export const PHASE = {
  THINKING: 'THINKING',
  TF_WAIT_MUTEX: 'TF_WAIT_MUTEX',
  TF_SET_HUNGRY: 'TF_SET_HUNGRY',
  TF_TEST: 'TF_TEST',
  TF_SIG_MUTEX: 'TF_SIG_MUTEX',
  TF_WAIT_S: 'TF_WAIT_S',
  EATING: 'EATING',
  PF_WAIT_MUTEX: 'PF_WAIT_MUTEX',
  PF_SET_THINKING: 'PF_SET_THINKING',
  PF_TEST_LEFT: 'PF_TEST_LEFT',
  PF_TEST_RIGHT: 'PF_TEST_RIGHT',
  PF_SIG_MUTEX: 'PF_SIG_MUTEX',
  DONE: 'DONE',
};

// Keys of pseudocode lines (used for highlighting)
export const ALG = {
  TF_WAIT_MUTEX: 'TF_WAIT_MUTEX',
  TF_SET_HUNGRY: 'TF_SET_HUNGRY',
  TF_TEST: 'TF_TEST',
  TF_SIG_MUTEX: 'TF_SIG_MUTEX',
  TF_WAIT_S: 'TF_WAIT_S',
  TEST_IF: 'TEST_IF',
  TEST_SET_EATING: 'TEST_SET_EATING',
  TEST_SIG_S: 'TEST_SIG_S',
  PF_WAIT_MUTEX: 'PF_WAIT_MUTEX',
  PF_SET_THINKING: 'PF_SET_THINKING',
  PF_TEST_LEFT: 'PF_TEST_LEFT',
  PF_TEST_RIGHT: 'PF_TEST_RIGHT',
  PF_SIG_MUTEX: 'PF_SIG_MUTEX',
};

export const MODES = {
  sequential: { label: 'One at a time', hint: 'Only one philosopher is active at the table.' },
  concurrent: { label: 'Concurrent', hint: 'Philosophers get hungry independently and may have to wait.' },
};

export const ROUND_OPTIONS = [1, 2, 3, 5, 10, Infinity];
export const DEFAULT_ROUNDS = 3;
export const DEFAULT_MODE = 'sequential';
export const MAX_LOG = 300;

export const LEFT = (i) => (i + N - 1) % N;
export const RIGHT = (i) => (i + 1) % N;

// Fork j lies between philosopher j and philosopher j+1.
// Philosopher i therefore uses fork LEFT(i) (left) and fork i (right).
export const leftForkOf = (i) => LEFT(i);
export const rightForkOf = (i) => i;

const IN_ALGORITHM = new Set([
  PHASE.TF_WAIT_MUTEX, PHASE.TF_SET_HUNGRY, PHASE.TF_TEST, PHASE.TF_SIG_MUTEX, PHASE.TF_WAIT_S,
  PHASE.PF_WAIT_MUTEX, PHASE.PF_SET_THINKING, PHASE.PF_TEST_LEFT, PHASE.PF_TEST_RIGHT, PHASE.PF_SIG_MUTEX,
]);

export const isTakeForksPhase = (p) => typeof p === 'string' && p.startsWith('TF_');
export const isPutForksPhase = (p) => typeof p === 'string' && p.startsWith('PF_');

const randInt = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

let nextId = 0;
const timestamp = () => new Date().toLocaleTimeString('en-GB', { hour12: false });

// ─── State ───────────────────────────────────────────────────────────────────
export function createInitialState(maxRounds = DEFAULT_ROUNDS, mode = DEFAULT_MODE) {
  return {
    phiStates: Array(N).fill(PHI_STATE.THINKING),
    phases: Array(N).fill(PHASE.THINKING),
    thinkTimers: [2, 4, 3, 5, 4],
    eatTimers: Array(N).fill(0),
    mutex: 1,
    mutexHolder: null,
    S: Array(N).fill(0),
    log: [],
    semHistory: [],
    algLines: [],
    algPhil: null,
    testTarget: null,
    testResult: null,
    tick: 0,
    schedIdx: 0,
    maxRounds,
    mode,
    eventful: false,
    completed: false,
    stats: {
      eatCount: Array(N).fill(0),     // meals started
      mealsDone: Array(N).fill(0),    // meals finished (forks released)
      hungryCount: Array(N).fill(0),
      thinkCount: Array(N).fill(0),
      waitTicks: Array(N).fill(0),    // ticks spent HUNGRY
      waitMs: Array(N).fill(0),       // wall-clock milliseconds spent HUNGRY
      totalEat: 0,
      totalHungry: 0,
      totalThink: 0,
      maxEating: 0,
      semOpCount: 0,
      rounds: 0,
    },
  };
}

// Copy everything mutable so step() can work on a draft without touching input.
function draft(s) {
  return {
    ...s,
    phiStates: [...s.phiStates],
    phases: [...s.phases],
    thinkTimers: [...s.thinkTimers],
    eatTimers: [...s.eatTimers],
    S: [...s.S],
    log: [...s.log],
    semHistory: [...s.semHistory],
    algLines: [],
    testTarget: null,
    testResult: null,
    stats: {
      ...s.stats,
      eatCount: [...s.stats.eatCount],
      mealsDone: [...s.stats.mealsDone],
      hungryCount: [...s.stats.hungryCount],
      thinkCount: [...s.stats.thinkCount],
      waitTicks: [...s.stats.waitTicks],
      waitMs: [...s.stats.waitMs],
    },
  };
}

function log(d, phil, message, type) {
  d.log.push({ id: ++nextId, tick: d.tick, phil, message, type, time: timestamp() });
}

function semOp(d, phil, op, target, value) {
  d.stats.semOpCount += 1;
  d.semHistory.push({ id: ++nextId, phil, op, target, value, tick: d.tick });
  if (d.semHistory.length > 8) d.semHistory.shift();
}

// test(k) — called with mutex held, by philosopher `caller`
function test(d, k, caller) {
  const L = LEFT(k), R = RIGHT(k);
  d.algLines.push(ALG.TEST_IF);
  d.testTarget = k;
  const ok =
    d.phiStates[k] === PHI_STATE.HUNGRY &&
    d.phiStates[L] !== PHI_STATE.EATING &&
    d.phiStates[R] !== PHI_STATE.EATING;

  if (ok) {
    d.phiStates[k] = PHI_STATE.EATING;
    d.S[k] += 1;
    semOp(d, caller, 'sem_post', `S[${k}]`, d.S[k]);
    d.algLines.push(ALG.TEST_SET_EATING, ALG.TEST_SIG_S);
    log(d, k, `test(${k}): neighbours P${L + 1} and P${R + 1} are not eating, so Philosopher ${k + 1} is granted forks F${L} and F${k}`, 'success');
    log(d, caller, `sem_post(S[${k}]): S[${k}] = ${d.S[k]}, Philosopher ${k + 1} is allowed to eat`, 'semaphore');
  } else if (d.phiStates[k] === PHI_STATE.HUNGRY) {
    const eating = [L, R].filter((j) => d.phiStates[j] === PHI_STATE.EATING).map((j) => `P${j + 1}`);
    log(d, k, `test(${k}): ${eating.join(' and ')} ${eating.length > 1 ? 'are' : 'is'} eating, so Philosopher ${k + 1} must wait`, 'warning');
  } else if (caller !== k) {
    log(d, caller, `test(${k}): Philosopher ${k + 1} is not hungry, nothing to do`, 'info');
  }
  d.testResult = ok;
  return ok;
}

function eatingCount(d) {
  return d.phiStates.filter((s) => s === PHI_STATE.EATING).length;
}

// Execute one algorithm line for philosopher i. Returns false if blocked.
function advance(d, i) {
  const L = LEFT(i);
  switch (d.phases[i]) {
    // ── take_forks(i) ──
    case PHASE.TF_WAIT_MUTEX:
      if (d.mutex <= 0) return false;
      d.mutex = 0;
      d.mutexHolder = i;
      semOp(d, i, 'sem_wait', 'mutex', 0);
      d.algLines = [ALG.TF_WAIT_MUTEX];
      log(d, i, `sem_wait(mutex): Philosopher ${i + 1} locks the mutex and enters the critical section`, 'semaphore');
      d.phases[i] = PHASE.TF_SET_HUNGRY;
      return true;

    case PHASE.TF_SET_HUNGRY:
      d.phiStates[i] = PHI_STATE.HUNGRY;
      d.stats.hungryCount[i] += 1;
      d.stats.totalHungry += 1;
      d.algLines = [ALG.TF_SET_HUNGRY];
      log(d, i, `Philosopher ${i + 1} becomes HUNGRY (state[${i}] = HUNGRY)`, 'hungry');
      d.phases[i] = PHASE.TF_TEST;
      return true;

    case PHASE.TF_TEST:
      d.algLines = [ALG.TF_TEST];
      test(d, i, i);
      d.phases[i] = PHASE.TF_SIG_MUTEX;
      return true;

    case PHASE.TF_SIG_MUTEX:
      d.mutex = 1;
      d.mutexHolder = null;
      semOp(d, i, 'sem_post', 'mutex', 1);
      d.algLines = [ALG.TF_SIG_MUTEX];
      log(d, i, `sem_post(mutex): Philosopher ${i + 1} unlocks the mutex and leaves the critical section`, 'semaphore');
      d.phases[i] = PHASE.TF_WAIT_S;
      if (d.S[i] === 0) log(d, i, `sem_wait(S[${i}]): S[${i}] = 0, so Philosopher ${i + 1} is blocked until a neighbour signals it`, 'warning');
      return true;

    case PHASE.TF_WAIT_S:
      if (d.S[i] <= 0) return false; // blocked until a neighbour signals S[i]
      d.S[i] -= 1;
      semOp(d, i, 'sem_wait', `S[${i}]`, d.S[i]);
      d.algLines = [ALG.TF_WAIT_S];
      d.eatTimers[i] = randInt(3, 4);
      d.stats.eatCount[i] += 1;
      d.stats.totalEat += 1;
      d.stats.maxEating = Math.max(d.stats.maxEating, eatingCount(d));
      log(d, i, `sem_wait(S[${i}]) returns (S[${i}] = 0): Philosopher ${i + 1} picks up forks F${L} and F${i} and starts EATING`, 'eating');
      d.phases[i] = PHASE.EATING;
      return true;

    // ── put_forks(i) ──
    case PHASE.PF_WAIT_MUTEX:
      if (d.mutex <= 0) return false;
      d.mutex = 0;
      d.mutexHolder = i;
      semOp(d, i, 'sem_wait', 'mutex', 0);
      d.algLines = [ALG.PF_WAIT_MUTEX];
      log(d, i, `sem_wait(mutex): Philosopher ${i + 1} locks the mutex and enters the critical section`, 'semaphore');
      d.phases[i] = PHASE.PF_SET_THINKING;
      return true;

    case PHASE.PF_SET_THINKING:
      d.phiStates[i] = PHI_STATE.THINKING;
      d.stats.mealsDone[i] += 1;
      d.stats.thinkCount[i] += 1;
      d.stats.totalThink += 1;
      d.stats.rounds = Math.min(...d.stats.mealsDone);
      d.algLines = [ALG.PF_SET_THINKING];
      log(d, i, `Philosopher ${i + 1} puts down forks F${L} and F${i} and starts THINKING`, 'info');
      d.phases[i] = PHASE.PF_TEST_LEFT;
      return true;

    case PHASE.PF_TEST_LEFT:
      d.algLines = [ALG.PF_TEST_LEFT];
      test(d, LEFT(i), i);
      d.phases[i] = PHASE.PF_TEST_RIGHT;
      return true;

    case PHASE.PF_TEST_RIGHT:
      d.algLines = [ALG.PF_TEST_RIGHT];
      test(d, RIGHT(i), i);
      d.phases[i] = PHASE.PF_SIG_MUTEX;
      return true;

    case PHASE.PF_SIG_MUTEX:
      d.mutex = 1;
      d.mutexHolder = null;
      semOp(d, i, 'sem_post', 'mutex', 1);
      d.algLines = [ALG.PF_SIG_MUTEX];
      log(d, i, `sem_post(mutex): Philosopher ${i + 1} unlocks the mutex and leaves the critical section`, 'semaphore');
      if (d.stats.mealsDone[i] >= d.maxRounds) {
        d.phases[i] = PHASE.DONE;
        log(d, i, `Philosopher ${i + 1} has finished all ${d.maxRounds} rounds`, 'info');
      } else {
        d.phases[i] = PHASE.THINKING;
        d.thinkTimers[i] = randInt(2, 4);
      }
      return true;

    default:
      return false;
  }
}

function finalize(d, lastIdBefore) {
  if (!d.completed && d.phases.every((p) => p === PHASE.DONE)) {
    d.completed = true;
    d.algLines = [];
    d.algPhil = null;
    log(d, null, `Simulation complete: every philosopher ate ${d.maxRounds} time${d.maxRounds === 1 ? '' : 's'} without deadlock`, 'success');
  }
  if (d.log.length > MAX_LOG) d.log = d.log.slice(-MAX_LOG);
  const lastId = d.log.length ? d.log[d.log.length - 1].id : -1;
  d.eventful = lastId !== lastIdBefore;
  return d;
}

// Which philosopher should start take_forks() next in sequential mode:
// fewest meals first, then round-robin order after the last one that ate.
function pickNext(d, candidates) {
  return [...candidates].sort((a, b) => {
    const m = d.stats.mealsDone[a] - d.stats.mealsDone[b];
    if (m !== 0) return m;
    return ((a - d.schedIdx + N) % N) - ((b - d.schedIdx + N) % N);
  })[0];
}

// ─── Public API ──────────────────────────────────────────────────────────────

// Advance the simulation by exactly one tick. `dtMs` is the wall-clock length
// of the tick, used only for the waiting-time statistic.
export function step(state, dtMs = 1000) {
  if (state.completed) return state;
  const lastIdBefore = state.log.length ? state.log[state.log.length - 1].id : -1;
  const d = draft(state);
  d.tick += 1;

  for (let i = 0; i < N; i++) {
    if (d.phiStates[i] === PHI_STATE.HUNGRY) {
      d.stats.waitTicks[i] += 1;
      d.stats.waitMs[i] += dtMs;
    }
  }

  // 1) Run one algorithm line for the next runnable philosopher (round-robin).
  for (let a = 0; a < N; a++) {
    const i = (d.schedIdx + a) % N;
    if (IN_ALGORITHM.has(d.phases[i]) && advance(d, i)) {
      d.algPhil = i;
      d.schedIdx = (i + 1) % N;
      return finalize(d, lastIdBefore);
    }
  }

  // 2) Nobody can execute an algorithm line: let thinking/eating time pass.
  d.algPhil = null;
  const sequential = d.mode === 'sequential';
  const busy = d.phases.some((p) => p !== PHASE.THINKING && p !== PHASE.DONE);

  for (let i = 0; i < N; i++) {
    if (d.phases[i] === PHASE.EATING) {
      if (d.eatTimers[i] > 0) d.eatTimers[i] -= 1;
      if (d.eatTimers[i] === 0) {
        d.phases[i] = PHASE.PF_WAIT_MUTEX;
        log(d, i, `Philosopher ${i + 1} finished eating and calls put_forks(${i})`, 'info');
      }
    } else if (d.phases[i] === PHASE.THINKING && !(sequential && busy)) {
      if (d.thinkTimers[i] > 0) d.thinkTimers[i] -= 1;
    }
  }

  const ready = [];
  for (let i = 0; i < N; i++) {
    if (state.phases[i] === PHASE.THINKING && d.phases[i] === PHASE.THINKING && d.thinkTimers[i] === 0) {
      if (d.stats.mealsDone[i] >= d.maxRounds) d.phases[i] = PHASE.DONE;
      else ready.push(i);
    }
  }

  const starters = sequential ? (busy || !ready.length ? [] : [pickNext(d, ready)]) : ready;
  for (const i of starters) {
    d.phases[i] = PHASE.TF_WAIT_MUTEX;
    log(d, i, `Philosopher ${i + 1} stops thinking and calls take_forks(${i})`, 'info');
  }
  if (sequential && starters.length) d.schedIdx = starters[0];

  return finalize(d, lastIdBefore);
}

// Advance until something observable happens (a new log entry), used by STEP.
export function stepToNextEvent(state, dtMs = 1000, limit = 200) {
  let s = state;
  for (let k = 0; k < limit && !s.completed; k++) {
    s = step(s, dtMs);
    if (s.eventful) break;
  }
  return s;
}

// Change MAX ROUNDS without resetting. Philosophers that retired early can resume.
export function setMaxRounds(state, maxRounds) {
  const d = draft(state);
  d.algLines = state.algLines;
  d.testTarget = state.testTarget;
  d.testResult = state.testResult;
  d.maxRounds = maxRounds;
  for (let i = 0; i < N; i++) {
    if (d.phases[i] === PHASE.DONE && d.stats.mealsDone[i] < maxRounds) {
      d.phases[i] = PHASE.THINKING;
      d.thinkTimers[i] = randInt(1, 3);
    }
  }
  if (d.phases.some((p) => p !== PHASE.DONE)) d.completed = false;
  const lastId = d.log.length ? d.log[d.log.length - 1].id : -1;
  return finalize(d, lastId);
}

export function setMode(state, mode) {
  return { ...state, mode };
}

// Single source of truth for where the forks are, shared by the table, the
// status cards and the monitor so they always agree with the semaphores:
//   reserved – test(i) set state[i] = EATING and did sem_post(S[i]), but the
//              philosopher has not passed sem_wait(S[i]) yet. Forks stay on the table.
//   held     – sem_wait(S[i]) returned. Forks are in the philosopher's hands
//              until put_forks() sets state[i] = THINKING.
const HOLDING_PHASES = new Set([PHASE.EATING, PHASE.PF_WAIT_MUTEX, PHASE.PF_SET_THINKING]);

// Text of the line just executed, shared by the monitor and the table.
export const ALG_TEXT = {
  [ALG.TF_WAIT_MUTEX]: 'take_forks → sem_wait(mutex)',
  [ALG.TF_SET_HUNGRY]: 'take_forks → state[i] = HUNGRY',
  [ALG.TF_TEST]: 'take_forks → test(i)',
  [ALG.TF_SIG_MUTEX]: 'take_forks → sem_post(mutex)',
  [ALG.TF_WAIT_S]: 'take_forks → sem_wait(S[i])',
  [ALG.PF_WAIT_MUTEX]: 'put_forks → sem_wait(mutex)',
  [ALG.PF_SET_THINKING]: 'put_forks → state[i] = THINKING',
  [ALG.PF_TEST_LEFT]: 'put_forks → test(LEFT)',
  [ALG.PF_TEST_RIGHT]: 'put_forks → test(RIGHT)',
  [ALG.PF_SIG_MUTEX]: 'put_forks → sem_post(mutex)',
};

export const currentLine = (algLines) => algLines.find((k) => ALG_TEXT[k]) || null;

// What the table and cards show for philosopher i. EATING (green) only while
// the forks are actually in hand, so colour and fork position always change together.
// GRANTED = test() set state[i] = EATING and signalled S[i], forks not picked up yet.
export const SHOWN = { THINKING: 'THINKING', HUNGRY: 'HUNGRY', GRANTED: 'GRANTED', EATING: 'EATING' };
export function shownState(phiStates, phases, i) {
  if (holdsForks(phiStates, phases, i)) return SHOWN.EATING;
  if (phiStates[i] === PHI_STATE.EATING) return SHOWN.GRANTED;
  return phiStates[i];
}

export function holdsForks(phiStates, phases, i) {
  return phases ? HOLDING_PHASES.has(phases[i]) : phiStates[i] === PHI_STATE.EATING;
}

export function forkView(phiStates, phases) {
  const owner = Array(N).fill(null);
  const reserved = Array(N).fill(null);
  for (let i = 0; i < N; i++) {
    if (holdsForks(phiStates, phases, i)) {
      owner[leftForkOf(i)] = i;
      owner[rightForkOf(i)] = i;
    } else if (phiStates[i] === PHI_STATE.EATING) {
      reserved[leftForkOf(i)] = i;
      reserved[rightForkOf(i)] = i;
    }
  }
  return { owner, reserved };
}

// Which philosopher has been granted each fork by test() (held or reserved).
export function forkOwners(phiStates) {
  const owner = Array(N).fill(null);
  for (let i = 0; i < N; i++) {
    if (phiStates[i] === PHI_STATE.EATING) {
      owner[leftForkOf(i)] = i;
      owner[rightForkOf(i)] = i;
    }
  }
  return owner;
}

// Safety check used by the verification script.
export function violatesSafety(phiStates) {
  for (let i = 0; i < N; i++) {
    if (phiStates[i] === PHI_STATE.EATING && phiStates[RIGHT(i)] === PHI_STATE.EATING) return true;
  }
  return false;
}
