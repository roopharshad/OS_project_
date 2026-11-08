// Quiet decorative illustrations: botanical sprigs and a line-art university building.

function Leaf({ x, y, r, s = 1, fill }) {
  return (
    <path
      transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}
      d="M0 0 C 8 -6, 22 -6, 32 0 C 22 6, 8 6, 0 0 Z"
      fill={fill}
    />
  );
}

export function Sprig({ className = '', flip = false, color = '#7E9270' }) {
  const leaves = [
    [18, 22, -40, 1.05], [30, 40, 20, 0.95], [40, 58, -35, 1.1], [52, 76, 25, 1], [60, 96, -30, 1.05],
    [70, 114, 30, 0.9], [76, 134, -25, 0.95], [84, 152, 35, 0.85], [88, 172, -20, 0.8],
  ];
  return (
    <svg viewBox="0 0 160 200" className={className} aria-hidden="true" style={flip ? { transform: 'scaleX(-1)' } : undefined}>
      <path d="M6 6 C 30 40, 55 90, 96 196" stroke={color} strokeWidth="1.6" fill="none" opacity="0.7" />
      {leaves.map(([x, y, r, s], k) => (
        <Leaf key={k} x={x} y={y} r={r} s={s} fill={color} />
      ))}
      <path d="M40 60 C 70 62, 100 50, 128 30" stroke={color} strokeWidth="1.2" fill="none" opacity="0.6" />
      {[[62, 58, -10, 0.8], [84, 52, -30, 0.75], [104, 42, -40, 0.7], [118, 34, -50, 0.6]].map(([x, y, r, s], k) => (
        <Leaf key={`b${k}`} x={x} y={y} r={r} s={s} fill={color} />
      ))}
    </svg>
  );
}

export function Building({ className = '' }) {
  const cols = [44, 58, 72, 86, 100, 114, 128, 142, 156];
  return (
    <svg viewBox="0 0 200 120" className={className} aria-hidden="true" fill="none" stroke="#8C8A7E" strokeWidth="1" strokeLinecap="round">
      {/* trees */}
      <path d="M14 104 C 4 96, 6 80, 16 76 C 14 64, 30 60, 34 70 C 44 70, 44 86, 36 92 C 38 100, 26 106, 20 104" opacity="0.7" />
      <path d="M22 104 V 116" opacity="0.7" />
      <path d="M186 104 C 196 96, 194 80, 184 76 C 186 64, 170 60, 166 70 C 156 70, 156 86, 164 92 C 162 100, 174 106, 180 104" opacity="0.7" />
      <path d="M178 104 V 116" opacity="0.7" />
      {/* dome */}
      <path d="M86 34 C 86 20, 114 20, 114 34" />
      <path d="M100 18 V 12 M97 12 H103" />
      <rect x="82" y="34" width="36" height="8" />
      {/* pediment */}
      <path d="M34 62 L100 42 L166 62 Z" />
      <path d="M48 58 L100 46 L152 58" opacity="0.6" />
      {/* body */}
      <rect x="34" y="62" width="132" height="6" />
      {cols.map((x) => (
        <g key={x}>
          <path d={`M${x} 68 V 104`} />
          <path d={`M${x + 5} 68 V 104`} />
        </g>
      ))}
      <rect x="30" y="104" width="140" height="5" />
      <path d="M24 112 H176" />
      <path d="M90 104 V 86 C 90 80, 110 80, 110 86 V 104" opacity="0.8" />
      {[50, 64, 120, 134, 148].map((x) => <rect key={x} x={x} y="78" width="4" height="10" opacity="0.5" />)}
      <path d="M8 116 H192" opacity="0.6" />
    </svg>
  );
}

// Two people at a small table, used in the Concepts & Learning card.
export function StudyScene({ className = '' }) {
  return (
    <svg viewBox="0 0 220 140" className={className} aria-hidden="true">
      <ellipse cx="110" cy="128" rx="92" ry="7" fill="#252823" opacity="0.06" />
      {/* left person */}
      <circle cx="46" cy="44" r="14" fill="#6F8070" />
      <path d="M22 118 C 20 82, 30 64, 48 62 C 66 62, 74 78, 76 92 L 92 92 L 92 100 L 70 102 C 70 110, 70 116, 70 118 Z" fill="#7D8E7D" />
      {/* right person */}
      <circle cx="174" cy="44" r="14" fill="#6F8070" />
      <path d="M198 118 C 200 82, 190 64, 172 62 C 154 62, 146 78, 144 92 L 128 92 L 128 100 L 150 102 C 150 110, 150 116, 150 118 Z" fill="#7D8E7D" />
      {/* table */}
      <ellipse cx="110" cy="92" rx="56" ry="11" fill="#8E9C8A" />
      <ellipse cx="110" cy="89" rx="56" ry="11" fill="#A8B4A2" />
      <path d="M106 99 V 124 M114 99 V 124" stroke="#8E9C8A" strokeWidth="5" />
      <path d="M94 126 H126" stroke="#8E9C8A" strokeWidth="4" strokeLinecap="round" />
      {/* plates */}
      <ellipse cx="88" cy="88" rx="11" ry="3.5" fill="#FFFFFF" />
      <ellipse cx="132" cy="88" rx="11" ry="3.5" fill="#FFFFFF" />
      <path d="M110 80 V 90" stroke="#E8E7E1" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
