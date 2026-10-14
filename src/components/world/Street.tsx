import { fill, stop, stroke, useSvgIds } from "./paint";

/**
 * A narrow Paris street seen at eye height, in one-point perspective. Lengths
 * are metres: X across the street (left is negative), Y up from the ground,
 * Z away from the eye. The picture is 1600 × 1000.
 */
const VP = { x: 900, y: 470 } as const;
const FOCAL = 820;
const EYE = 1.6;
const LEFT = -7.5;
const RIGHT = 7;
const FAR = 140;
/** The side street on the left opens between these depths. */
const GAP = { from: 16.5, to: 23 } as const;

type Point = readonly [number, number];

const project = (x: number, y: number, z: number): Point => [
  VP.x + (FOCAL * x) / z,
  VP.y - (FOCAL * (y - EYE)) / z,
];
const points = (list: readonly Point[]) => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
/** A rectangle on a facade (plane x = side), from depth z0 to z1. */
const onFacade = (side: number, y0: number, y1: number, z0: number, z1: number) =>
  points([project(side, y0, z0), project(side, y0, z1), project(side, y1, z1), project(side, y1, z0)]);
/** A rectangle facing the eye (plane z = depth). */
const facing = (z: number, x0: number, x1: number, y0: number, y1: number) =>
  points([project(x0, y0, z), project(x1, y0, z), project(x1, y1, z), project(x0, y1, z)]);
const toFraction = ([x, y]: Point) => ({ x: x / 1600, y: y / 1000 });

/** Deterministic, so server and client draw the same street. */
function random(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Building = { z0: number; z1: number; height: number };
type Lit = { points: string; opacity: number };

const RIGHT_SIDE: Building[] = [
  { z0: 4, z1: 13, height: 18.4 },
  { z0: 13, z1: 27, height: 16.9 },
  { z0: 27, z1: 44, height: 19.6 },
  { z0: 44, z1: 64, height: 17.6 },
  { z0: 64, z1: 92, height: 18.8 },
  { z0: 92, z1: FAR, height: 17.2 },
];
const LEFT_NEAR: Building[] = [
  { z0: 4, z1: 10, height: 18.6 },
  { z0: 10, z1: GAP.from, height: 17.2 },
];
const LEFT_FAR: Building[] = [
  { z0: GAP.to, z1: 38, height: 19 },
  { z0: 38, z1: 60, height: 17.8 },
  { z0: 60, z1: 94, height: 18.4 },
  { z0: 94, z1: FAR, height: 17 },
];

const GROUND_FLOOR = 4.2;
const STOREY = 3.1;
const BAY = 3.3;
const NEAREST_WINDOW = 12;

/** A few people further down the street: x, depth, height. */
const PASSERS_BY: ReadonlyArray<readonly [number, number, number]> = [
  [-3.1, 31, 1.72],
  [2.4, 38, 1.64],
  [4.8, 47, 1.78],
  [-1.2, 58, 1.7],
  [-5.6, 66, 1.6],
  [1.6, 79, 1.75],
];

/** Facades of one side: walls, storeys of tall windows, balconies, shops. */
function side(x: number, buildings: Building[], seed: number) {
  const rnd = random(seed);
  const walls: string[] = [];
  const ledges: string[] = [];
  const rails: string[] = [];
  const roofs: string[] = [];
  const dark: string[] = [];
  const lit: Lit[] = [];
  const shops: Lit[] = [];
  const shutters: string[] = [];
  const spill: Lit[] = [];

  for (const { z0, z1, height } of buildings) {
    walls.push(onFacade(x, 0, height, z0, z1));
    roofs.push(onFacade(x, height, height + 2.6, z0, z1));
    ledges.push(onFacade(x, height - 0.4, height, z0, z1));
    ledges.push(onFacade(x, GROUND_FLOOR - 0.15, GROUND_FLOOR + 0.2, z0, z1));

    for (let storey = 0; GROUND_FLOOR + STOREY * (storey + 1) <= height - 0.3; storey++) {
      const floor = GROUND_FLOOR + STOREY * storey;
      if (storey === 1 || storey === 4) rails.push(onFacade(x, floor + 0.9, floor + 1.05, z0, z1));
      // Too close, they would be huge and sharp: the nearest walls stay plain.
      for (let z = Math.max(z0 + 1.1, NEAREST_WINDOW); z + 1.3 <= z1 - 0.6; z += BAY) {
        const [xa] = project(x, 0, z);
        const [xb] = project(x, 0, z + 1.3);
        if (Math.abs(xb - xa) < 1.4) continue;
        const quad = onFacade(x, floor + 0.6, floor + 2.7, z, z + 1.3);
        if (rnd() < 0.08) lit.push({ points: quad, opacity: 0.08 + rnd() * 0.16 });
        else dark.push(quad);
      }
    }

    // Shops: wide glass bays between stone piers, some still lit.
    const bays = Math.max(1, Math.round((z1 - z0) / 5.5));
    const width = (z1 - z0) / bays;
    for (let i = 0; i < bays; i++) {
      const a = z0 + i * width + 0.5;
      const b = z0 + (i + 1) * width - 0.5;
      if (b <= a) continue;
      const glass = onFacade(x, 0.3, 3.3, a, b);
      if (rnd() < 0.55) {
        // The closest shops would be large bright blocks at the edge of the view.
        const nearness = Math.min(1, Math.max(0.2, (a - 7) / 14));
        const opacity = (0.07 + rnd() * 0.12) * nearness;
        shops.push({ points: glass, opacity });
        const inward = x < 0 ? 2.6 : -2.6;
        spill.push({
          points: points([project(x, 0, a), project(x, 0, b), project(x + inward, 0, b), project(x + inward, 0, a)]),
          opacity: opacity * 0.6,
        });
      } else {
        shutters.push(glass);
      }
    }
  }

  return { walls, ledges, rails, roofs, dark, lit, shops, shutters, spill };
}

const right = side(RIGHT, RIGHT_SIDE, 7);
const leftNear = side(LEFT, LEFT_NEAR, 11);
const leftFar = side(LEFT, LEFT_FAR, 23);
// The closest shop on the left stays shuttered: the copy sits in front of it.
leftNear.shutters.push(...leftNear.shops.splice(0, 1).map((shop) => shop.points));
leftNear.spill.splice(0, 1);

/** The corner building across the side street, seen face on, with the café that marks the turn. */
const CORNER = { z: GAP.to, x0: -17, x1: LEFT, height: 19 } as const;
const cornerWindows = (() => {
  const rnd = random(31);
  const out: Lit[] = [];
  for (let storey = 0; GROUND_FLOOR + STOREY * (storey + 1) <= CORNER.height - 0.3; storey++) {
    const floor = GROUND_FLOOR + STOREY * storey;
    for (let x = CORNER.x1 - 1.2; x - 1.3 >= CORNER.x0; x -= BAY) {
      out.push({ points: facing(CORNER.z, x - 1.3, x, floor + 0.6, floor + 2.7), opacity: rnd() < 0.2 ? 0.08 + rnd() * 0.1 : 0 });
    }
  }
  return out;
})();

/** The far end of the street: another facade across, then the sky. */
const END = { z: FAR, height: 18 } as const;
const endWindows = (() => {
  const rnd = random(47);
  const out: Lit[] = [];
  for (let storey = 0; GROUND_FLOOR + STOREY * (storey + 1) <= END.height - 0.3; storey++) {
    const floor = GROUND_FLOOR + STOREY * storey;
    for (let x = LEFT + 1; x + 1.3 <= RIGHT - 0.6; x += BAY) {
      out.push({ points: facing(END.z, x, x + 1.3, floor + 0.6, floor + 2.7), opacity: rnd() < 0.25 ? 0.2 + rnd() * 0.2 : 0 });
    }
  }
  return out;
})();

/** Rows and lines of the paving, fading with distance. */
const paving = (() => {
  const rows: string[] = [];
  for (let z = 2.6; z < 42; z *= 1.075) {
    const [x0, y] = project(LEFT, 0, z);
    const [x1] = project(RIGHT, 0, z);
    rows.push(`M${x0.toFixed(1)} ${y.toFixed(1)}H${x1.toFixed(1)}`);
  }
  const lines: string[] = [];
  for (let x = LEFT + 1.25; x < RIGHT; x += 1.25) {
    const [ax, ay] = project(x, 0, 2.4);
    const [bx, by] = project(x, 0, 60);
    lines.push(`M${ax.toFixed(1)} ${ay.toFixed(1)}L${bx.toFixed(1)} ${by.toFixed(1)}`);
  }
  return { rows: rows.join(""), lines: lines.join("") };
})();

const GUTTER = points([project(-0.18, 0, 2.4), project(0.18, 0, 2.4), project(0.18, 0, FAR), project(-0.18, 0, FAR)]);

/* ---------------------------------------------------------------------------
   The route drawn on the ground: along the street, then left at the corner.
   --------------------------------------------------------------------------- */

/** It goes out of sight behind the near corner, past x = -9.2 at this depth. */
const ROUTE_WORLD: ReadonlyArray<readonly [number, number]> = [
  [-0.2, 3.6],
  [-0.8, 8],
  [-1.9, 12.5],
  [-3.4, 16.4],
  [-5, 18.9],
  [-6.6, 19.8],
  [-9, 20.2],
];

/** Points every few centimetres along a Catmull-Rom curve through the route, on the ground (x, z). */
function sampleRoute(steps = 18) {
  const out: [number, number][] = [];
  const p = ROUTE_WORLD;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[Math.max(0, i - 1)];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[Math.min(p.length - 1, i + 2)];
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      const at = (k: 0 | 1) =>
        0.5 *
        (2 * p1[k] +
          (-p0[k] + p2[k]) * t +
          (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 +
          (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
      out.push([at(0), at(1)]);
    }
  }
  out.push([...p[p.length - 1]]);
  return out;
}

const routeSamples = sampleRoute();

/** A ribbon 6 cm wide lying on the ground, so it narrows with distance. */
const ROUTE_RIBBON = (() => {
  const half = 0.03;
  const leftEdge: Point[] = [];
  const rightEdge: Point[] = [];
  routeSamples.forEach(([x, z], i) => {
    const [nx, nz] = routeSamples[Math.min(i + 1, routeSamples.length - 1)];
    const [px, pz] = routeSamples[Math.max(i - 1, 0)];
    const dx = nx - px;
    const dz = nz - pz;
    const length = Math.hypot(dx, dz) || 1;
    const ox = (-dz / length) * half;
    const oz = (dx / length) * half;
    leftEdge.push(project(x + ox, 0, z + oz));
    rightEdge.push(project(x - ox, 0, z - oz));
  });
  return points([...leftEdge, ...rightEdge.reverse()]);
})();

/** The same route as a centre line, to reveal the ribbon by drawing along it. */
const ROUTE_LINE = routeSamples
  .map(([x, z], i) => {
    const [px, py] = project(x, 0, z);
    return `${i ? "L" : "M"}${px.toFixed(1)} ${py.toFixed(1)}`;
  })
  .join("");

/** Where the route turns: the route glance is pinned there. */
const TURN = { x: -5.6, z: 19.25 } as const;
const TURN_POINT = project(TURN.x, 0, TURN.z);
/** A 0.7 m ring on the ground at the turn, in picture units. */
const TURN_RING = {
  rx: (FOCAL * 0.7) / TURN.z,
  ry: FOCAL * EYE * (1 / (TURN.z - 0.7) - 1 / (TURN.z + 0.7)) * 0.5,
} as const;

export const STREET = {
  /** Where the route turns, in fractions of the picture. */
  turn: toFraction(TURN_POINT),
  /** The vanishing point, in fractions: the camera walks towards it. */
  vanishing: toFraction([VP.x, VP.y]),
} as const;

/**
 * Stand-in for the street shot of scene 2: late afternoon under a low sky,
 * shops lit, the paving still wet. Seen through smoked glass, so it stays
 * dark; what reads is the perspective, the sky at the end and the shop light.
 * The side street on the left is where the route turns.
 * Filters are rasterised once: move it with transforms only.
 */
export function Street({ className }: { className?: string }) {
  const { id, url } = useSvgIds();

  const facades = (part: ReturnType<typeof side>, wall: string) => (
    <>
      <g fill={url(wall)}>
        {part.walls.map((p) => (
          <polygon key={p} points={p} />
        ))}
      </g>
      <g style={fill("graphite")}>
        {part.roofs.map((p) => (
          <polygon key={p} points={p} />
        ))}
      </g>
      <g fill={url("zinc")}>
        {part.roofs.map((p) => (
          <polygon key={p} points={p} />
        ))}
      </g>
      <g style={fill("smoke")} opacity="0.62">
        {part.dark.map((p) => (
          <polygon key={p} points={p} />
        ))}
        {part.shutters.map((p) => (
          <polygon key={p} points={p} />
        ))}
      </g>
      <g style={fill("mineral")}>
        {part.lit.map(({ points: p, opacity }) => (
          <polygon key={p} points={p} opacity={opacity} />
        ))}
        {part.shops.map(({ points: p, opacity }) => (
          <polygon key={p} points={p} opacity={opacity} />
        ))}
      </g>
      <g style={fill("mineral")} opacity="0.045">
        {part.ledges.map((p) => (
          <polygon key={p} points={p} />
        ))}
      </g>
      <g style={fill("smoke")} opacity="0.9">
        {part.rails.map((p) => (
          <polygon key={p} points={p} />
        ))}
      </g>
    </>
  );

  const glow = (parts: ReturnType<typeof side>[]) => (
    <g style={fill("mineral")} filter={url("bloom")} opacity="0.9">
      {parts.flatMap((part) =>
        [...part.shops, ...part.lit].map(({ points: p, opacity }) => <polygon key={p} points={p} opacity={opacity} />),
      )}
    </g>
  );

  return (
    <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <defs>
        <linearGradient id={id("sky")} x1="0" y1="0" x2="0" y2="480" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={stop("smoke")} />
          <stop offset="0.5" style={stop("mineral", 0.08)} />
          <stop offset="1" style={stop("mineral", 0.24)} />
        </linearGradient>
        <linearGradient id={id("ground")} x1="0" y1={VP.y} x2="0" y2="1000" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={stop("mineral", 0.1)} />
          <stop offset="0.14" style={stop("graphite")} />
          <stop offset="1" style={stop("smoke")} />
        </linearGradient>
        <linearGradient id={id("wall-right")} x1="1600" y1="0" x2={VP.x} y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={stop("smoke")} />
          <stop offset="0.8" style={stop("graphite")} />
          <stop offset="1" style={stop("mineral", 0.13)} />
        </linearGradient>
        <linearGradient id={id("wall-left")} x1="0" y1="0" x2={VP.x} y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={stop("smoke")} />
          <stop offset="0.78" style={stop("graphite")} />
          <stop offset="1" style={stop("mineral", 0.11)} />
        </linearGradient>
        <linearGradient id={id("zinc")} x1="0" y1="0" x2="0" y2={VP.y} gradientUnits="userSpaceOnUse">
          <stop offset="0" style={stop("mineral", 0.1)} />
          <stop offset="1" style={stop("mineral", 0.03)} />
        </linearGradient>
        <radialGradient id={id("haze")} cx={VP.x} cy={VP.y - 30} r="520" gradientUnits="userSpaceOnUse" gradientTransform={`translate(${VP.x} ${VP.y - 30}) scale(1 0.55) translate(${-VP.x} ${-(VP.y - 30)})`}>
          <stop offset="0" style={stop("mineral", 0.1)} />
          <stop offset="0.5" style={stop("mineral", 0.03)} />
          <stop offset="1" style={stop("mineral", 0)} />
        </radialGradient>
        <linearGradient id={id("edge-x")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" style={stop("smoke")} />
          <stop offset="1" style={stop("smoke", 0)} />
        </linearGradient>
        <linearGradient id={id("edge-y")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={stop("smoke")} />
          <stop offset="1" style={stop("smoke", 0)} />
        </linearGradient>
        <filter id={id("bloom")} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <filter id={id("wet")} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="9 26" />
        </filter>
        <filter id={id("near")} x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <filter id={id("far")} x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur stdDeviation="0.8" />
        </filter>
      </defs>

      {/* Low sky, brightest above the end of the street */}
      <rect width="1600" height="1000" style={fill("graphite")} />
      <rect width="1600" height="480" fill={url("sky")} />

      {/* Wet paving, with the sky caught in it at the far end */}
      <rect y={VP.y} width="1600" height={1000 - VP.y} fill={url("ground")} />
      <g fill="none" style={stroke("mineral")} strokeWidth="1">
        <path d={paving.rows} strokeOpacity="0.035" />
        <path d={paving.lines} strokeOpacity="0.025" />
      </g>
      <polygon points={GUTTER} style={fill("smoke")} opacity="0.5" />
      <ellipse cx={VP.x} cy={VP.y + 70} rx="70" ry="90" style={fill("mineral")} opacity="0.07" filter={url("wet")} />

      <g filter={url("far")}>
        {/* The end of the street */}
        <polygon points={facing(END.z, LEFT - 4, RIGHT + 4, 0, END.height)} style={fill("graphite")} />
        <polygon points={facing(END.z, LEFT - 4, RIGHT + 4, 0, END.height)} style={fill("mineral")} opacity="0.08" />
        <g style={fill("mineral")}>
          {endWindows.map(({ points: p, opacity }) => (
            <polygon key={p} points={p} opacity={opacity || 0.03} />
          ))}
        </g>

        {facades(leftFar, "wall-left")}
        {facades(right, "wall-right")}

        {/* The corner across the side street, and its café */}
        <polygon points={facing(CORNER.z, CORNER.x0, CORNER.x1, 0, CORNER.height)} style={fill("smoke")} />
        <polygon points={facing(CORNER.z, CORNER.x0, CORNER.x1, CORNER.height, CORNER.height + 2.6)} style={fill("graphite")} />
        <g style={fill("mineral")}>
          {cornerWindows.map(({ points: p, opacity }) => (
            <polygon key={p} points={p} opacity={opacity || 0.025} />
          ))}
        </g>
        <polygon points={facing(CORNER.z, CORNER.x0, CORNER.x1 - 0.5, 0.3, 3.4)} style={fill("mineral")} opacity="0.2" />
        <polygon points={facing(CORNER.z, CORNER.x0, CORNER.x1 - 0.5, 0.3, 3.4)} style={fill("mineral")} opacity="0.4" filter={url("bloom")} />

        <g style={fill("smoke")} opacity="0.85">
          {PASSERS_BY.map(([x, z, h]) => (
            <PasserBy key={`${x}-${z}`} x={x} z={z} height={h} />
          ))}
        </g>
        <Bicycle x={-4.6} z={26} />
      </g>

      {/* Shop light on the wet ground */}
      <g style={fill("mineral")} filter={url("wet")}>
        {[...right.spill, ...leftFar.spill, ...leftNear.spill].map(({ points: p, opacity }) => (
          <polygon key={p} points={p} opacity={opacity} />
        ))}
      </g>
      {glow([right, leftFar])}

      {/* Air between here and the end of the street */}
      <rect width="1600" height="1000" fill={url("haze")} />

      {/* Closest facades, slightly out of focus */}
      <g filter={url("near")}>
        {facades(leftNear, "wall-left")}
        {glow([leftNear])}
      </g>

      {/* Falls into shadow at the edges, so a smaller picture never shows a border */}
      <rect width="160" height="1000" fill={url("edge-x")} />
      <rect width="160" height="1000" fill={url("edge-x")} transform="matrix(-1 0 0 1 1600 0)" />
      <rect width="1600" height="120" fill={url("edge-y")} />
      <rect width="1600" height="120" fill={url("edge-y")} transform="matrix(1 0 0 -1 0 1000)" />
    </svg>
  );
}

/** A bicycle left on the pavement, same picture units as the walkers. */
function Bicycle({ x, z }: { x: number; z: number }) {
  const s = FOCAL / z;
  const [bx, by] = project(x, 0, z);
  const r = (n: number) => (n * s).toFixed(2);
  const w = Math.max(1.1, s * 0.035).toFixed(2);
  return (
    <g
      transform={`translate(${bx.toFixed(1)} ${by.toFixed(1)})`}
      fill="none"
      style={stroke("smoke")}
      strokeWidth={w}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.72"
    >
      <circle cx={r(-0.38)} cy={r(-0.3)} r={r(0.3)} />
      <circle cx={r(0.42)} cy={r(-0.3)} r={r(0.3)} />
      <path d={`M ${r(-0.38)} ${r(-0.3)} L ${r(0.08)} ${r(-0.68)} L ${r(0.42)} ${r(-0.3)}`} />
      <path d={`M ${r(0.08)} ${r(-0.68)} L ${r(-0.08)} ${r(-0.3)} L ${r(-0.38)} ${r(-0.3)}`} />
      <path d={`M ${r(0.08)} ${r(-0.68)} L ${r(0.04)} ${r(-0.86)}`} />
    </g>
  );
}

/** A small figure walking, standing on the ground at (x, z). */
function PasserBy({ x, z, height }: { x: number; z: number; height: number }) {
  const s = FOCAL / z;
  const [bx, by] = project(x, 0, z);
  const r = (n: number) => (n * s).toFixed(2);
  return (
    <g transform={`translate(${bx.toFixed(1)} ${by.toFixed(1)})`}>
      <rect x={r(-0.16)} y={r(-0.92)} width={r(0.13)} height={r(0.92)} rx={r(0.05)} />
      <rect x={r(0.04)} y={r(-0.92)} width={r(0.13)} height={r(0.9)} rx={r(0.05)} transform={`rotate(-4 ${r(0.1)} ${r(-0.92)})`} />
      <rect x={r(-0.24)} y={r(-(height - 0.24))} width={r(0.48)} height={r(height - 1.08)} rx={r(0.14)} />
      <circle cy={r(-(height - 0.12))} r={r(0.115)} />
    </g>
  );
}

/**
 * The interface part of the street, drawn in the same picture units so it stays
 * on the ground: the route ribbon and the ring where it turns.
 * Animation hooks: `.route-line` (reveal by `stroke-dashoffset`, length 1),
 * `.route-pin` (the ring), `.route-pulse` (its echo).
 */
export function StreetRoute({ className }: { className?: string }) {
  const { id, url } = useSvgIds();
  const [cx, cy] = TURN_POINT;

  return (
    <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <defs>
        <mask id={id("reveal")} maskUnits="userSpaceOnUse" x="0" y="0" width="1600" height="1000">
          <path
            className="route-line"
            d={ROUTE_LINE}
            pathLength={1}
            fill="none"
            stroke="white"
            strokeWidth="60"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </mask>
        {/* Faint at the feet, where it would be in the way; clearer towards the turn. */}
        <linearGradient id={id("fade")} x1="0" y1="860" x2="0" y2="540" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={stop("coat", 0)} />
          <stop offset="0.4" style={stop("coat", 0.32)} />
          <stop offset="1" style={stop("coat", 0.75)} />
        </linearGradient>
      </defs>
      <g mask={url("reveal")}>
        <polygon points={ROUTE_RIBBON} fill={url("fade")} />
      </g>
      <g className="route-pin">
        <g transform={`translate(${cx.toFixed(1)} ${cy.toFixed(1)})`} fill="none" style={stroke("coat")}>
          <ellipse className="route-pulse" rx={TURN_RING.rx} ry={TURN_RING.ry} strokeOpacity="0.5" strokeWidth="1.2" />
          <ellipse rx={TURN_RING.rx} ry={TURN_RING.ry} strokeOpacity="0.9" strokeWidth="1.5" />
        </g>
      </g>
    </svg>
  );
}
