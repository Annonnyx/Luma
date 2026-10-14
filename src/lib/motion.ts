export const EASE = {
  out: "expo.out",
  inOut: "power3.inOut",
  soft: "power2.out",
  linear: "none",
} as const;

export const DURATION = {
  short: 0.8,
  base: 1.2,
  long: 1.6,
} as const;

export const STAGGER = {
  tight: 0.06,
  base: 0.1,
  loose: 0.14,
} as const;

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
export const MOTION_OK_QUERY = "(prefers-reduced-motion: no-preference)";
export const FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";
