import { ScrollTrigger } from "./gsap";

let holders = 0;

/**
 * Turns on the cinematic layout (`cinematic:` variant) while at least one
 * scroll sequence needs it. Call inside a reduced-motion-aware matchMedia and
 * call the returned function on cleanup.
 *
 * The inline script in the root layout already sets the class before first
 * paint; `data-cinematic` tells it a sequence has taken over.
 */
export function holdCinematic(): () => void {
  const root = document.documentElement;
  holders += 1;
  root.classList.add("cinematic");
  root.setAttribute("data-cinematic", "");

  let released = false;
  return () => {
    if (released) return;
    released = true;
    holders -= 1;
    // A sequence that re-mounts at once (Strict Mode, Fast Refresh) takes it back
    // before this runs; dropping it in between would shorten the page and lose the scroll.
    queueMicrotask(() => {
      if (holders > 0) return;
      root.classList.remove("cinematic");
      root.removeAttribute("data-cinematic");
    });
  };
}

/**
 * Handoff between two pinned scenes: the next section overlaps this one by a
 * screen and pins exactly when this stage unpins. From then on this stage,
 * still painted above, is hidden, so the next one shows its own copy of the
 * last frame. Call inside the same matchMedia; reverted with it.
 */
export function hideWhenDetached(section: HTMLElement, stage: HTMLElement) {
  ScrollTrigger.create({
    trigger: section,
    start: () => `bottom top+=${stage.offsetHeight}`,
    end: "max",
    onToggle: (self) => {
      stage.style.visibility = self.isActive ? "hidden" : "";
    },
  });
  return () => {
    stage.style.visibility = "";
  };
}
