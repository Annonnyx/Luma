import { useId } from "react";

type Token = "mineral" | "graphite" | "smoke" | "fog" | "mist" | "coat";

/** Gradient stop in a palette colour. */
export const stop = (token: Token, opacity = 1) => ({
  stopColor: `var(--color-${token})`,
  stopOpacity: opacity,
});

/** SVG fill in a palette colour. */
export const fill = (token: Token) => ({ fill: `var(--color-${token})` });

/** SVG stroke in a palette colour. */
export const stroke = (token: Token) => ({ stroke: `var(--color-${token})` });

/** Unique ids for gradients and filters, so several drawings can share a page. */
export function useSvgIds() {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = (name: string) => `${uid}-${name}`;
  const url = (name: string) => `url(#${id(name)})`;
  return { id, url };
}
