import { useId } from "react";

import {
  FRAME_BOUNDS,
  FRAME_HIT_AREAS,
  FRAME_PIECES,
  GLASSES_VIEWBOX,
  LENS_CENTER,
  LENS_LEFT,
  LENS_RIGHT,
  RIVETS,
} from "./glasses-geometry";

const VB = GLASSES_VIEWBOX;
const LENSES = [LENS_LEFT, LENS_RIGHT] as const;
const CENTERS = [LENS_CENTER.left, LENS_CENTER.right] as const;

/**
 * Orée frame, front view, black polished acetate. Stand-in for the final
 * render: same silhouette and proportions, so the lens path can drive masks.
 *
 * Animation hooks (scoped by the parent): `.glasses-glass`,
 * `.glasses-reflection`, `.glasses-sheen`, `.glasses-glint`.
 * The SVG draws outside its box (`overflow: visible`), so a parent can zoom
 * into it by animating the `viewBox`.
 */
export function Glasses({ className }: { className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = (name: string) => `${uid}-${name}`;
  const url = (name: string) => `url(#${id(name)})`;
  const viewport = { x: VB.x, y: VB.y, width: VB.width, height: VB.height };

  return (
    <svg
      viewBox={`${VB.x} ${VB.y} ${VB.width} ${VB.height}`}
      className={className}
      role="img"
      aria-label="Monture Orée en acétate noir poli, vue de face"
      overflow="visible"
    >
      <defs>
        <clipPath id={id("lenses")}>
          {LENSES.map((d) => (
            <path key={d} d={d} />
          ))}
        </clipPath>

        <mask id={id("frame")} maskUnits="userSpaceOnUse" {...viewport}>
          {FRAME_PIECES.map((d) => (
            <path key={d} d={d} fill="white" />
          ))}
          {LENSES.map((d) => (
            <path key={d} d={d} fill="black" />
          ))}
        </mask>

        <linearGradient
          id={id("acetate")}
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1={FRAME_BOUNDS.top}
          x2="0"
          y2={FRAME_BOUNDS.bottom}
        >
          <stop offset="0" stopColor="#3b3734" />
          <stop offset="0.1" stopColor="#1d1b19" />
          <stop offset="0.55" stopColor="#0c0b0a" />
          <stop offset="0.92" stopColor="#151312" />
          <stop offset="1" stopColor="#2b2826" />
        </linearGradient>

        <linearGradient
          id={id("sheen")}
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1={FRAME_BOUNDS.top}
          x2="0"
          y2={FRAME_BOUNDS.bottom}
        >
          <stop offset="0" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="0.025" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="0.09" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.93" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.99" stopColor="#fff" stopOpacity="0.12" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>

        <radialGradient id={id("key")}>
          <stop offset="0" stopColor="#fff" stopOpacity="0.18" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>

        <linearGradient id={id("glass")} gradientUnits="userSpaceOnUse" x1="0" y1="128" x2="0" y2="344">
          <stop offset="0" stopColor="#17191a" stopOpacity="0.14" />
          <stop offset="0.3" stopColor="#17191a" stopOpacity="0.04" />
          <stop offset="0.7" stopColor="#b5d3bf" stopOpacity="0.04" />
          <stop offset="1" stopColor="#b5d3bf" stopOpacity="0.13" />
        </linearGradient>

        <linearGradient id={id("band")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="1" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>

        <radialGradient id={id("coat")}>
          <stop offset="0" stopColor="#b5d3bf" stopOpacity="0.55" />
          <stop offset="0.6" stopColor="#b5d3bf" stopOpacity="0.14" />
          <stop offset="1" stopColor="#b5d3bf" stopOpacity="0" />
        </radialGradient>

        <linearGradient id={id("glint")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.42" stopColor="#fff" stopOpacity="0.08" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.7" />
          <stop offset="0.58" stopColor="#b5d3bf" stopOpacity="0.45" />
          <stop offset="1" stopColor="#b5d3bf" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Glass */}
      <g className="glasses-glass" clipPath={url("lenses")}>
        <rect {...viewport} fill={url("glass")} />

        <g className="glasses-sheen">
          {CENTERS.map((c, i) => (
            <ellipse
              key={i}
              cx={c.x + (i === 0 ? 44 : -44)}
              cy={c.y + 70}
              rx="150"
              ry="82"
              fill={url("coat")}
            />
          ))}
        </g>

        <g className="glasses-reflection">
          {CENTERS.map((c, i) => (
            <g key={i} transform={`rotate(-24 ${c.x} ${c.y})`}>
              <rect x={c.x - 150} y={c.y - 260} width="110" height="520" fill={url("band")} opacity="0.32" />
              <rect x={c.x - 22} y={c.y - 260} width="18" height="520" fill={url("band")} opacity="0.4" />
            </g>
          ))}
        </g>

        <g className="glasses-glint" transform="translate(-200 0)">
          <rect x="-130" y="-140" width="260" height="740" fill={url("glint")} transform="rotate(-22 0 230)" />
        </g>

        {LENSES.map((d) => (
          <path key={d} d={d} fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="2.5" />
        ))}
      </g>

      {/* Frame */}
      <g mask={url("frame")}>
        <rect {...viewport} fill={url("acetate")} />
        <rect {...viewport} fill={url("sheen")} />
        <ellipse cx="300" cy="118" rx="210" ry="80" fill={url("key")} />
        <ellipse cx="760" cy="118" rx="210" ry="80" fill={url("key")} />
        {LENSES.map((d) => (
          <path key={d} d={d} fill="none" stroke="#fff" strokeOpacity="0.18" strokeWidth="3" />
        ))}
      </g>

      {RIVETS.map(({ cx, cy }) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r="3.4" fill="#a9adad" />
          <circle cx={cx - 0.8} cy={cy - 0.9} r="2" fill="#eceeeb" />
          <circle cx={cx} cy={cy} r="3.4" fill="none" stroke="#000" strokeOpacity="0.45" strokeWidth="0.7" />
        </g>
      ))}

      {/* Invisible: lets overlays that probe what lies under them (the header) see a dark surface. */}
      <g data-theme="dark" fill="transparent" fillRule="evenodd" pointerEvents="visiblePainted">
        {FRAME_HIT_AREAS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  );
}
