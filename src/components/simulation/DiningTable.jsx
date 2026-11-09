import { motion } from 'framer-motion';
import { PHI_STATE, N, forkView, leftForkOf, shownState, SHOWN, ALG_TEXT, currentLine } from '../../engine/simulationEngine';

// ─── Geometry ────────────────────────────────────────────────────────────────
const SIZE = 800;
const C = SIZE / 2;
const TABLE_R = 172;
const PERSON_R = 250;
const PLATE_R = 118;
const FORK_REST_R = 132;
const FORK_HELD_R = 122;
const SEAT_R = 44;          // radius of a philosopher's seat circle
const LABEL_W = 96, LABEL_H = 38;

const deg = (i) => -90 + i * (360 / N);              // philosopher i angle (0 = top)
const forkDeg = (j) => deg(j) + 180 / N;              // fork j sits between P(j) and P(j+1)
const polar = (r, d) => ({ x: C + r * Math.cos((d * Math.PI) / 180), y: C + r * Math.sin((d * Math.PI) / 180) });

const PALETTE = {
  [PHI_STATE.THINKING]: { fill: '#DCEAF4', stroke: '#9DBFD9', text: '#2F5E80', label: 'Thinking' },
  [PHI_STATE.HUNGRY]: { fill: '#F7E5B7', stroke: '#DDB65A', text: '#7A5410', label: 'Hungry' },
  [PHI_STATE.EATING]: { fill: '#D7E9D9', stroke: '#7DB487', text: '#24583A', label: 'Eating' },
  [SHOWN.GRANTED]: { fill: '#F7E5B7', stroke: '#7DB487', text: '#7A5410', label: 'Granted' },
};

const ROBES = ['#6F7D8C', '#8C6F5E', '#5E7A6B', '#7C6E8A', '#8A7F5E'];

// Fork drawn pointing "up" (tines at -y) centred near the origin.
function ForkShape({ color }) {
  return (
    <g fill={color}>
      <rect x="-1.6" y="2" width="3.2" height="22" rx="1.6" />
      <path d="M-6 -6 Q-6 4 0 5 Q6 4 6 -6 L4.6 -6 L4.6 -1 L3 -1 L3 -14 L1.6 -14 L1.6 -1 L-1.6 -1 L-1.6 -14 L-3 -14 L-3 -1 L-4.6 -1 L-4.6 -6 Z" />
      <rect x="-6" y="-16" width="1.4" height="11" rx="0.7" />
      <rect x="4.6" y="-16" width="1.4" height="11" rx="0.7" />
    </g>
  );
}

function Fork({ j, owner, reservedBy }) {
  const held = owner !== null;
  const reserved = !held && reservedBy !== null;
  let d = forkDeg(j);
  let r = FORK_REST_R;
  if (held) {
    // Slide next to the eater's plate, on the side the fork comes from.
    const isLeftForkOfOwner = leftForkOf(owner) === j;
    d = deg(owner) + (isLeftForkOfOwner ? -21 : 21);
    r = FORK_HELD_R;
  }
  const p = polar(r, d);
  return (
    <motion.g
      initial={false}
      animate={{ x: p.x, y: p.y, rotate: d - 90 }}
      transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
    >
      {held && <circle r="20" fill="#315C46" opacity="0.12" />}
      {reserved && <circle r="18" fill="none" stroke="#D99A22" strokeWidth="1.6" strokeDasharray="3 3" />}
      <ForkShape color={held ? '#315C46' : reserved ? '#B8862A' : '#A39E8C'} />
    </motion.g>
  );
}

function Plate({ i, eating }) {
  const p = polar(PLATE_R, deg(i));
  return (
    <g transform={`translate(${p.x} ${p.y})`}>
      <circle r="27" fill="#FFFFFF" stroke="#E2DED2" strokeWidth="1.5" />
      <circle r="19" fill="#FBFAF6" stroke="#ECE9DF" strokeWidth="1" />
      <motion.g initial={false} animate={{ opacity: eating ? 1 : 0, scale: eating ? 1 : 0.6 }} transition={{ duration: 0.35 }}>
        <circle r="11" fill="#E9C77B" />
        <path d="M-7 -2 q3 -5 7 0 t7 0 M-6 3 q3 -4 6 0 t6 0" stroke="#C99A3E" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        <circle cx="3" cy="-3" r="2" fill="#B5523B" />
      </motion.g>
    </g>
  );
}

function Philosopher({ i, st, active, holding }) {
  const a = deg(i);
  const p = polar(PERSON_R, a);
  const pal = PALETTE[st];
  const eating = holding;
  return (
    <g transform={`translate(${p.x} ${p.y})`}>
      {active && (
        <motion.circle
          r="52" fill="none" stroke="#315C46" strokeWidth="1.5" strokeDasharray="4 5"
          animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        />
      )}
      {st === PHI_STATE.HUNGRY && (
        <motion.circle
          r="44" fill="none" stroke={pal.stroke} strokeWidth="2"
          animate={{ opacity: [0.7, 0], scale: [1, 1.18] }} transition={{ duration: 1.4, repeat: Infinity }}
        />
      )}
      <motion.circle r="44" initial={false} animate={{ fill: pal.fill, stroke: pal.stroke }} strokeWidth="2" transition={{ duration: 0.4 }} />

      {/* Top-down figure; local -y faces the table centre */}
      <g transform={`rotate(${a - 90})`}>
        {/* arms reach towards the plate while eating */}
        <motion.g initial={false} animate={{ opacity: eating ? 1 : 0 }} transition={{ duration: 0.3 }}>
          <path d="M-19 -2 Q-20 -22 -12 -34" stroke={ROBES[i]} strokeWidth="7" strokeLinecap="round" fill="none" />
          <path d="M19 -2 Q20 -22 12 -34" stroke={ROBES[i]} strokeWidth="7" strokeLinecap="round" fill="none" />
          <circle cx="-12" cy="-35" r="4" fill="#E8C9A8" />
          <circle cx="12" cy="-35" r="4" fill="#E8C9A8" />
        </motion.g>
        <ellipse cx="0" cy="6" rx="27" ry="16" fill={ROBES[i]} />
        <ellipse cx="0" cy="6" rx="27" ry="16" fill="none" stroke="#000" strokeOpacity="0.08" />
        <circle cx="0" cy="0" r="13" fill="#E8C9A8" />
        <path d="M-13 1 A13 13 0 0 1 13 1 Q13 8 0 9 Q-13 8 -13 1 Z" transform="rotate(180)" fill="#8F8A80" opacity="0.85" />
      </g>
    </g>
  );
}

// Pill next to the philosopher: the step it just executed (same text as the
// Semaphore Monitor) and a lock when it holds the mutex.
function StepPill({ i, op, holdsMutex }) {
  const a = (deg(i) * Math.PI) / 180;
  const cx = Math.cos(a), sy = Math.sin(a);
  const dist = SEAT_R + 10 + Math.abs(cx) * (LABEL_W / 2) + Math.abs(sy) * (LABEL_H / 2);
  const seat = polar(PERSON_R, deg(i));
  const above = sy < 0;
  const text = op ? op.split('→ ')[1] : 'holds mutex';
  const w = text.length * 6.3 + (holdsMutex ? 30 : 16);
  const x = seat.x + cx * dist;
  const y = seat.y + sy * dist + 4 + (above ? -40 : 26);
  return (
    <motion.g key={`${text}-${holdsMutex}`} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <g transform={`translate(${x} ${y})`}>
        <rect x={-w / 2} y="0" width={w} height="20" rx="10" fill={holdsMutex ? '#F7E5B7' : '#FFFFFF'} stroke={holdsMutex ? '#DDB65A' : '#B9D8BF'} />
        {holdsMutex && (
          <g transform={`translate(${-w / 2 + 9} 5)`} fill="none" stroke="#7A5410" strokeWidth="1.4">
            <rect x="0" y="4" width="9" height="7" rx="1.5" fill="#7A5410" stroke="none" />
            <path d="M2 4 V2.5 a2.5 2.5 0 0 1 5 0 V4" />
          </g>
        )}
        <text x={holdsMutex ? 7 : 0} y="14" textAnchor="middle" fontSize="10.5" fontFamily="'JetBrains Mono', ui-monospace, Consolas, monospace"
          fill={holdsMutex ? '#5E430F' : '#24583A'}>{text}</text>
      </g>
    </motion.g>
  );
}

function Label({ i, st }) {
  // Push the label box outward from the seat far enough that it never overlaps it,
  // whatever the angle (distance from seat centre to box edge along the direction).
  const a = (deg(i) * Math.PI) / 180;
  const cx = Math.cos(a), sy = Math.sin(a);
  const dist = SEAT_R + 10 + Math.abs(cx) * (LABEL_W / 2) + Math.abs(sy) * (LABEL_H / 2);
  const seat = polar(PERSON_R, deg(i));
  const p = { x: seat.x + cx * dist, y: seat.y + sy * dist + 4 };
  const pal = PALETTE[st];
  return (
    <g transform={`translate(${p.x} ${p.y})`}>
      <text y="-6" textAnchor="middle" fontSize="13" fontWeight="600" fill="#252823" fontFamily="Inter, sans-serif">
        Philosopher {i + 1}
      </text>
      <motion.rect x="-34" y="2" width="68" height="18" rx="9" initial={false} animate={{ fill: pal.fill, stroke: pal.stroke }} strokeWidth="1" />
      <text y="14.5" textAnchor="middle" fontSize="9.5" fontWeight="600" letterSpacing="0.6" fill={pal.text} fontFamily="Inter, sans-serif">
        {pal.label.toUpperCase()}
      </text>
    </g>
  );
}

export default function DiningTable({ phiStates, phases, algPhil, algLines = [], mutex, mutexHolder = null, className = '' }) {
  const { owner: owners, reserved } = forkView(phiStates, phases);
  const shown = phiStates.map((_, i) => (phases ? shownState(phiStates, phases, i) : phiStates[i]));
  const line = currentLine(algLines);
  const op = line ? ALG_TEXT[line] : null;

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className={className || 'w-full h-auto max-w-[640px] mx-auto select-none'} role="img"
      aria-label="Top view of a round table with five philosophers, five plates and five forks">
      <defs>
        <radialGradient id="wood" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#D9B98A" />
          <stop offset="100%" stopColor="#BF9663" />
        </radialGradient>
      </defs>

      {/* Table */}
      <circle cx={C} cy={C + 6} r={TABLE_R + 4} fill="#252823" opacity="0.06" />
      <circle cx={C} cy={C} r={TABLE_R + 6} fill="#A67C4E" />
      <circle cx={C} cy={C} r={TABLE_R} fill="url(#wood)" />
      {[150, 128, 104, 82, 58, 36].map((r, k) => (
        <circle key={r} cx={C + (k % 2 ? 2 : -2)} cy={C + (k % 3) - 1} r={r} fill="none" stroke="#9C7346" strokeOpacity="0.16" strokeWidth="1" />
      ))}

      {/* Centre bowl with mutex indicator */}
      <circle cx={C} cy={C} r="40" fill="#FFFFFF" stroke="#E2DED2" strokeWidth="1.5" />
      <circle cx={C} cy={C} r="30" fill="#F1E3C2" />
      <path d={`M${C - 18} ${C - 4} q6 -8 12 0 t12 0 t12 0 M${C - 20} ${C + 6} q6 -7 12 0 t12 0 t12 0`} stroke="#C99A3E" strokeWidth="2" fill="none" strokeLinecap="round" />
      <g transform={`translate(${C} ${C + 62})`}>
        <rect x="-38" y="-11" width="76" height="22" rx="11" fill={mutex === 1 ? '#FFFFFF' : '#F7E5B7'} stroke={mutex === 1 ? '#E2DED2' : '#DDB65A'} />
        <text textAnchor="middle" y="4" fontSize="10" fontFamily="ui-monospace, Consolas, monospace" fill="#252823">
          {mutex === 1 || mutexHolder === null ? `mutex = ${mutex}` : `mutex = 0 · P${mutexHolder + 1}`}
        </text>
      </g>

      {Array.from({ length: N }, (_, i) => <Plate key={`plate-${i}`} i={i} eating={owners[leftForkOf(i)] === i} />)}

      {/* Fork rest-position markers */}
      {Array.from({ length: N }, (_, j) => {
        const p = polar(FORK_REST_R + 28, forkDeg(j));
        return (
          <text key={`fl-${j}`} x={p.x} y={p.y + 3} textAnchor="middle" fontSize="9.5" fontWeight="600"
            fill={owners[j] !== null ? '#315C46' : reserved[j] !== null ? '#B8862A' : '#8A8574'} fontFamily="Inter, sans-serif" opacity="0.85">
            F{j}
          </text>
        );
      })}

      {shown.map((st, i) => <Philosopher key={`p-${i}`} i={i} st={st} active={algPhil === i} holding={owners[leftForkOf(i)] === i} />)}
      {Array.from({ length: N }, (_, j) => <Fork key={`fork-${j}`} j={j} owner={owners[j]} reservedBy={reserved[j]} />)}
      {shown.map((st, i) => <Label key={`l-${i}`} i={i} st={st} />)}
      {shown.map((_, i) => {
        const holdsMutex = mutex === 0 && mutexHolder === i;
        const myOp = algPhil === i ? op : null;
        return myOp || holdsMutex ? <StepPill key={`s-${i}`} i={i} op={myOp} holdsMutex={holdsMutex} /> : null;
      })}
    </svg>
  );
}
