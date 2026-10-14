import { stroke } from "@/components/world/paint";

/** Final radius in the ring's own box (`--handoff-ring`), strokes in px. */
export const HANDOFF = { r: 49.2, line: 1.8, glow: 7, bloom: 22 } as const;

/**
 * The ring of light that scene 5 hands to scene 6: the lit edge of the iris,
 * pulled back to the size of the titanium ring. Both scenes draw it in this
 * same box, centred on their stage, so the two frames match exactly.
 * Animation hooks: `.handoff-ring`, `.handoff-circle` (all strokes),
 * `.handoff-bloom`, `.handoff-glow`, `.handoff-line`.
 */
export function HandoffRing({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden
      overflow="visible"
      className={`handoff-ring pointer-events-none absolute top-1/2 left-1/2 size-(--handoff-ring) -translate-x-1/2 -translate-y-1/2 ${className}`}
    >
      <g fill="none" style={stroke("coat")}>
        <circle
          className="handoff-circle handoff-bloom"
          cx="50"
          cy="50"
          r={HANDOFF.r}
          strokeOpacity="0.07"
          strokeWidth={HANDOFF.bloom}
          vectorEffect="non-scaling-stroke"
        />
        <circle
          className="handoff-circle handoff-glow"
          cx="50"
          cy="50"
          r={HANDOFF.r}
          strokeOpacity="0.18"
          strokeWidth={HANDOFF.glow}
          vectorEffect="non-scaling-stroke"
        />
        <circle
          className="handoff-circle handoff-line"
          cx="50"
          cy="50"
          r={HANDOFF.r}
          strokeOpacity="0.95"
          strokeWidth={HANDOFF.line}
          vectorEffect="non-scaling-stroke"
        />
      </g>
    </svg>
  );
}
