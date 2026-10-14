import { useSyncExternalStore } from "react";

import { FINE_POINTER_QUERY, REDUCED_MOTION_QUERY } from "@/lib/motion";

export function useMediaQuery(query: string, serverFallback = false) {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => serverFallback,
  );
}

export function usePrefersReducedMotion() {
  return useMediaQuery(REDUCED_MOTION_QUERY);
}

export function useFinePointer() {
  return useMediaQuery(FINE_POINTER_QUERY);
}
