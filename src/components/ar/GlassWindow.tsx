import type { CSSProperties, ReactNode } from "react";

export type GlassWindowPlacement = {
  className?: string;
  style?: CSSProperties;
  /** Pointer parallax factor: 0 stays put, above 1 is closer to the viewer. */
  depth?: number;
  /** Set on `.pane-float` as `data-window`, for scenes that move windows. */
  windowId?: string;
  /** Rendered under the glass, inside `.pane-float` (a grab handle). */
  controls?: ReactNode;
};

/**
 * A pane of glass placed in the room: frosted backdrop, an edge that catches
 * the light, a slow reflection. Animation hooks: `.pane-float` (placement and
 * pointer parallax, transforms only), `.pane` (the glass), `.pane-sheen`,
 * `.pane-row` (content lines).
 *
 * Opacity, filter, mask or clip-path on an ancestor of `.pane` would cut the
 * glass off from the room behind it: fade the `.pane` itself.
 */
export function GlassWindow({
  label,
  depth = 1,
  className = "",
  style,
  windowId,
  controls,
  children,
}: GlassWindowPlacement & { label: string; children: ReactNode }) {
  return (
    <div data-depth={depth} data-window={windowId} style={style} className={`pane-float absolute ${className}`}>
      <article aria-label={label} className="pane glass-pane p-5 md:p-6">
        <span
          aria-hidden
          className="pane-sheen pointer-events-none absolute -inset-y-1/2 -left-1/3 w-1/2 rotate-[18deg] bg-linear-to-r from-transparent via-mineral/[0.07] to-transparent"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_0%,color-mix(in_oklab,var(--color-mineral)_8%,transparent),transparent_60%)]"
        />
        <span aria-hidden className="grain pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-overlay" />
        <div className="relative">{children}</div>
      </article>
      {controls}
    </div>
  );
}
