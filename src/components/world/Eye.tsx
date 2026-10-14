import { fill, stop, stroke, useSvgIds } from "./paint";

/**
 * Macro of an eye wearing a Lume lens, in a 1600 × 1000 picture centred on the
 * pupil. Stand-in for the macro shot of scene 5. Drawn as separate layers so
 * each moves on its own without repainting the others: the white of the eye,
 * the iris, the pupil, the lens, the interface, the reflections, the lids.
 */
export const EYE = {
  cx: 800,
  cy: 500,
  iris: 272,
  pupil: 76,
  lens: 318,
  /** The interface ring, inside the pupil so it stays there once it contracts. */
  ui: 50,
} as const;

/** Strokes of the interface ring, in picture units. */
export const EYE_UI_STROKE = { line: 1.8, glow: 7 } as const;

const { cx: CX, cy: CY } = EYE;
const VIEWBOX = "0 0 1600 1000";
const TAU = Math.PI * 2;
const polar = (r: number, a: number) => [CX + r * Math.cos(a), CY + r * Math.sin(a)] as const;
const f = (n: number) => n.toFixed(1);

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

/* ---------------------------------------------------------------------------
   Iris: fibres from the pupil to the collarette, then out to the limbus.
   --------------------------------------------------------------------------- */

type Fibre = { d: string; width: number; opacity: number };

function fibres(seed: number, count: number, from: [number, number], to: [number, number], bend: number) {
  const rnd = random(seed);
  const out: Fibre[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * TAU + (rnd() - 0.5) * 0.04;
    const r0 = from[0] + rnd() * (from[1] - from[0]);
    const r1 = to[0] + rnd() * (to[1] - to[0]);
    const mid = (r0 + r1) / 2;
    const twist = (rnd() - 0.5) * bend;
    const [x0, y0] = polar(r0, a);
    const [qx, qy] = polar(mid, a + twist);
    const [x1, y1] = polar(r1, a + twist * 0.4);
    out.push({
      d: `M${f(x0)} ${f(y0)}Q${f(qx)} ${f(qy)} ${f(x1)} ${f(y1)}`,
      width: 0.7 + rnd() * 1.6,
      opacity: 0.05 + rnd() * 0.16,
    });
  }
  return out;
}

const INNER_FIBRES = fibres(3, 190, [58, 72], [118, 152], 0.16);
const OUTER_FIBRES = fibres(5, 280, [132, 160], [236, 268], 0.1);
const SHADOW_FIBRES = fibres(9, 90, [84, 130], [180, 262], 0.12);

/** An uneven closed ring around the pupil, for the collarette and the ruff. */
function wobble(seed: number, radius: number, amplitude: number, steps: number) {
  const rnd = random(seed);
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * TAU;
    const r = radius + Math.sin(a * 7 + rnd()) * amplitude * 0.4 + (rnd() - 0.5) * amplitude;
    const [x, y] = polar(r, a);
    d += `${i ? "L" : "M"}${f(x)} ${f(y)}`;
  }
  return `${d}Z`;
}

/** The collarette, where the two fibre zones meet. */
const COLLARETTE = wobble(13, 142, 10, 72);
/** The pupillary ruff, the dark crinkled rim of the pupil (scales with it). */
const RUFF = wobble(19, EYE.pupil + 3, 3.2, 120);

/** Faint vessels in the white, from the corners towards the iris. */
const VESSELS = (() => {
  const rnd = random(37);
  return Array.from({ length: 12 }, (_, i) => {
    const left = i % 2 === 0;
    const x0 = left ? 160 + rnd() * 140 : 1440 - rnd() * 160;
    const y0 = 420 + rnd() * 200;
    const x1 = left ? CX - EYE.iris - 30 - rnd() * 90 : CX + EYE.iris + 30 + rnd() * 90;
    const y1 = CY + (rnd() - 0.5) * 300;
    const mx = (x0 + x1) / 2 + (rnd() - 0.5) * 80;
    const my = (y0 + y1) / 2 + (rnd() - 0.5) * 120;
    return { d: `M${f(x0)} ${f(y0)}Q${f(mx)} ${f(my)} ${f(x1)} ${f(y1)}`, width: 0.8 + rnd() * 1.8 };
  });
})();

/** Crypts: small dark hollows around the collarette, elongated along the radius. */
const CRYPTS = (() => {
  const rnd = random(17);
  return Array.from({ length: 22 }, (_, i) => {
    const a = (i / 22) * TAU + (rnd() - 0.5) * 0.5;
    const r = 158 + rnd() * 70;
    const [x, y] = polar(r, a);
    return { x, y, rx: 3 + rnd() * 7, ry: 8 + rnd() * 16, angle: (a * 180) / Math.PI + 90, opacity: 0.15 + rnd() * 0.3 };
  });
})();

/** Contraction furrows: broken arcs near the edge of the iris. */
const FURROWS = [226, 243].map((r, k) => {
  const rnd = random(29 + k);
  const dashes = Array.from({ length: 14 }, () => `${(12 + rnd() * 40).toFixed(0)} ${(10 + rnd() * 30).toFixed(0)}`).join(" ");
  return { r, dashes };
});

const UI_TICKS = Array.from({ length: 24 }, (_, i) => {
  const a = (i / 24) * TAU;
  const [x0, y0] = polar(EYE.ui + 6, a);
  const [x1, y1] = polar(EYE.ui + 9, a);
  return `M${f(x0)} ${f(y0)}L${f(x1)} ${f(y1)}`;
}).join("");

/* ---------------------------------------------------------------------------
   Lids: both curves run from the inner corner (left) to the outer one and
   meet on the same line when the eye is closed.
   --------------------------------------------------------------------------- */

type Curve = readonly [number, number, number, number];
const CORNER_IN = [120, 560] as const;
const CORNER_OUT = [1480, 470] as const;
const UPPER_OPEN: Curve = [420, 160, 1180, 140];
const LOWER_OPEN: Curve = [460, 900, 1160, 880];
const CLOSED: Curve = [460, 650, 1160, 630];

const mix = (a: Curve, b: Curve, t: number) => a.map((v, i) => v + (b[i] - v) * t) as unknown as Curve;
const curve = ([x1, y1, x2, y2]: Curve) =>
  `M${CORNER_IN[0]} ${CORNER_IN[1]}C${f(x1)} ${f(y1)} ${f(x2)} ${f(y2)} ${CORNER_OUT[0]} ${CORNER_OUT[1]}`;
const back = ([x1, y1, x2, y2]: Curve) => `C${f(x2)} ${f(y2)} ${f(x1)} ${f(y1)} ${CORNER_IN[0]} ${CORNER_IN[1]}`;

/** Paths of the lids for an opening from 0 (closed) to 1 (open). */
/** Closed, the lids overlap a little so no seam shows between them. */
const CLOSED_UPPER = CLOSED.map((v, i) => (i % 2 ? v + 14 : v)) as unknown as Curve;
const CLOSED_LOWER = CLOSED.map((v, i) => (i % 2 ? v - 14 : v)) as unknown as Curve;

export function lidPaths(open: number) {
  const upper = mix(CLOSED_UPPER, UPPER_OPEN, open);
  const lower = mix(CLOSED_LOWER, LOWER_OPEN, open);
  return {
    upper: `M-60 -60H1660V${CORNER_OUT[1]}H${CORNER_OUT[0]}${back(upper)}H-60Z`,
    lower: `M-60 1060H1660V${CORNER_OUT[1]}H${CORNER_OUT[0]}${back(lower)}H-60Z`,
    upperEdge: curve(upper),
    lowerEdge: curve(lower),
  };
}

const OPEN_LIDS = lidPaths(1);

/* ---------------------------------------------------------------------------
   Layers
   --------------------------------------------------------------------------- */

const layer = "absolute inset-0 size-full";

/** Everything at once, each layer with its class hook (see `ContactLens`). */
export function Eye() {
  const { id, url } = useSvgIds();

  return (
    <>
      {/* The white of the eye, in the shade of the lids */}
      <svg viewBox={VIEWBOX} className={`eye-back ${layer}`} aria-hidden>
        <defs>
          <radialGradient id={id("white")} cx={CX - 120} cy={CY - 40} r="760" gradientUnits="userSpaceOnUse">
            <stop offset="0" style={stop("mineral", 0.36)} />
            <stop offset="0.45" style={stop("mineral", 0.22)} />
            <stop offset="0.8" style={stop("mineral", 0.07)} />
            <stop offset="1" style={stop("mineral", 0.02)} />
          </radialGradient>
          <filter id={id("soft")} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="18" />
          </filter>
          <filter id={id("vessel")} x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="1.1" />
          </filter>
        </defs>
        <rect width="1600" height="1000" style={fill("smoke")} />
        <path d={`${curve(UPPER_OPEN)}${back(LOWER_OPEN)}Z`} style={fill("graphite")} />
        <path d={`${curve(UPPER_OPEN)}${back(LOWER_OPEN)}Z`} fill={url("white")} />
        <g fill="none" style={stroke("smoke")} strokeOpacity="0.09" strokeLinecap="round" filter={url("vessel")}>
          {VESSELS.map(({ d, width }) => (
            <path key={d} d={d} strokeWidth={width} />
          ))}
        </g>
        {/* The eyeball turns away from the light towards the outer corner */}
        <ellipse cx="1340" cy="520" rx="260" ry="320" style={fill("smoke")} opacity="0.55" filter={url("soft")} />
        <ellipse cx="190" cy="555" rx="70" ry="44" style={fill("graphite")} opacity="0.8" filter={url("soft")} />
      </svg>

      <svg viewBox={VIEWBOX} className={`eye-iris ${layer} will-change-transform`} aria-hidden>
        <defs>
          <radialGradient id={id("iris")} cx={CX} cy={CY} r={EYE.iris} gradientUnits="userSpaceOnUse">
            <stop offset="0.2" style={stop("smoke")} />
            <stop offset="0.3" style={stop("graphite")} />
            <stop offset="0.42" style={stop("fog", 0.95)} />
            <stop offset="0.55" style={stop("mist", 0.62)} />
            <stop offset="0.7" style={stop("fog", 0.85)} />
            <stop offset="0.88" style={stop("fog", 0.6)} />
            <stop offset="0.95" style={stop("graphite")} />
            <stop offset="1" style={stop("smoke")} />
          </radialGradient>
          <radialGradient id={id("caustic")} cx={CX + 110} cy={CY + 120} r="200" gradientUnits="userSpaceOnUse">
            <stop offset="0" style={stop("mineral", 0.22)} />
            <stop offset="1" style={stop("mineral", 0)} />
          </radialGradient>
          <radialGradient id={id("limbus")} cx={CX} cy={CY} r={EYE.iris + 10} gradientUnits="userSpaceOnUse">
            <stop offset="0.88" style={stop("smoke", 0)} />
            <stop offset="0.97" style={stop("smoke", 0.85)} />
            <stop offset="1" style={stop("smoke", 0)} />
          </radialGradient>
          <clipPath id={id("disc")}>
            <circle cx={CX} cy={CY} r={EYE.iris} />
          </clipPath>
          <filter id={id("grain")} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" />
            <feColorMatrix values="0 0 0 0 0.89  0 0 0 0 0.9  0 0 0 0 0.88  0 0 0 0.9 -0.3" />
          </filter>
          <filter id={id("blur-1")} x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="1" />
          </filter>
          <filter id={id("blur-3")} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.4" />
          </filter>
        </defs>

        <circle cx={CX} cy={CY} r={EYE.iris} fill={url("iris")} />
        <g clipPath={url("disc")}>
          <g fill="none" style={stroke("smoke")} strokeLinecap="round" filter={url("blur-1")}>
            {SHADOW_FIBRES.map(({ d, width, opacity }) => (
              <path key={d} d={d} strokeWidth={width * 1.8} strokeOpacity={opacity * 1.6} />
            ))}
          </g>
          <g fill="none" style={stroke("mineral")} strokeLinecap="round" filter={url("blur-1")}>
            {INNER_FIBRES.map(({ d, width, opacity }) => (
              <path key={d} d={d} strokeWidth={width} strokeOpacity={opacity} />
            ))}
            {OUTER_FIBRES.map(({ d, width, opacity }) => (
              <path key={d} d={d} strokeWidth={width} strokeOpacity={opacity * 0.6} />
            ))}
          </g>
          <path d={COLLARETTE} fill="none" style={stroke("mineral")} strokeOpacity="0.09" strokeWidth="9" filter={url("blur-3")} />
          <g style={fill("smoke")} filter={url("blur-3")}>
            {CRYPTS.map((c) => (
              <ellipse
                key={`${c.x}-${c.y}`}
                cx={f(c.x)}
                cy={f(c.y)}
                rx={f(c.rx)}
                ry={f(c.ry)}
                opacity={c.opacity}
                transform={`rotate(${f(c.angle)} ${f(c.x)} ${f(c.y)})`}
              />
            ))}
          </g>
          <g fill="none" style={stroke("smoke")} strokeOpacity="0.2" strokeWidth="2.6" filter={url("blur-1")}>
            {FURROWS.map(({ r, dashes }) => (
              <circle key={r} cx={CX} cy={CY} r={r} strokeDasharray={dashes} />
            ))}
          </g>
          <rect x={CX - EYE.iris} y={CY - EYE.iris} width={EYE.iris * 2} height={EYE.iris * 2} filter={url("grain")} opacity="0.1" />
          <circle cx={CX} cy={CY} r={EYE.iris} fill={url("caustic")} />
        </g>
        <circle cx={CX} cy={CY} r={EYE.iris + 10} fill={url("limbus")} />
      </svg>

      {/* The pupil, alone, so it can contract without repainting the iris */}
      <svg viewBox={VIEWBOX} className={`eye-pupil ${layer} will-change-transform`} aria-hidden>
        <defs>
          <radialGradient id={id("pupil")} cx={CX} cy={CY} r={EYE.pupil} gradientUnits="userSpaceOnUse">
            <stop offset="0.9" style={stop("smoke")} />
            <stop offset="1" style={stop("smoke", 0)} />
          </radialGradient>
          <filter id={id("ruff")} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.6" />
          </filter>
        </defs>
        <path d={RUFF} fill="none" style={stroke("graphite")} strokeOpacity="0.9" strokeWidth="9" filter={url("ruff")} />
        <circle cx={CX} cy={CY} r={EYE.pupil} fill={url("pupil")} />
      </svg>

      {/* The lens: an edge that barely shows, and the trace of its coating */}
      <svg viewBox={VIEWBOX} className={`eye-lens ${layer} will-change-transform`} aria-hidden>
        <defs>
          <radialGradient id={id("film")} cx={CX} cy={CY} r={EYE.lens} gradientUnits="userSpaceOnUse">
            <stop offset="0.86" style={stop("mineral", 0)} />
            <stop offset="0.985" style={stop("mineral", 0.035)} />
            <stop offset="1" style={stop("mineral", 0)} />
          </radialGradient>
          <filter id={id("sheen")} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          <filter id={id("edge")} x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur stdDeviation="0.9" />
          </filter>
        </defs>
        <circle cx={CX} cy={CY} r={EYE.lens} fill={url("film")} />
        <circle cx={CX} cy={CY} r={EYE.lens} fill="none" style={stroke("mineral")} strokeOpacity="0.07" strokeWidth="2.4" filter={url("edge")} />
        <path d={arc(EYE.lens - 4, 112, 205)} fill="none" style={stroke("coat")} strokeOpacity="0.32" strokeWidth="16" strokeLinecap="round" filter={url("sheen")} />
        <path d={arc(EYE.lens - 3, 120, 196)} fill="none" style={stroke("coat")} strokeOpacity="0.34" strokeWidth="1.4" strokeLinecap="round" />
        <path d={arc(EYE.lens, -62, -18)} fill="none" style={stroke("mineral")} strokeOpacity="0.18" strokeWidth="2" strokeLinecap="round" filter={url("edge")} />
      </svg>

      {/* The interface, lit in the pupil: a ring and the timer's progress */}
      <svg viewBox={VIEWBOX} className={`eye-ui ${layer}`} aria-hidden>
        <g transform={`rotate(-90 ${CX} ${CY})`} fill="none" style={stroke("coat")}>
          <circle className="eye-ui-arc" cx={CX} cy={CY} r={EYE.ui} pathLength={1} strokeWidth={EYE_UI_STROKE.glow} strokeOpacity="0.18" strokeDasharray="0.72 1" />
          <circle className="eye-ui-arc" cx={CX} cy={CY} r={EYE.ui} pathLength={1} strokeWidth={EYE_UI_STROKE.line} strokeOpacity="0.95" strokeDasharray="0.72 1" />
        </g>
        <path className="eye-ui-ticks" d={UI_TICKS} fill="none" style={stroke("coat")} strokeOpacity="0.45" strokeWidth="1" />
      </svg>

      {/* What the cornea reflects: the kitchen window, a lamp */}
      <svg viewBox={VIEWBOX} className={`eye-glints ${layer} will-change-transform`} aria-hidden>
        <defs>
          <filter id={id("glint")} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.3" />
          </filter>
          <filter id={id("wide")} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
        </defs>
        <g filter={url("glint")} transform="translate(648 330) rotate(-8) skewX(-6)">
          <rect width="62" height="84" rx="9" style={fill("mineral")} opacity="0.5" />
          <g style={fill("smoke")} opacity="0.55">
            <rect x="29.5" width="3" height="84" />
            <rect y="27" width="62" height="3" />
            <rect y="55" width="62" height="3" />
          </g>
        </g>
        <circle cx="736" cy="338" r="6" style={fill("mineral")} opacity="0.9" filter={url("glint")} />
        <circle cx="902" cy="652" r="3" style={fill("mineral")} opacity="0.35" filter={url("glint")} />
        <path d={arc(236, 18, 74)} fill="none" style={stroke("mineral")} strokeOpacity="0.07" strokeWidth="34" filter={url("wide")} />
      </svg>

      {/* Lids, with the shade the upper one casts and the wet rim of the lower one */}
      <svg viewBox={VIEWBOX} className={`eye-lids ${layer}`} aria-hidden>
        <defs>
          <filter id={id("rim")} x="-5%" y="-20%" width="110%" height="140%">
            <feGaussianBlur stdDeviation="1.8" />
          </filter>
        </defs>
        <g fill="none" style={stroke("smoke")}>
          <path className="eye-lid-shade" d={OPEN_LIDS.upperEdge} strokeWidth="150" strokeOpacity="0.22" />
          <path className="eye-lid-shade" d={OPEN_LIDS.upperEdge} strokeWidth="80" strokeOpacity="0.3" />
          <path className="eye-lid-shade" d={OPEN_LIDS.upperEdge} strokeWidth="34" strokeOpacity="0.42" />
        </g>
        <path className="eye-lid-upper" d={OPEN_LIDS.upper} style={fill("smoke")} />
        <path className="eye-lid-lower" d={OPEN_LIDS.lower} style={fill("smoke")} />
        <g className="eye-lid-rims" fill="none" style={stroke("mineral")} filter={url("rim")}>
          <path className="eye-lid-upper-edge" d={OPEN_LIDS.upperEdge} strokeOpacity="0.08" strokeWidth="3" />
          <path className="eye-lid-lower-edge" d={OPEN_LIDS.lowerEdge} strokeOpacity="0.22" strokeWidth="3.4" />
        </g>
      </svg>

      {/* The edge of the iris, lit: on the way out it becomes the ring of scene 6.
          Above the lids, so it stays when they close. Stroke widths are set in
          picture units by the scene, to match the handoff ring in px. */}
      <svg viewBox={VIEWBOX} className={`eye-limbus ${layer} invisible`} aria-hidden>
        <g transform={`rotate(-90 ${CX} ${CY})`} fill="none" style={stroke("coat")}>
          <circle className="eye-limbus-arc eye-limbus-bloom" cx={CX} cy={CY} r={EYE.iris} pathLength={1} strokeWidth="22" strokeOpacity="0.07" strokeDasharray="0 1" />
          <circle className="eye-limbus-arc eye-limbus-glow" cx={CX} cy={CY} r={EYE.iris} pathLength={1} strokeWidth={EYE_UI_STROKE.glow} strokeOpacity="0.18" strokeDasharray="0 1" />
          <circle className="eye-limbus-arc eye-limbus-line" cx={CX} cy={CY} r={EYE.iris} pathLength={1} strokeWidth={EYE_UI_STROKE.line} strokeOpacity="0.95" strokeDasharray="0 1" />
        </g>
      </svg>
    </>
  );
}

/** An arc of a circle around the pupil, angles in degrees (0 = right, clockwise). */
function arc(r: number, fromDeg: number, toDeg: number) {
  const a0 = (fromDeg * Math.PI) / 180;
  const a1 = (toDeg * Math.PI) / 180;
  const [x0, y0] = polar(r, a0);
  const [x1, y1] = polar(r, a1);
  const large = Math.abs(toDeg - fromDeg) > 180 ? 1 : 0;
  return `M${f(x0)} ${f(y0)}A${r} ${r} 0 ${large} 1 ${f(x1)} ${f(y1)}`;
}
