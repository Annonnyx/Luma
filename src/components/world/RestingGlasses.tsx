import { fill, stop, useSvgIds } from "@/components/world/paint";

/**
 * Orée at rest, branches folded, seen from a little above. Stand-in for the
 * last still of the site. Animation hooks: `.resting-glasses`, `.resting-glint`.
 */
export function RestingGlasses({ className = "" }: { className?: string }) {
  const { id, url } = useSvgIds();

  return (
    <svg
      viewBox="0 0 640 220"
      className={`resting-glasses ${className}`}
      role="img"
      aria-label="Monture Orée posée, branches repliées"
    >
      <defs>
        <linearGradient id={id("acetate")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={stop("fog")} />
          <stop offset="0.35" style={stop("graphite")} />
          <stop offset="1" style={stop("smoke")} />
        </linearGradient>
        <linearGradient id={id("glass")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={stop("mineral", 0.28)} />
          <stop offset="0.5" style={stop("mineral", 0.05)} />
          <stop offset="1" style={stop("coat", 0.18)} />
        </linearGradient>
        <linearGradient id={id("glint")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" style={stop("mineral", 0)} />
          <stop offset="0.5" style={stop("mineral", 0.55)} />
          <stop offset="1" style={stop("mineral", 0)} />
        </linearGradient>
      </defs>

      <ellipse cx="320" cy="206" rx="248" ry="8" style={fill("graphite")} opacity="0.08" />
      <rect x="40" y="198" width="560" height="1" style={fill("graphite")} opacity="0.12" />
      <ellipse cx="320" cy="198" rx="210" ry="10" style={fill("graphite")} opacity="0.14" />

      <g fill={url("acetate")}>
        <rect x="96" y="108" width="168" height="14" rx="7" transform="rotate(-18 96 108)" />
        <rect x="376" y="78" width="168" height="14" rx="7" transform="rotate(16 376 78)" />
      </g>

      <g fill={url("acetate")}>
        <path d="M 118 86 H 302 Q 320 86 320 104 Q 320 122 302 122 H 118 Q 96 122 96 100 Q 96 86 118 86 Z" />
        <path d="M 338 86 H 522 Q 544 86 544 100 Q 544 122 522 122 H 338 Q 320 122 320 104 Q 320 86 338 86 Z" />
        <rect x="302" y="96" width="36" height="16" rx="8" />
      </g>

      <g fill={url("glass")}>
        <ellipse cx="210" cy="104" rx="86" ry="28" />
        <ellipse cx="430" cy="104" rx="86" ry="28" />
      </g>

      <rect
        className="resting-glint"
        x="140"
        y="92"
        width="70"
        height="8"
        rx="4"
        fill={url("glint")}
        opacity="0.7"
      />
      <rect x="372" y="94" width="44" height="5" rx="2.5" fill={url("glint")} opacity="0.35" />
    </svg>
  );
}
