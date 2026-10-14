type Mapper = (x: number, y: number) => [number, number];

const round = (n: number) => String(Math.round(n * 100) / 100);

/** Re-projects an absolute path made of M / L / C / Z commands. */
export function mapPath(d: string, map: Mapper): string {
  const out: string[] = [];
  let pendingX: number | null = null;
  for (const token of d.trim().split(/[\s,]+/)) {
    if (/^[A-Za-z]$/.test(token)) {
      out.push(token);
      continue;
    }
    const n = Number(token);
    if (pendingX === null) {
      pendingX = n;
    } else {
      const [x, y] = map(pendingX, n);
      out.push(round(x), round(y));
      pendingX = null;
    }
  }
  return out.join(" ");
}

/**
 * Lens outline of the Orée frame in local units, centred on (0, 0), nose side
 * towards +x. Classic panto: straight brow, broad rounded bottom, 1.39 ratio.
 */
export const LENS_LOCAL =
  "M 0 -100 C 56 -101 104 -100 126 -92 C 146 -84 151 -62 150 -38 C 149 -6 144 30 126 62 C 104 98 60 116 6 116 C -54 116 -108 104 -134 70 C -150 46 -154 2 -152 -44 C -151 -78 -138 -96 -100 -100 C -66 -102 -32 -100 0 -100 Z";

export const GLASSES_VIEWBOX = { x: 176, y: 92, width: 848, height: 284 } as const;

export const LENS_CENTER = {
  left: { x: 390, y: 228 },
  right: { x: 810, y: 228 },
} as const;

/**
 * Where the camera aims when entering the left lens: slightly off the lens
 * centre, away from the cut of the nose pad, so the safe rectangle fits.
 */
export const LENS_AIM = { x: 382, y: 232 } as const;

/**
 * A rectangle centred on `LENS_AIM` that stays inside the lens outline, corners
 * included (lens units). Tells when the lens fully covers the screen.
 */
export const LENS_SAFE_RECT = { width: 220, height: 150 } as const;

/** Vertical extent of the front, for gradients. */
export const FRAME_BOUNDS = { top: 109, bottom: 355 } as const;

/** Acetate rim: ~19 units at the brow, ~11 at the lower rim, ~13 on the sides. */
const RIM = { sx: 1.085, sy: 1.14, dy: -5 } as const;

const MIRROR_X = 1200;
const mirror = (d: string) => mapPath(d, (x, y) => [MIRROR_X - x, y]);

export const LENS_LEFT = mapPath(LENS_LOCAL, (x, y) => [
  LENS_CENTER.left.x + x,
  LENS_CENTER.left.y + y,
]);
export const LENS_RIGHT = mirror(LENS_LEFT);

const RIM_LEFT = mapPath(LENS_LOCAL, (x, y) => [
  LENS_CENTER.left.x + x * RIM.sx,
  LENS_CENTER.left.y + y * RIM.sy + RIM.dy,
]);

const BRIDGE =
  "M 470 108.5 C 540 108.5 568 123 600 123 C 632 123 660 108.5 730 108.5 L 730 180 C 670 156 628 147 600 147 C 572 147 530 156 470 180 Z";

/** Squares off the outer top corner and carries the hinge. */
const END_PIECE_LEFT =
  "M 300 109 L 213 109 C 203 109 196 115 196 125 L 196 140 C 196 148 202 152 210 152 L 300 152 Z";

/**
 * Solid silhouette pieces of the front. They overlap freely: the lens holes are
 * cut afterwards with a mask, so no piece can ever cover the glass.
 */
export const FRAME_PIECES = [
  RIM_LEFT,
  mirror(RIM_LEFT),
  BRIDGE,
  END_PIECE_LEFT,
  mirror(END_PIECE_LEFT),
] as const;

/**
 * Where the acetate is, for hit-testing (fill-rule evenodd): each rim minus its
 * lens, plus the other pieces. The bridge slightly overlaps the nose corners
 * of the lenses, which is fine for probing.
 */
export const FRAME_HIT_AREAS = [
  `${RIM_LEFT} ${LENS_LEFT}`,
  `${mirror(RIM_LEFT)} ${LENS_RIGHT}`,
  BRIDGE,
  END_PIECE_LEFT,
  mirror(END_PIECE_LEFT),
] as const;

export const RIVETS: ReadonlyArray<{ cx: number; cy: number }> = [
  { cx: 213, cy: 127 },
  { cx: 230, cy: 127 },
  { cx: MIRROR_X - 213, cy: 127 },
  { cx: MIRROR_X - 230, cy: 127 },
];
