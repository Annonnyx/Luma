/** A palette token as `[r, g, b]` in 0–1, read from the CSS variables. */
export function tokenRgb(token: string): [number, number, number] {
  const value = getComputedStyle(document.documentElement).getPropertyValue(`--color-${token}`).trim();
  const hex = /^#([0-9a-f]{6})$/i.exec(value)?.[1];
  if (!hex) return [0.5, 0.5, 0.5];
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
}

/**
 * Draws an inline SVG drawing into a canvas, once. The drawings take their
 * colours from CSS variables, which an SVG image cannot see: they are resolved
 * before the copy is decoded.
 */
export async function rasterizeSvg(svg: SVGSVGElement, width: number, height: number) {
  const root = getComputedStyle(document.documentElement);
  const copy = svg.cloneNode(true) as SVGSVGElement;
  copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  copy.setAttribute("width", String(width));
  copy.setAttribute("height", String(height));
  copy.removeAttribute("class");
  const markup = new XMLSerializer()
    .serializeToString(copy)
    .replace(/var\(--color-([a-z-]+)\)/g, (_, token: string) => root.getPropertyValue(`--color-${token}`).trim() || "black");

  const url = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml" }));
  try {
    const image = new Image(width, height);
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")?.drawImage(image, 0, 0, width, height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}
