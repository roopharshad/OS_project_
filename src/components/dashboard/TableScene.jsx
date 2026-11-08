import { motion } from 'framer-motion';
import { PHI_STATE, N, forkOwners, leftForkOf } from '../../engine/simulationEngine';

// ─── Geometry (SVG units) ─────────────────────────────────────────────────────
const W = 760;
const H = 560;
const CX = 380;
const CY = 288;
const TABLE_R = 168;
const PERSON_R = 204;
const PLATE_R = 124;
const FORK_REST_R = 116;
const FORK_HELD_R = 134;
const FORK_HELD_SPREAD = 14; // degrees either side of the eater's plate

const deg = (i) => -90 + i * (360 / N);
const forkDeg = (j) => deg(j) + 180 / N; // fork j sits between P(j+1) and P(j+2) in 1-based labels
const polar = (r, d) => ({ x: CX + r * Math.cos((d * Math.PI) / 180), y: CY + r * Math.sin((d * Math.PI) / 180) });

export const STATE_STYLE = {
  [PHI_STATE.THINKING]: { fill: '#DCEAF4', ring: '#A9C8E0', dot: '#4C86B5', text: '#2F5E80', label: 'Thinking' },
  [PHI_STATE.HUNGRY]: { fill: '#F7E5B7', ring: '#E2BC62', dot: '#D99A22', text: '#7A5410', label: 'Hungry' },
  [PHI_STATE.EATING]: { fill: '#D7E9D9', ring: '#86BD92', dot: '#3E8E55', text: '#24583A', label: 'Eating' },
};

const SHIRTS = ['#4E6B55', '#3F5F86', '#5E7F58', '#465C7A', '#8A4B45'];
const SKIN = ['#E3B48F', '#D6A27B', '#E8BE9A', '#C99470', '#DDAA84'];
const HAIR = ['#2B211C', '#3A2A20', '#1F1A17', '#4A3426', '#2E2621'];

// Label box offsets from each philosopher's centre (screen space).
const LABEL_W = 124;
const LABEL_H = 50;
const LABEL_POS = [[44, -70], [30, -104], [50, -6], [-50 - LABEL_W, -6], [-30 - LABEL_W, -104]];

// Arm poses in local space (local -y points at the table centre).
const POSES = {
  [PHI_STATE.THINKING]: { l: 'M -22 0 Q -22 -14 -9 -19', r: 'M 22 0 Q 27 -16 18 -30', lh: [-9, -19], rh: [18, -30] },
  [PHI_STATE.HUNGRY]: { l: 'M -22 0 Q -27 -20 -17 -36', r: 'M 22 0 Q 27 -20 17 -36', lh: [-17, -36], rh: [17, -36] },
  [PHI_STATE.EATING]: { l: 'M -22 0 Q -33 -26 -29 -52', r: 'M 22 0 Q 33 -26 29 -52', lh: [-29, -52], rh: [29, -52] },
};

function Fork({ held }) {
  const c = held ? '#2E5E45' : '#9DA3A6';
  const s = held ? '#1E4231' : '#7D8387';
  return (
    <g>
      {held && <circle r="22" fill="#D7E9D9" opacity="0.85" />}
      <g fill={c} stroke={s} strokeWidth="0.6">
        <rect x="-2" y="3" width="4" height="26" rx="2" />
        <path d="M-6.5 -4 Q-6.5 5 0 6 Q6.5 5 6.5 -4 Z" />
        <rect x="-6.5" y="-19" width="1.8" height="16" rx="0.9" />
        <rect x="-2.3" y="-19" width="1.8" height="16" rx="0.9" />
        <rect x="0.5" y="-19" width="1.8" height="16" rx="0.9" />
        <rect x="4.7" y="-19" width="1.8" height="16" rx="0.9" />
      </g>
    </g>
  );
}

function ForkOnTable({ j, owner }) {
  const held = owner !== null;
  let a = forkDeg(j);
  let r = FORK_REST_R;
  if (held) {
    a = deg(owner) + (leftForkOf(owner) === j ? -FORK_HELD_SPREAD : FORK_HELD_SPREAD);
    r = FORK_HELD_R;
  }
  const p = polar(r, a);
  return (
    <motion.g
      initial={false}
      animate={{ x: p.x, y: p.y, rotate: a - 90 + (held ? 180 : 0), scale: held ? 1.08 : 1 }}
      transition={{ duration: 1.1, ease: [0.4, 0, 0.2, 1] }}
    >
      <Fork held={held} />
    </motion.g>
  );
}

function Plate({ i, eating }) {
  const p = polar(PLATE_R, deg(i));
  return (
    <g transform={`translate(${p.x} ${p.y})`}>
      <circle r="27" fill="#252823" opacity="0.06" cy="2" />
      <circle r="26" fill="#FFFFFF" stroke="#E4E0D4" strokeWidth="1.2" />
      <circle r="18" fill="#FBFAF6" stroke="#EEEBE2" strokeWidth="1" />
      <motion.g initial={false} animate={{ opacity: eating ? 1 : 0, scale: eating ? 1 : 0.5 }} transition={{ duration: 0.6 }}>
        <circle r="12" fill="#EBCB82" />
        <path d="M-8 -3 q3 -5 6 0 t6 0 t5 0 M-8 3 q3 -4 6 0 t6 0 t5 0" stroke="#C9993F" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        <circle cx="3" cy="-2" r="2.4" fill="#B5523B" />
        <circle cx="-4" cy="4" r="1.8" fill="#B5523B" />
      </motion.g>
    </g>
  );
}

function Philosopher({ i, st, active }) {
  const a = deg(i);
  const p = polar(PERSON_R, a);
  const sty = STATE_STYLE[st];
  const pose = POSES[st];
  const shirt = SHIRTS[i];

  return (
    <g transform={`translate(${p.x} ${p.y})`}>
      {/* state halo under the chair */}
      <motion.circle r="52" initial={false} animate={{ fill: sty.fill }} transition={{ duration: 0.5 }} opacity="0.75" />
      {st === PHI_STATE.HUNGRY && (
        <motion.circle r="52" fill="none" stroke={sty.ring} strokeWidth="2"
          animate={{ scale: [1, 1.14], opacity: [0.8, 0] }} transition={{ duration: 1.6, repeat: Infinity }} />
      )}
      {active && (
        <motion.circle r="58" fill="none" stroke="#2C4A3A" strokeWidth="1.6" strokeDasharray="5 6"
          animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: 'linear' }} />
      )}

      <g transform={`rotate(${a - 90})`}>
        {/* chair */}
        <rect x="-31" y="-14" width="62" height="46" rx="13" fill="#A4693A" stroke="#7C4C26" strokeWidth="1.2" />
        <rect x="-25" y="-9" width="50" height="34" rx="10" fill="#B87A47" opacity="0.65" />
        <path d="M-35 26 Q0 54 35 26" stroke="#7C4C26" strokeWidth="10" strokeLinecap="round" fill="none" />
        <path d="M-33 26 Q0 51 33 26" stroke="#B07443" strokeWidth="5" strokeLinecap="round" fill="none" />

        {/* arms (behind torso so sleeves join the shoulders) */}
        <motion.path initial={false} animate={{ d: pose.l }} transition={{ duration: 0.8 }} stroke={shirt} strokeWidth="10" strokeLinecap="round" fill="none" />
        <motion.path initial={false} animate={{ d: pose.r }} transition={{ duration: 0.8 }} stroke={shirt} strokeWidth="10" strokeLinecap="round" fill="none" />
        <motion.circle initial={false} animate={{ cx: pose.lh[0], cy: pose.lh[1] }} transition={{ duration: 0.8 }} r="5.2" fill={SKIN[i]} />
        <motion.circle initial={false} animate={{ cx: pose.rh[0], cy: pose.rh[1] }} transition={{ duration: 0.8 }} r="5.2" fill={SKIN[i]} />

        {/* torso / shoulders */}
        <ellipse cx="0" cy="6" rx="27" ry="17" fill={shirt} />
        <ellipse cx="0" cy="6" rx="27" ry="17" fill="none" stroke="#000" strokeOpacity="0.12" />
        <path d="M-10 -8 Q0 -2 10 -8" stroke="#000" strokeOpacity="0.15" strokeWidth="2" fill="none" />

        {/* head: from above you mostly see hair, with the face edge toward the table */}
        <circle cx="-11.5" cy="-5" r="3" fill={SKIN[i]} />
        <circle cx="11.5" cy="-5" r="3" fill={SKIN[i]} />
        <circle cx="0" cy="-8" r="12.5" fill={SKIN[i]} />
        <circle cx="0" cy="-5" r="12.5" fill={HAIR[i]} />
        <path d="M-7 -1 Q0 3 7 -1" stroke="#000" strokeOpacity="0.2" strokeWidth="1.2" fill="none" />
      </g>
    </g>
  );
}

function Label({ i, st }) {
  const p = polar(PERSON_R, deg(i));
  const [dx, dy] = LABEL_POS[i];
  const sty = STATE_STYLE[st];
  return (
    <g transform={`translate(${p.x + dx} ${p.y + dy})`} filter="url(#labelShadow)">
      <rect width={LABEL_W} height={LABEL_H} rx="9" fill="#FFFFFF" stroke="#E2DFD4" />
      <text x="12" y="19" fontSize="13" fontWeight="600" fill="#252823" fontFamily="Inter, sans-serif">Philosopher {i + 1}</text>
      <motion.rect x="9" y="27" width={LABEL_W - 18} height="16" rx="8" initial={false} animate={{ fill: sty.fill }} transition={{ duration: 0.5 }} />
      <circle cx="19" cy="35" r="3.5" fill={sty.dot} />
      <text x="28" y="39" fontSize="11" fontWeight="600" fill={sty.text} fontFamily="Inter, sans-serif">{sty.label}</text>
    </g>
  );
}

export default function TableScene({ phiStates, algPhil, mutex }) {
  const owners = forkOwners(phiStates);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none" role="img"
      aria-label="Top view of a round wooden table with five philosophers, five plates and five forks">
      <defs>
        <radialGradient id="wood" cx="42%" cy="38%" r="70%">
          <stop offset="0%" stopColor="#D8A76C" />
          <stop offset="70%" stopColor="#C38C55" />
          <stop offset="100%" stopColor="#B07846" />
        </radialGradient>
        <clipPath id="tableClip"><circle cx={CX} cy={CY} r={TABLE_R} /></clipPath>
        <filter id="labelShadow" x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#252823" floodOpacity="0.12" />
        </filter>
        <filter id="tableShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#4A3420" floodOpacity="0.22" />
        </filter>
      </defs>

      {/* Table */}
      <circle cx={CX} cy={CY} r={TABLE_R + 7} fill="#8E5B31" filter="url(#tableShadow)" />
      <circle cx={CX} cy={CY} r={TABLE_R} fill="url(#wood)" />
      <g clipPath="url(#tableClip)" stroke="#8E5B31" fill="none" strokeLinecap="round">
        {Array.from({ length: 15 }, (_, k) => {
          const y = CY - TABLE_R + 12 + k * 23;
          const w = (k % 3) * 6 - 6;
          return <path key={k} d={`M${CX - TABLE_R} ${y} C ${CX - 80} ${y + w}, ${CX + 40} ${y - w - 4}, ${CX + TABLE_R} ${y + 2}`} strokeOpacity={0.1 + (k % 2) * 0.05} strokeWidth="1.2" />;
        })}
        <ellipse cx={CX - 40} cy={CY - 30} rx="18" ry="7" strokeOpacity="0.18" />
        <ellipse cx={CX - 40} cy={CY - 30} rx="10" ry="3.5" strokeOpacity="0.15" />
      </g>
      <circle cx={CX} cy={CY} r={TABLE_R} fill="none" stroke="#FFFFFF" strokeOpacity="0.18" strokeWidth="2" />
      <ellipse cx={CX - 50} cy={CY - 70} rx="90" ry="50" fill="#FFFFFF" opacity="0.07" />

      {/* mutex chip in the centre */}
      <g transform={`translate(${CX} ${CY})`}>
        <rect x="-44" y="-13" width="88" height="26" rx="13" fill={mutex === 1 ? '#FFFFFF' : '#F7E5B7'} stroke={mutex === 1 ? '#E2DFD4' : '#E2BC62'} opacity="0.95" />
        <text textAnchor="middle" y="4.5" fontSize="12" fontFamily="'JetBrains Mono', ui-monospace, monospace" fill="#252823">mutex = {mutex}</text>
      </g>

      {Array.from({ length: N }, (_, i) => <Plate key={`plate-${i}`} i={i} eating={phiStates[i] === PHI_STATE.EATING} />)}

      {/* fork labels at the rest positions */}
      {Array.from({ length: N }, (_, j) => {
        const p = polar(FORK_REST_R - 34, forkDeg(j));
        return (
          <text key={`fl-${j}`} x={p.x} y={p.y + 4} textAnchor="middle" fontSize="11" fontWeight="600"
            fill={owners[j] === null ? '#7A5A3A' : '#2E5E45'} opacity="0.75" fontFamily="Inter, sans-serif">
            F{j}
          </text>
        );
      })}

      {phiStates.map((st, i) => <Philosopher key={`p-${i}`} i={i} st={st} active={algPhil === i} />)}
      {Array.from({ length: N }, (_, j) => <ForkOnTable key={`fork-${j}`} j={j} owner={owners[j]} />)}
      {phiStates.map((st, i) => <Label key={`l-${i}`} i={i} st={st} />)}
    </svg>
  );
}
