import type { CSSProperties, ReactNode } from "react";

/**
 * A small plate of information that follows the eyes (a message): it stays
 * at the edge of the view, so it has no stem. Animation hooks: `.glance`,
 * `.glance-panel`.
 */
export function Glance({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`glance ${className}`}>
      <div className="glance-panel glance-plate px-5 py-3.5">{children}</div>
    </div>
  );
}

/**
 * A plate pinned to a place: placed at the point it belongs to (`style`
 * left / top), it stands on a stem whose foot is that point. The mark on the
 * ground is drawn by the scene. Animation hooks: `.glance`, `.glance-panel`,
 * `.glance-stem`.
 */
export function PinnedGlance({
  className = "",
  style,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div style={style} className={`glance absolute ${className}`}>
      <div className="absolute bottom-0 left-0 flex -translate-x-5 flex-col items-start">
        <div className="glance-panel glance-plate w-max max-w-[min(16rem,70vw)] px-4 py-3">{children}</div>
        <span
          aria-hidden
          className="glance-stem ml-5 h-[clamp(2.75rem,8svh,5.5rem)] w-px origin-bottom bg-linear-to-b from-ink/40 to-coat/70"
        />
      </div>
    </div>
  );
}
