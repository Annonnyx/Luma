import { fill, stop as color, stroke, useSvgIds } from "./paint";

/** Sun patch: a two-by-three window, in its own units before projection on the wall. */
const WINDOW = { width: 380, height: 470, bar: 18, cols: 2, rows: 3 } as const;
const PANE_W = (WINDOW.width - WINDOW.bar * (WINDOW.cols - 1)) / WINDOW.cols;
const PANE_H = (WINDOW.height - WINDOW.bar * (WINDOW.rows - 1)) / WINDOW.rows;
const PANES = Array.from({ length: WINDOW.cols * WINDOW.rows }, (_, i) => ({
  x: (i % WINDOW.cols) * (PANE_W + WINDOW.bar),
  y: Math.floor(i / WINDOW.cols) * (PANE_H + WINDOW.bar),
}));

/** Low sun from the left: the patch leans and its top edge falls to the right. */
const SUN_PROJECTION = "matrix(1 0.16 -0.28 1 760 150)";

/**
 * Stand-in for the room video of scene 3: a dim interior in late-afternoon
 * light. What matters is what the glass will blur: one bright window patch
 * with the shadow of its bars, a floor, an out-of-focus table edge.
 * The filters are rasterised once: move it with transforms only.
 */
export function Room({ className }: { className?: string }) {
  const { id, url } = useSvgIds();

  const panes = PANES.map(({ x, y }) => (
    <rect key={`${x}-${y}`} x={x} y={y} width={PANE_W} height={PANE_H} />
  ));

  return (
    <svg
      viewBox="0 0 1600 1000"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={id("wall")} x1="0" y1="0" x2="1" y2="0.35">
          <stop offset="0" style={color("smoke")} />
          <stop offset="0.55" style={color("graphite")} />
          <stop offset="1" style={color("smoke")} />
        </linearGradient>
        <linearGradient id={id("floor")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={color("graphite")} />
          <stop offset="1" style={color("smoke")} />
        </linearGradient>
        <radialGradient id={id("bounce")} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" style={color("mineral", 0.11)} />
          <stop offset="1" style={color("mineral", 0)} />
        </radialGradient>
        <linearGradient id={id("beam")} x1="0" y1="0" x2="1" y2="0.6">
          <stop offset="0" style={color("mineral", 0)} />
          <stop offset="0.65" style={color("mineral", 0.06)} />
          <stop offset="1" style={color("mineral", 0)} />
        </linearGradient>
        <filter id={id("penumbra")} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="4.5" />
        </filter>
        <filter id={id("bloom")} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="46" />
        </filter>
        <filter id={id("defocus")} x="-30%" y="-60%" width="160%" height="220%">
          <feGaussianBlur stdDeviation="16" />
        </filter>
      </defs>

      {/* Wall, lit indirectly around the patch */}
      <rect width="1600" height="1000" fill={url("wall")} />
      <ellipse cx="900" cy="430" rx="640" ry="430" fill={url("bounce")} />

      {/* Floor and the line where it meets the wall */}
      <rect y="790" width="1600" height="210" fill={url("floor")} />
      <rect y="788" width="1600" height="3" style={fill("mineral")} opacity="0.05" />
      <ellipse cx="830" cy="884" rx="380" ry="46" style={fill("mineral")} opacity="0.07" filter={url("defocus")} />

      {/* Haze in the beam, from the window off-screen on the left */}
      <polygon points="-200,-80 260,-80 1080,300 760,720" fill={url("beam")} filter={url("defocus")} />

      {/* The sun patch, with its bloom */}
      <g transform={SUN_PROJECTION} style={fill("mineral")}>
        <g filter={url("bloom")} opacity="0.32">
          {panes}
        </g>
        <g filter={url("penumbra")} opacity="0.2">
          {panes}
        </g>
      </g>

      {/* Table edge in the foreground, out of focus, catching a little light */}
      <g filter={url("defocus")}>
        <polygon points="-60,1010 -60,850 560,812 700,1010" style={fill("smoke")} />
        <polyline
          points="-60,850 560,812"
          fill="none"
          style={stroke("mineral")}
          strokeOpacity="0.1"
          strokeWidth="6"
        />
      </g>
    </svg>
  );
}
