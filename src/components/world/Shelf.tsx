import { fill, stop, stroke, useSvgIds } from "./paint";

/**
 * Stand-in for the shot of scene 7: the wine shelf of a small grocery in the
 * evening, a little out of focus, in a 1600 × 1000 picture. Dry goods above,
 * wine in the middle, tins and oil below. One bottle of dry white is left,
 * the one the list is still waiting for.
 * Filters are rasterised once: move it with transforms only.
 */

const W = 1600;
const SHELVES = [330, 610, 890] as const;
const PLANK = 24;

type Kind = "wine" | "white" | "oil" | "jar" | "box" | "can";
type Item = { kind: Kind; x: number; w: number; h: number; tone: number; label: number };

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

const SIZE: Record<Kind, [number, number, number, number]> = {
  // width min, width max, height min, height max
  wine: [42, 48, 196, 214],
  white: [42, 46, 200, 212],
  oil: [32, 38, 214, 236],
  jar: [56, 74, 78, 104],
  box: [66, 104, 118, 176],
  can: [44, 52, 64, 78],
};

function row(seed: number, pick: (r: number, i: number) => Kind, gap: [number, number]) {
  const rnd = random(seed);
  const items: Item[] = [];
  let x = 70;
  for (let i = 0; x < W - 70; i++) {
    const kind = pick(rnd(), i);
    const [w0, w1, h0, h1] = SIZE[kind];
    const w = w0 + rnd() * (w1 - w0);
    if (x + w > W - 70) break;
    items.push({ kind, x: x + w / 2, w, h: h0 + rnd() * (h1 - h0), tone: rnd(), label: rnd() });
    x += w + gap[0] + rnd() * (gap[1] - gap[0]);
  }
  return items;
}

const DRY = row(11, (r) => (r < 0.62 ? "box" : "jar"), [8, 22]);
const WINE = row(23, (r) => (r < 0.78 ? "wine" : "white"), [5, 13]);
const LOW = row(41, (r) => (r < 0.45 ? "can" : r < 0.75 ? "jar" : "oil"), [8, 20]);

/** The gap in the wine: a run of reds, one white left, and the empty space where the others were. */
const WINE_SHELF = (() => {
  const target = WINE.reduce((best, item) => (Math.abs(item.x - 1030) < Math.abs(best.x - 1030) ? item : best), WINE[0]);
  const at = WINE.indexOf(target);
  const out = WINE.filter((item, i) => !(i === at + 1 || i === at + 2) && (i === at || item.kind === "wine"));
  return { items: out, target: { ...target, kind: "white" as const, tone: 0.5, label: 0.9 } };
})();
const WINE_ITEMS = WINE_SHELF.items.map((item) => (item.x === WINE_SHELF.target.x ? WINE_SHELF.target : item));

export const SHELF = {
  /** The white wine, in fractions of the picture (left, top, width, height). */
  wine: {
    x: (WINE_SHELF.target.x - WINE_SHELF.target.w / 2) / W,
    y: (SHELVES[1] - WINE_SHELF.target.h) / 1000,
    w: WINE_SHELF.target.w / W,
    h: WINE_SHELF.target.h / 1000,
  },
} as const;

const f = (n: number) => n.toFixed(1);

function bottle(x: number, base: number, w: number, h: number, neck: number, shoulder = 0.6) {
  const l = x - w / 2;
  const r = x + w / 2;
  const nl = x - neck / 2;
  const nr = x + neck / 2;
  const s = base - h * shoulder;
  const n = base - h * (shoulder + 0.17);
  return `M${f(l)} ${f(base)}L${f(l)} ${f(s)}C${f(l)} ${f(s - h * 0.1)} ${f(nl)} ${f(s - h * 0.09)} ${f(nl)} ${f(n)}L${f(nl)} ${f(base - h)}L${f(nr)} ${f(base - h)}L${f(nr)} ${f(n)}C${f(nr)} ${f(s - h * 0.09)} ${f(r)} ${f(s - h * 0.1)} ${f(r)} ${f(s)}L${f(r)} ${f(base)}Z`;
}

function Product({ item, base }: { item: Item; base: number }) {
  const { kind, x, w, h, tone, label } = item;
  const top = base - h;
  if (kind === "wine" || kind === "white" || kind === "oil") {
    const white = kind === "white";
    const oil = kind === "oil";
    const neck = w * (oil ? 0.36 : 0.31);
    const shoulder = oil ? 0.52 : 0.6;
    return (
      <g>
        <path d={bottle(x, base, w, h, neck, shoulder)} style={fill(white ? "fog" : "graphite")} opacity={white ? 0.95 : 0.85 + tone * 0.15} />
        {white && <path d={bottle(x, base, w, h, neck, shoulder)} style={fill("mineral")} opacity="0.16" />}
        {/* Foil, then the label */}
        <rect x={f(x - neck / 2 - 0.5)} y={f(top)} width={f(neck + 1)} height={f(h * 0.12)} style={fill(white ? "mist" : "fog")} opacity={white ? 0.7 : 0.35 + tone * 0.25} />
        <rect x={f(x - w / 2 + 3)} y={f(base - h * 0.44)} width={f(w - 6)} height={f(h * (oil ? 0.2 : 0.24))} style={fill("mineral")} opacity={white ? 0.62 : 0.12 + label * 0.22} />
        <rect x={f(x - w / 2 + 8)} y={f(base - h * 0.37)} width={f(w - 16)} height="2.2" style={fill("smoke")} opacity={white ? 0.5 : 0.2} />
        <rect x={f(x - w / 2 + 11)} y={f(base - h * 0.32)} width={f(w - 22)} height="1.6" style={fill("smoke")} opacity={white ? 0.35 : 0.15} />
        {/* The glass catches the strip light */}
        <rect x={f(x - w * 0.32)} y={f(base - h * (shoulder - 0.02))} width={f(w * 0.09)} height={f(h * (shoulder - 0.1))} rx="2" style={fill("mineral")} opacity={white ? 0.34 : 0.16} />
        <rect x={f(x - neck * 0.3)} y={f(top + h * 0.13)} width={f(neck * 0.18)} height={f(h * 0.16)} style={fill("mineral")} opacity="0.14" />
      </g>
    );
  }
  if (kind === "jar") {
    return (
      <g>
        <rect x={f(x - w / 2)} y={f(top + 12)} width={f(w)} height={f(h - 12)} rx="9" style={fill(tone > 0.5 ? "fog" : "graphite")} opacity="0.9" />
        <rect x={f(x - w / 2 + 3)} y={f(top)} width={f(w - 6)} height="14" rx="3" style={fill("mist")} opacity={0.3 + tone * 0.3} />
        <rect x={f(x - w / 2 + 6)} y={f(top + h * 0.42)} width={f(w - 12)} height={f(h * 0.32)} style={fill("mineral")} opacity={0.1 + label * 0.2} />
        <rect x={f(x - w * 0.36)} y={f(top + 20)} width={f(w * 0.08)} height={f(h * 0.6)} rx="2" style={fill("mineral")} opacity="0.14" />
      </g>
    );
  }
  if (kind === "can") {
    return (
      <g>
        <rect x={f(x - w / 2)} y={f(top)} width={f(w)} height={f(h)} rx="3" style={fill(tone > 0.6 ? "mist" : "fog")} opacity={0.42 + tone * 0.2} />
        <rect x={f(x - w / 2)} y={f(top + h * 0.22)} width={f(w)} height={f(h * 0.5)} style={fill(label > 0.5 ? "graphite" : "mineral")} opacity={label > 0.5 ? 0.6 : 0.18} />
        <rect x={f(x - w * 0.34)} y={f(top + 3)} width={f(w * 0.08)} height={f(h - 6)} style={fill("mineral")} opacity="0.2" />
      </g>
    );
  }
  return (
    <g>
      <rect x={f(x - w / 2)} y={f(top)} width={f(w)} height={f(h)} style={fill(tone > 0.55 ? "fog" : "graphite")} opacity={0.75 + tone * 0.2} />
      <rect x={f(x - w / 2)} y={f(top + h * 0.12)} width={f(w)} height={f(h * 0.08)} style={fill("mineral")} opacity={0.08 + label * 0.14} />
      <rect x={f(x - w / 2 + 8)} y={f(top + h * 0.38)} width={f(w - 16)} height={f(h * 0.3)} style={fill("mineral")} opacity={0.06 + label * 0.12} />
      <rect x={f(x + w / 2 - 6)} y={f(top)} width="6" height={f(h)} style={fill("smoke")} opacity="0.35" />
    </g>
  );
}

export function Shelf({ className }: { className?: string }) {
  const { id, url } = useSvgIds();
  const rows: [Item[], number][] = [
    [DRY, SHELVES[0]],
    [WINE_ITEMS, SHELVES[1]],
    [LOW, SHELVES[2]],
  ];

  return (
    <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <defs>
        <linearGradient id={id("wall")} x1="0" y1="0" x2="0" y2="1000" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={stop("graphite")} />
          <stop offset="0.5" style={stop("smoke")} />
          <stop offset="1" style={stop("smoke")} />
        </linearGradient>
        {/* Each bay is darker at the top, in the shade of the plank above */}
        <linearGradient id={id("bay")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={stop("smoke", 0.85)} />
          <stop offset="0.45" style={stop("smoke", 0.25)} />
          <stop offset="1" style={stop("mineral", 0.05)} />
        </linearGradient>
        <linearGradient id={id("plank")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={stop("mist", 0.55)} />
          <stop offset="0.18" style={stop("fog", 0.6)} />
          <stop offset="1" style={stop("graphite")} />
        </linearGradient>
        <radialGradient id={id("light")} cx="560" cy="-80" r="1200" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={stop("mineral", 0.16)} />
          <stop offset="0.6" style={stop("mineral", 0.03)} />
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
        <filter id={id("focus")} x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur stdDeviation="1.3" />
        </filter>
        <filter id={id("near")} x="-20%" y="-5%" width="140%" height="110%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <filter id={id("tube")} x="-10%" y="-200%" width="120%" height="500%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>

      <rect width="1600" height="1000" fill={url("wall")} />

      <g filter={url("focus")}>
        {rows.map(([items, base], r) => (
          <g key={base}>
            {/* The back of the bay, from the plank above down to this one */}
            <rect x="40" y={r ? SHELVES[r - 1] + PLANK : 40} width="1520" height={base - (r ? SHELVES[r - 1] + PLANK : 40)} fill={url("bay")} />
            {items.map((item) => (
              <Product key={`${item.kind}-${item.x.toFixed(1)}`} item={item} base={base} />
            ))}
            {/* The plank and the price rail on its edge */}
            <rect x="30" y={base} width="1540" height={PLANK} fill={url("plank")} />
            <rect x="30" y={base} width="1540" height="1.5" style={fill("mineral")} opacity="0.3" />
            <g style={fill("mineral")} opacity="0.5">
              {items
                .filter((_, i) => i % 3 === 0)
                .map((item) => (
                  <rect key={item.x} x={f(item.x - 17)} y={base + 6} width="34" height="13" rx="1.5" />
                ))}
            </g>
            <g style={fill("smoke")} opacity="0.55">
              {items
                .filter((_, i) => i % 3 === 0)
                .map((item) => (
                  <rect key={item.x} x={f(item.x - 12)} y={base + 10} width="16" height="2" />
                ))}
            </g>
          </g>
        ))}
      </g>

      {/* The strip light above the aisle, and what it lays on everything */}
      <rect x="140" y="6" width="1100" height="10" rx="5" style={fill("mineral")} opacity="0.5" filter={url("tube")} />
      <rect width="1600" height="1000" fill={url("light")} />

      {/* Uprights of the shelving, closer, out of focus */}
      <g style={fill("smoke")} filter={url("near")}>
        <rect x="0" y="0" width="64" height="1000" />
        <rect x="1540" y="0" width="60" height="1000" />
      </g>
      <g fill="none" style={stroke("mineral")} strokeOpacity="0.08" strokeWidth="3" filter={url("near")}>
        <path d="M66 0V1000" />
        <path d="M1538 0V1000" />
      </g>

      <rect width="140" height="1000" fill={url("edge-x")} />
      <rect width="140" height="1000" fill={url("edge-x")} transform="matrix(-1 0 0 1 1600 0)" />
      <rect width="1600" height="110" fill={url("edge-y")} />
      <rect width="1600" height="110" fill={url("edge-y")} transform="matrix(1 0 0 -1 0 1000)" />
    </svg>
  );
}
