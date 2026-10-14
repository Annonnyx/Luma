import { HANDOFF } from "@/components/ar/HandoffRing";
import { fill, stop, stroke, useSvgIds } from "@/components/world/paint";

/**
 * The ring in the handoff ring's 100 × 100 box: outer and inner radius, and
 * `width`, the band along the finger (about 5 mm on a 22 mm ring).
 */
export const BAND = { outer: HANDOFF.r, inner: 41.4, width: 21 } as const;
/** Detents felt when turning it: one per window. */
export const BAND_STEPS = 5;

const { outer: RO, inner: RI } = BAND;
const MID = (RO + RI) / 2;
const TAU = Math.PI * 2;

const n = (v: number) => v.toFixed(3);
const ellipse = (cy: number, rx: number, ry: number) =>
  `M${n(50 - rx)} ${n(cy)}a${n(rx)} ${n(ry)} 0 1 1 ${n(rx * 2)} 0a${n(rx)} ${n(ry)} 0 1 1 ${n(-rx * 2)} 0Z`;
/** An arc in the plane of the face, centred on 0, angles in degrees (0 = right, clockwise). */
const arc = (r: number, from: number, to: number) => {
  const a = (from * TAU) / 360;
  const b = (to * TAU) / 360;
  return `M${n(r * Math.cos(a))} ${n(r * Math.sin(a))}A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${n(r * Math.cos(b))} ${n(r * Math.sin(b))}`;
};

const DETENTS = Array.from({ length: BAND_STEPS }, (_, i) => (i / BAND_STEPS) * 360 - 90);

/**
 * `tilt`: degrees, 0 = face on. `turn`: degrees around its own axis.
 * `fill`: 0 = only the light of the edge, 1 = solid titanium. `rim`: the coat
 * light left on the edge, 0–1.
 */
export type BandPose = { tilt: number; turn: number; fill: number; rim: number };

/**
 * Titanium ring, drawn from its pose rather than with 3D layers: the face,
 * the outer wall below it and the inside of the far wall through the hole
 * are the exact outlines of a tilted band, so the hole stays a real hole.
 * Light stays put (gradients on the wall, sheen on the face) while the marks
 * of the metal turn with it: grain, seam, detents, engraving, and the coat
 * tick, the interface answering the turn. Pose it with `poseBand`.
 */
export function Band({ className = "" }: { className?: string }) {
  const { id, url } = useSvgIds();
  const flat = poseGeometry({ tilt: 0, turn: 0, fill: 1, rim: 0 });

  return (
    <svg viewBox="0 0 100 100" aria-hidden overflow="visible" className={`band ${className}`}>
      <defs>
        <linearGradient id={id("wall")} x1={50 - RO} y1="0" x2={50 + RO} y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={stop("smoke")} />
          <stop offset="0.07" style={stop("graphite")} />
          <stop offset="0.17" style={stop("fog")} />
          <stop offset="0.25" style={stop("mist", 0.9)} />
          <stop offset="0.31" style={stop("fog")} />
          <stop offset="0.44" style={stop("graphite")} />
          <stop offset="0.56" style={stop("graphite")} />
          <stop offset="0.66" style={stop("fog")} />
          <stop offset="0.73" style={stop("mineral", 0.88)} />
          <stop offset="0.79" style={stop("mist")} />
          <stop offset="0.88" style={stop("fog")} />
          <stop offset="0.95" style={stop("graphite")} />
          <stop offset="1" style={stop("smoke")} />
        </linearGradient>
        <linearGradient id={id("wall-shade")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={stop("mineral", 0.16)} />
          <stop offset="0.35" style={stop("smoke", 0)} />
          <stop offset="1" style={stop("smoke", 0.6)} />
        </linearGradient>
        <linearGradient id={id("inside")} x1={50 - RI} y1="0" x2={50 + RI} y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={stop("smoke")} />
          <stop offset="0.2" style={stop("graphite")} />
          <stop offset="0.42" style={stop("fog")} />
          <stop offset="0.55" style={stop("mist")} />
          <stop offset="0.62" style={stop("mineral", 0.8)} />
          <stop offset="0.72" style={stop("fog")} />
          <stop offset="0.9" style={stop("graphite")} />
          <stop offset="1" style={stop("smoke")} />
        </linearGradient>
        <linearGradient id={id("inside-shade")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={stop("smoke", 0.75)} />
          <stop offset="1" style={stop("smoke", 0)} />
        </linearGradient>
        <linearGradient id={id("face")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={stop("mist")} />
          <stop offset="0.2" style={stop("mineral", 0.9)} />
          <stop offset="0.42" style={stop("fog")} />
          <stop offset="0.62" style={stop("graphite")} />
          <stop offset="0.84" style={stop("fog")} />
          <stop offset="1" style={stop("mist", 0.8)} />
        </linearGradient>
        <clipPath id={id("face-clip")}>
          <path className="band-face-clip" clipRule="evenodd" d={flat.face} />
        </clipPath>
        <clipPath id={id("hole-clip")}>
          <path className="band-hole-clip" d={flat.hole} />
        </clipPath>
        {/* Lower half, left to right, so the engraving reads upright */}
        <path id={id("script")} d={`M ${-(MID + 1.15)} 0 A ${MID + 1.15} ${MID + 1.15} 0 0 0 ${MID + 1.15} 0`} />
      </defs>

      {/* Outer wall, below the face */}
      <path className="band-wall" fill={url("wall")} d={flat.wall} />
      <path className="band-wall" fill={url("wall-shade")} d={flat.wall} />
      <path className="band-back-edge" fill="none" style={stroke("mineral")} strokeOpacity="0.2" strokeWidth="0.35" d={flat.backEdge} />

      {/* The inside of the far wall, seen through the hole */}
      <g clipPath={url("hole-clip")}>
        <path className="band-inside" fill={url("inside")} fillRule="evenodd" d={flat.inside} />
        <path className="band-inside" fill={url("inside-shade")} fillRule="evenodd" d={flat.inside} />
      </g>

      {/* The face */}
      <path className="band-face" fill={url("face")} fillRule="evenodd" d={flat.face} />
      <g clipPath={url("face-clip")}>
        {/* Sheen: stays with the light while the metal turns under it */}
        <g className="band-sheen" transform={flat.plane} fill="none" strokeLinecap="round">
          <path d={arc(MID, 196, 252)} style={stroke("mineral")} strokeOpacity="0.2" strokeWidth={(RO - RI) * 0.9} />
          <path d={arc(MID, 210, 236)} style={stroke("mineral")} strokeOpacity="0.32" strokeWidth={(RO - RI) * 0.5} />
          <path d={arc(MID, 18, 44)} style={stroke("mineral")} strokeOpacity="0.12" strokeWidth={(RO - RI) * 0.7} />
        </g>

        <g className="band-marks" transform={flat.marks}>
          {/* Brushed grain: irregular, so the turn shows */}
          <g fill="none" style={stroke("mineral")} strokeOpacity="0.13" strokeWidth="0.2" strokeLinecap="round">
            <circle r={MID - 1.9} pathLength="1" strokeDasharray="0.031 0.012 0.008 0.03 0.05 0.021" />
            <circle r={MID - 0.6} pathLength="1" strokeDasharray="0.018 0.026 0.042 0.014" />
            <circle r={MID + 0.7} pathLength="1" strokeDasharray="0.026 0.009 0.012 0.034 0.02 0.017" />
            <circle r={MID + 2} pathLength="1" strokeDasharray="0.04 0.022 0.01 0.028" />
          </g>
          <g fill="none" style={stroke("smoke")} strokeOpacity="0.16" strokeWidth="0.18">
            <circle r={MID - 1.2} pathLength="1" strokeDasharray="0.012 0.05 0.03 0.04" />
            <circle r={MID + 1.4} pathLength="1" strokeDasharray="0.02 0.03 0.008 0.06" />
          </g>

          {/* Detents, one per window */}
          {DETENTS.map((deg) => {
            const a = (deg * TAU) / 360;
            return (
              <g key={deg}>
                <circle cx={n((RO - 1.25) * Math.cos(a))} cy={n((RO - 1.25) * Math.sin(a))} r="0.42" style={fill("smoke")} opacity="0.55" />
                <circle cx={n((RO - 1.15) * Math.cos(a) - 0.12)} cy={n((RO - 1.15) * Math.sin(a) - 0.12)} r="0.3" style={fill("mineral")} opacity="0.18" />
              </g>
            );
          })}

          {/* The join of the band */}
          <rect x="-0.55" y={-(RO + 0.2)} width="1.1" height={RO - RI + 0.4} style={fill("smoke")} opacity="0.42" />
          <rect x="0.55" y={-(RO + 0.2)} width="0.3" height={RO - RI + 0.4} style={fill("mineral")} opacity="0.16" />

          {/* Engraved name, opposite the join */}
          <text fontSize="2.5" letterSpacing="0.55" style={{ ...fill("smoke"), fontStretch: "125%", fontWeight: 520 }} opacity="0.5">
            <textPath href={`#${id("script")}`} startOffset="50%" textAnchor="middle">
              Lume
            </textPath>
          </text>

          {/* Coat tick on the inner edge */}
          <path className="band-tick" d={arc(RI + 1.05, -97, -83)} fill="none" style={stroke("coat")} strokeWidth="1.15" strokeLinecap="round" />
        </g>
      </g>

      {/* Edges of the face: light on the outside, shadow on the inside */}
      <path className="band-outer-edge" fill="none" style={stroke("mineral")} strokeOpacity="0.34" strokeWidth="0.38" d={flat.outerEdge} />
      <path className="band-inner-edge" fill="none" style={stroke("smoke")} strokeOpacity="0.65" strokeWidth="0.42" d={flat.innerEdge} />
      {/* While the metal forms, its inner edge is the light moving inwards */}
      <path className="band-forming" fill="none" style={stroke("coat")} strokeOpacity="0" strokeWidth="1.4" vectorEffect="non-scaling-stroke" d={flat.innerEdge} />
      {/* What is left of the light of scene 5 */}
      <path className="band-rim" fill="none" style={stroke("coat")} strokeOpacity="0" strokeWidth={HANDOFF.line} vectorEffect="non-scaling-stroke" d={flat.outerEdge} />
    </svg>
  );
}

function poseGeometry({ tilt, turn, fill: solid }: BandPose) {
  const t = (tilt * TAU) / 360;
  const c = Math.cos(t);
  const s = Math.sin(t);
  const half = (BAND.width / 2) * s;
  const fy = 50 - half;
  const by = 50 + half;
  // The far edge is a little smaller, a hint of perspective (none face on).
  const far = 1 - 0.035 * s;
  const rb = RO * far;
  const rib = RI * far;
  const hole = RO + (RI - RO) * solid;

  return {
    wall: `M${n(50 - RO)} ${n(fy)}A${n(RO)} ${n(RO * c)} 0 0 0 ${n(50 + RO)} ${n(fy)}L${n(50 + rb)} ${n(by)}A${n(rb)} ${n(rb * c)} 0 0 1 ${n(50 - rb)} ${n(by)}Z`,
    backEdge: `M${n(50 - rb)} ${n(by)}A${n(rb)} ${n(rb * c)} 0 0 0 ${n(50 + rb)} ${n(by)}`,
    inside: `${ellipse(fy, RI, RI * c)}${ellipse(by, rib, rib * c)}`,
    hole: ellipse(fy, hole, hole * c),
    face: `${ellipse(fy, RO, RO * c)}${ellipse(fy, hole, hole * c)}`,
    outerEdge: ellipse(fy, RO, RO * c),
    innerEdge: ellipse(fy, hole, hole * c),
    plane: `translate(50 ${n(fy)}) scale(1 ${n(Math.max(c, 0.0001))})`,
    marks: `translate(50 ${n(fy)}) scale(1 ${n(Math.max(c, 0.0001))}) rotate(${n(turn)})`,
  };
}

/** Binds a `Band` once; the returned function draws it in a pose (cheap, every frame). */
export function poseBand(svg: SVGSVGElement) {
  const all = <T extends Element>(selector: string) => Array.from(svg.querySelectorAll<T>(selector));
  const walls = all<SVGPathElement>(".band-wall");
  const insides = all<SVGPathElement>(".band-inside");
  const [backEdge] = all<SVGPathElement>(".band-back-edge");
  const [face] = all<SVGPathElement>(".band-face");
  const [faceClip] = all<SVGPathElement>(".band-face-clip");
  const [holeClip] = all<SVGPathElement>(".band-hole-clip");
  const [sheen] = all<SVGGElement>(".band-sheen");
  const [marks] = all<SVGGElement>(".band-marks");
  const [outerEdge] = all<SVGPathElement>(".band-outer-edge");
  const [innerEdge] = all<SVGPathElement>(".band-inner-edge");
  const [forming] = all<SVGPathElement>(".band-forming");
  const [rim] = all<SVGPathElement>(".band-rim");

  let last = "";
  return (pose: BandPose) => {
    const key = `${pose.tilt.toFixed(2)} ${pose.turn.toFixed(2)} ${pose.fill.toFixed(4)} ${pose.rim.toFixed(3)}`;
    if (key === last) return;
    last = key;
    const g = poseGeometry(pose);
    for (const wall of walls) wall.setAttribute("d", g.wall);
    for (const inside of insides) inside.setAttribute("d", g.inside);
    backEdge?.setAttribute("d", g.backEdge);
    face?.setAttribute("d", g.face);
    faceClip?.setAttribute("d", g.face);
    holeClip?.setAttribute("d", g.hole);
    sheen?.setAttribute("transform", g.plane);
    marks?.setAttribute("transform", g.marks);
    outerEdge?.setAttribute("d", g.outerEdge);
    innerEdge?.setAttribute("d", g.innerEdge);
    forming?.setAttribute("d", g.innerEdge);
    forming?.setAttribute("stroke-opacity", (Math.sin(Math.min(1, pose.fill) * Math.PI) * 0.75).toFixed(3));
    rim?.setAttribute("d", g.outerEdge);
    rim?.setAttribute("stroke-opacity", pose.rim.toFixed(3));
  };
}
