import type { KitchenLayoutKind, KitchenPoint, KitchenWindowId } from "@/content/scenes";

export type SavedAnchors = Partial<Record<KitchenWindowId, KitchenPoint>>;

const key = (kind: KitchenLayoutKind) => `lume.cuisine.${kind}.v1`;

const isFraction = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;

/** Window positions saved on this device, or null. Storage can be unavailable (private mode). */
export function loadAnchors(kind: KitchenLayoutKind): SavedAnchors | null {
  try {
    const raw = window.localStorage.getItem(key(kind));
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;

    const anchors: SavedAnchors = {};
    for (const [id, point] of Object.entries(data as Record<string, unknown>)) {
      if (id !== "recipe" && id !== "timer" && id !== "list") continue;
      const { x, y } = (point ?? {}) as Partial<KitchenPoint>;
      if (isFraction(x) && isFraction(y)) anchors[id] = { x, y };
    }
    return Object.keys(anchors).length > 0 ? anchors : null;
  } catch {
    return null;
  }
}

export function saveAnchors(kind: KitchenLayoutKind, anchors: SavedAnchors) {
  try {
    window.localStorage.setItem(key(kind), JSON.stringify(anchors));
  } catch {
    // Not saved: the windows still stay put for this visit.
  }
}

export function clearAnchors(kind: KitchenLayoutKind) {
  try {
    window.localStorage.removeItem(key(kind));
  } catch {
    // Nothing to clear.
  }
}
