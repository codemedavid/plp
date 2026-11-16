// Purely decorative pieces for the ber-months / Christmas theme. Everything
// here is aria-hidden, ignores pointer events, animates transform/opacity only,
// and stands still under prefers-reduced-motion (see the holiday block in
// index.css).

// Deterministic pseudo-random spread so flakes look scattered but render the
// same on every pass (no Math.random in render).
const spread = (index: number, salt: number): number =>
  ((index * 37 + salt * 101) % 97) / 97;

const FLAKE_COUNT = 28;
const FLAKES = Array.from({ length: FLAKE_COUNT }, (_, i) => ({
  id: i,
  left: spread(i, 1) * 100,
  size: 3 + Math.round(spread(i, 2) * 5),
  duration: 9 + spread(i, 3) * 9,
  delay: -spread(i, 4) * 18,
  sway: 2.5 + spread(i, 5) * 3,
  opacity: 0.35 + spread(i, 6) * 0.55,
}));

// Falling snow, sized to its positioned parent. Use on dark (navy) surfaces —
// cream flakes vanish on the cream page background.
export function Snowfall() {
  return (
    <div aria-hidden="true" className="holiday-snow pointer-events-none absolute inset-0 overflow-hidden">
      {FLAKES.map((flake) => (
        <span
          key={flake.id}
          className="holiday-snow__track"
          style={{
            left: `${flake.left}%`,
            width: flake.size,
            animationDuration: `${flake.duration}s`,
            animationDelay: `${flake.delay}s`,
          }}
        >
          <span
            className="holiday-snow__flake"
            style={{
              width: flake.size,
              height: flake.size,
              opacity: flake.opacity,
              animationDuration: `${flake.sway}s`,
            }}
          />
        </span>
      ))}
    </div>
  );
}

type OrnamentTone = 'gold' | 'cranberry' | 'evergreen';

const ORNAMENT_FILL: Record<OrnamentTone, string> = {
  gold: 'var(--holiday-gold)',
  cranberry: 'var(--holiday-cranberry)',
  evergreen: 'var(--holiday-evergreen)',
};

type OrnamentProps = {
  tone: OrnamentTone;
  drop: number;
  size: number;
  className?: string;
};

// A single hanging bauble on a gold thread. `drop` is the thread length in px.
function Ornament({ tone, drop, size, className = '' }: OrnamentProps) {
  const height = drop + size + 6;
  return (
    <svg
      className={`holiday-ornament ${className}`}
      width={size}
      height={height}
      viewBox={`0 0 ${size} ${height}`}
      fill="none"
    >
      <line x1={size / 2} y1={0} x2={size / 2} y2={drop} stroke="var(--holiday-gold)" strokeWidth={1} />
      <rect x={size / 2 - 3} y={drop} width={6} height={5} rx={1} fill="var(--holiday-gold-deep)" />
      <circle cx={size / 2} cy={drop + 5 + size / 2} r={size / 2} fill={ORNAMENT_FILL[tone]} />
      {/* Soft highlight so the bauble reads as glass, not a flat dot */}
      <ellipse
        cx={size * 0.36}
        cy={drop + 5 + size * 0.34}
        rx={size * 0.12}
        ry={size * 0.18}
        fill="#FFFFFF"
        opacity={0.45}
      />
    </svg>
  );
}

// A cluster of baubles hanging from the top edge of its positioned parent.
export function OrnamentCluster({ side }: { side: 'left' | 'right' }) {
  const position = side === 'left' ? 'left-4 sm:left-10' : 'right-4 sm:right-10';
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute top-0 ${position} flex items-start gap-3 sm:gap-5`}
    >
      <Ornament tone={side === 'left' ? 'cranberry' : 'gold'} drop={34} size={22} />
      <Ornament tone="evergreen" drop={64} size={16} className="hidden sm:block" />
      <Ornament tone={side === 'left' ? 'gold' : 'cranberry'} drop={18} size={14} />
    </div>
  );
}

const BULB_TONES = ['gold', 'cranberry', 'cream', 'evergreen'] as const;
const BULB_COUNT = 36;

// A string of twinkling lights draped across the top of the page.
export function HolidayLights() {
  return (
    <div aria-hidden="true" className="holiday-lights pointer-events-none relative h-5 overflow-hidden bg-white">
      <span className="absolute inset-x-0 top-[3px] h-px bg-navy-900/15" />
      <div className="relative flex justify-between px-2">
        {Array.from({ length: BULB_COUNT }, (_, i) => (
          <span
            key={i}
            className={`holiday-lights__bulb holiday-lights__bulb--${BULB_TONES[i % BULB_TONES.length]}`}
            style={{
              marginTop: i % 2 === 0 ? 4 : 7,
              animationDelay: `${(i % 5) * 0.45}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
