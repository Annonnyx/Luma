import { fill, stop, stroke, useSvgIds } from "./paint";

const UPPER_SEAMS = [939, 1139];
const LOWER_SEAMS = [268, 536, 804, 1072];
const POT = "M 835 515 H 965 V 576 Q 965 590 951 590 H 849 Q 835 590 835 576 Z";

/**
 * Stand-in for the kitchen shot of scene 4, 1600 × 1000: the same evening,
 * lights low. Windows are anchored in fractions of this picture, so a real
 * shot must keep its landmarks: the window (centre left), the shelf (left),
 * the pot on the hob (centre), the wall cabinets and the tall unit (right).
 * Filters are rasterised once: move it with transforms only.
 */
export function Kitchen({ className }: { className?: string }) {
  const { id, url } = useSvgIds();

  return (
    <svg viewBox="0 0 1600 1000" className={className} aria-hidden>
      <defs>
        <linearGradient id={id("wall")} x1="0" y1="0" x2="1" y2="0.2">
          <stop offset="0" style={stop("smoke")} />
          <stop offset="0.36" style={stop("graphite")} />
          <stop offset="0.7" style={stop("graphite")} />
          <stop offset="1" style={stop("smoke")} />
        </linearGradient>
        <radialGradient id={id("bounce")} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" style={stop("mineral", 0.12)} />
          <stop offset="1" style={stop("mineral", 0)} />
        </radialGradient>
        <linearGradient id={id("ceiling")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={stop("smoke", 0.85)} />
          <stop offset="1" style={stop("smoke", 0)} />
        </linearGradient>
        <linearGradient id={id("dusk")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={stop("mineral", 0.34)} />
          <stop offset="0.6" style={stop("mineral", 0.22)} />
          <stop offset="1" style={stop("mineral", 0.13)} />
        </linearGradient>
        <linearGradient id={id("cabinet")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" style={stop("mineral", 0.08)} />
          <stop offset="1" style={stop("mineral", 0.015)} />
        </linearGradient>
        <linearGradient id={id("wash")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={stop("mineral", 0.15)} />
          <stop offset="1" style={stop("mineral", 0)} />
        </linearGradient>
        <linearGradient id={id("base")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={stop("graphite")} />
          <stop offset="1" style={stop("smoke")} />
        </linearGradient>
        <linearGradient id={id("column")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" style={stop("mineral", 0.07)} />
          <stop offset="0.35" style={stop("mineral", 0.01)} />
          <stop offset="1" style={stop("mineral", 0)} />
        </linearGradient>
        <linearGradient id={id("steel")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" style={stop("mineral", 0.16)} />
          <stop offset="0.12" style={stop("mineral", 0.34)} />
          <stop offset="0.3" style={stop("mineral", 0.06)} />
          <stop offset="0.8" style={stop("mineral", 0.02)} />
          <stop offset="1" style={stop("mineral", 0.08)} />
        </linearGradient>
        <linearGradient id={id("edge")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" style={stop("smoke")} />
          <stop offset="0.45" style={stop("smoke", 0.55)} />
          <stop offset="1" style={stop("smoke", 0)} />
        </linearGradient>
        <clipPath id={id("pane")}>
          <rect x="420" y="160" width="280" height="415" />
        </clipPath>
        <filter id={id("bloom")} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="42" />
        </filter>
        <filter id={id("strip")} x="-5%" y="-300%" width="110%" height="700%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
        <filter id={id("wash-blur")} x="-5%" y="-10%" width="110%" height="120%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
        <filter id={id("soft")} x="-10%" y="-300%" width="120%" height="700%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <filter id={id("haze")} x="-10%" y="-20%" width="120%" height="140%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <filter id={id("steam")} x="-100%" y="-30%" width="300%" height="160%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <filter id={id("defocus")} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>

      {/* Wall, lit by the window */}
      <rect width="1600" height="1000" fill={url("wall")} />
      <ellipse cx="560" cy="390" rx="560" ry="440" fill={url("bounce")} />

      {/* Wall cabinets, and the light strip beneath them */}
      <rect x="740" y="100" width="600" height="272" style={fill("graphite")} />
      <rect x="740" y="100" width="600" height="272" fill={url("cabinet")} />
      <g style={fill("smoke")}>
        {UPPER_SEAMS.map((x) => (
          <rect key={x} x={x} y="100" width="2" height="272" />
        ))}
      </g>

      {/* Tall unit on the right */}
      <rect x="1340" y="60" width="260" height="940" style={fill("graphite")} />
      <rect x="1340" y="60" width="260" height="940" fill={url("column")} />
      <rect x="1340" y="560" width="260" height="2" style={fill("smoke")} />
      <rect x="1340" y="60" width="1.5" height="940" style={fill("mineral")} opacity="0.1" />
      <rect x="1362" y="400" width="5" height="300" rx="2.5" style={fill("mineral")} opacity="0.16" />

      <rect width="1600" height="260" fill={url("ceiling")} />

      <rect x="744" y="372" width="592" height="218" fill={url("wash")} filter={url("wash-blur")} />
      <rect x="744" y="364" width="592" height="12" style={fill("mineral")} opacity="0.2" filter={url("strip")} />
      <rect x="744" y="368" width="592" height="4" style={fill("mineral")} opacity="0.36" />

      {/* The window: dusk outside, rooftops across the street */}
      <rect x="420" y="160" width="280" height="415" style={fill("mineral")} opacity="0.2" filter={url("bloom")} />
      <rect x="406" y="146" width="308" height="443" style={fill("mineral")} opacity="0.045" />
      <rect x="420" y="160" width="280" height="415" fill={url("dusk")} />
      <g clipPath={url("pane")}>
        <g filter={url("haze")}>
          <polygon
            points="420,575 420,468 466,468 466,438 534,438 534,486 596,486 596,452 648,452 648,500 700,500 700,575"
            style={fill("smoke")}
            opacity="0.42"
          />
          <g style={fill("mineral")} opacity="0.2">
            <rect x="440" y="490" width="7" height="9" />
            <rect x="548" y="502" width="7" height="9" />
            <rect x="612" y="470" width="7" height="9" />
            <rect x="668" y="522" width="7" height="9" />
          </g>
        </g>
      </g>
      <g style={fill("graphite")}>
        <rect x="557" y="160" width="6" height="415" />
        <rect x="420" y="298" width="280" height="6" />
      </g>
      <rect x="420" y="160" width="280" height="415" fill="none" style={stroke("graphite")} strokeWidth="10" />
      <rect x="398" y="574" width="324" height="9" style={fill("mineral")} opacity="0.13" />

      {/* Open shelf on the left wall, lit from its right */}
      <rect x="70" y="338" width="260" height="16" style={fill("smoke")} opacity="0.6" filter={url("soft")} />
      <g style={fill("graphite")}>
        <rect x="92" y="262" width="36" height="68" rx="7" />
        <rect x="95" y="253" width="30" height="11" rx="3" />
        <rect x="142" y="284" width="48" height="46" rx="9" />
        <path d="M 206 306 A 47 24 0 0 0 300 306 Z" />
        <rect x="70" y="330" width="260" height="8" />
      </g>
      <g style={fill("mineral")} opacity="0.16">
        <rect x="124" y="266" width="2" height="60" rx="1" />
        <rect x="185" y="289" width="2" height="38" rx="1" />
        <rect x="206" y="305" width="94" height="1.5" />
        <rect x="70" y="330" width="260" height="1.5" />
      </g>

      {/* Worktop, with the window and the strip reflected in it */}
      <rect x="0" y="585" width="1340" height="7" style={fill("mineral")} opacity="0.09" />
      <ellipse cx="560" cy="589" rx="330" ry="6" style={fill("mineral")} opacity="0.3" filter={url("soft")} />
      <ellipse cx="1040" cy="589" rx="300" ry="4" style={fill("mineral")} opacity="0.18" filter={url("soft")} />

      {/* A clock on the cabinet, same evening as the messages */}
      <g>
        <circle cx="1220" cy="236" r="26" style={fill("graphite")} />
        <circle cx="1220" cy="236" r="22" style={fill("mineral")} opacity="0.07" />
        <circle cx="1220" cy="236" r="1.6" style={fill("mineral")} opacity="0.35" />
        <line
          x1="1220"
          y1="236"
          x2="1216"
          y2="246"
          fill="none"
          style={stroke("mineral")}
          strokeOpacity="0.4"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          x1="1220"
          y1="236"
          x2="1205"
          y2="241"
          fill="none"
          style={stroke("mineral")}
          strokeOpacity="0.28"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>

      {/* Cutting board on the worktop, under the window */}
      <g>
        <rect x="248" y="572" width="132" height="10" rx="2" style={fill("graphite")} />
        <rect x="252" y="573" width="124" height="3" rx="1" style={fill("mineral")} opacity="0.1" />
      </g>

      {/* A bottle of white wine, still waiting */}
      <g>
        <rect x="678" y="512" width="16" height="70" rx="4" style={fill("graphite")} />
        <rect x="682" y="494" width="8" height="22" rx="2" style={fill("graphite")} />
        <ellipse cx="686" cy="494" rx="4.5" ry="2.5" style={fill("graphite")} />
        <rect x="680" y="536" width="12" height="36" rx="3" style={fill("mineral")} opacity="0.1" />
      </g>

      {/* The pot on the hob, steam rising */}
      <ellipse cx="900" cy="590" rx="84" ry="5" style={fill("smoke")} opacity="0.9" filter={url("soft")} />
      <g style={fill("graphite")}>
        <rect x="815" y="527" width="20" height="7" rx="3.5" />
        <rect x="965" y="527" width="20" height="7" rx="3.5" />
        <path d={POT} />
        <path d="M 836 513 Q 900 484 964 513 Z" />
        <rect x="892" y="478" width="16" height="9" rx="4" />
      </g>
      <path d={POT} fill={url("steel")} />
      <rect x="831" y="511" width="138" height="4" rx="2" style={fill("mineral")} opacity="0.2" />
      <path
        d="M 846 509 Q 872 494 898 490"
        fill="none"
        style={stroke("mineral")}
        strokeOpacity="0.22"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <g
        className="kitchen-steam"
        fill="none"
        style={stroke("mineral")}
        strokeOpacity="0.07"
        strokeWidth="16"
        strokeLinecap="round"
        filter={url("steam")}
      >
        <path d="M 884 476 C 862 446 906 420 882 392 C 864 370 892 348 880 326" />
        <path d="M 916 474 C 938 446 898 418 922 388 C 940 366 914 344 926 320" />
        <path d="M 900 470 C 918 444 884 416 904 386 C 918 366 892 348 906 328" />
      </g>
      {/* A wooden spoon, left of the pot */}
      <g>
        <ellipse cx="748" cy="586" rx="18" ry="7" style={fill("graphite")} />
        <rect x="748" y="583" width="78" height="5" rx="2.5" style={fill("graphite")} />
        <rect x="748" y="584" width="78" height="2" rx="1" style={fill("mineral")} opacity="0.12" />
      </g>

      <rect x="0" y="592" width="1340" height="28" style={fill("graphite")} />
      <rect x="0" y="592" width="1340" height="1.5" style={fill("mineral")} opacity="0.22" />

      {/* Base units, the window faintly reflected in their fronts */}
      <rect x="0" y="620" width="1340" height="330" fill={url("base")} />
      <rect x="380" y="640" width="360" height="290" style={fill("mineral")} opacity="0.035" filter={url("defocus")} />
      <rect x="0" y="620" width="1340" height="9" style={fill("smoke")} opacity="0.9" />
      <rect x="0" y="629" width="1340" height="1" style={fill("mineral")} opacity="0.05" />
      <g style={fill("smoke")}>
        {LOWER_SEAMS.map((x) => (
          <rect key={x} x={x} y="629" width="2" height="321" />
        ))}
      </g>
      <rect x="0" y="950" width="1340" height="50" style={fill("smoke")} />

      {/* The room falls into shadow at both ends, so the picture has no edge when the camera turns */}
      <rect width="150" height="1000" fill={url("edge")} />
      <rect width="150" height="1000" fill={url("edge")} transform="matrix(-1 0 0 1 1600 0)" />
    </svg>
  );
}

/**
 * The bottom of the same picture (y 820 to 1000), closest to the camera and
 * out of focus: an island edge and a bowl. It moves faster than the kitchen
 * when the camera turns.
 */
export function KitchenForeground({ className }: { className?: string }) {
  const { id, url } = useSvgIds();

  return (
    <svg viewBox="0 820 1600 180" className={className} aria-hidden>
      <defs>
        <filter id={id("defocus")} x="-20%" y="-60%" width="140%" height="220%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>
      <g filter={url("defocus")}>
        <polygon points="-60,1010 -60,912 700,888 860,1010" style={fill("smoke")} />
        <polyline points="-60,912 700,888" fill="none" style={stroke("mineral")} strokeOpacity="0.14" strokeWidth="5" />
        <path d="M 236 884 Q 312 926 392 880 Z" style={fill("graphite")} />
        <path d="M 236 884 Q 314 874 392 880" fill="none" style={stroke("mineral")} strokeOpacity="0.2" strokeWidth="3" />
        <path
          d="M 1048 990 L 1056 948 Q 1072 936 1072 918 H 1080 V 914 H 1064 V 918 Q 1064 932 1078 944 L 1086 990 Z"
          style={fill("graphite")}
        />
        <ellipse cx="1067" cy="990" rx="22" ry="5" style={fill("smoke")} opacity="0.55" />
      </g>
    </svg>
  );
}
