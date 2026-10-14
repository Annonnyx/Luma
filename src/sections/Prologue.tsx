"use client";

import { useRef, type ReactNode } from "react";

import {
  GLASSES_VIEWBOX as VB,
  LENS_AIM,
  LENS_LEFT,
  LENS_RIGHT,
  LENS_SAFE_RECT,
  mapPath,
} from "@/components/product/glasses-geometry";
import { holdCinematic } from "@/lib/cinematic";
import { gsap, useGSAP } from "@/lib/gsap";
import { DURATION, EASE, MOTION_OK_QUERY } from "@/lib/motion";

const BASE_VIEWBOX = `${VB.x} ${VB.y} ${VB.width} ${VB.height}`;

/** Extra zoom once the lens covers the screen, so the rim fully leaves the frame. */
const OVERSHOOT = 1.12;

const WIPE_HIDDEN = "inset(-10% -4% 110% -4%)";
const WIPE_SHOWN = "inset(-10% -4% -10% -4%)";
const WIPE_GONE = "inset(-10% -4% 100% -4%)";
/** The ring at the turn calls softly while the route is on screen. */
const PULSE_SPAN = { from: 6, to: 8.85 };

const fixed = (n: number) => n.toFixed(3);

/**
 * Hero and scene 2 as one continuous shot; expects `<Hero />` and
 * `<LensPassage />` as children. The Hero sticks on top of the lens passage;
 * its backdrop is cut along the lens outlines, so the inside world is seen
 * through the glass. The camera (the SVG viewBox) centres the left lens and
 * pushes through it, then the interface settles.
 *
 * Timeline units (10 = the whole sequence):
 * 0–1.4 Hero copy leaves · 0.35–4.35 camera, the street comes closer ·
 * 0.55–2.65 lenses darken · 4.2–6.4 copy, the time and Léa's message, then
 * the route drawn on the ground and its glance · 4.35–10 slow walk down the
 * street · 8.65–10 exit, the light goes out in the street: ends on plain smoke.
 */
export function Prologue({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const wrapper = root.current;
      if (!wrapper) return;
      const mm = gsap.matchMedia();

      mm.add(MOTION_OK_QUERY, () => {
        const hero = wrapper.querySelector<HTMLElement>(".hero");
        const box = wrapper.querySelector<HTMLElement>(".hero-lens-box");
        const svg = wrapper.querySelector<SVGSVGElement>(".hero-svg");
        const backdrop = wrapper.querySelector<HTMLElement>(".hero-backdrop");
        const copy = wrapper.querySelector<HTMLElement>(".hero-copy");
        if (!hero || !box || !svg || !backdrop || !copy) return;
        const world = [".passage-plate", ".passage-anchors"];

        const releaseCinematic = holdCinematic();

        // Layout of the glasses inside the (sticky, full-screen) Hero, in px.
        const stage = { x: 0, y: 0, width: 0, W: 0, H: 0, zoomEnd: 1 };
        const cam = { pan: 0, zoom: 0 };

        const measure = () => {
          let x = 0;
          let y = 0;
          for (let n: HTMLElement | null = box; n && n !== hero; n = n.offsetParent as HTMLElement | null) {
            x += n.offsetLeft;
            y += n.offsetTop;
          }
          stage.x = x;
          stage.y = y;
          stage.width = box.offsetWidth;
          stage.W = hero.clientWidth;
          stage.H = hero.clientHeight;

          const baseScale = stage.width / VB.width;
          const cover = Math.max(stage.W / LENS_SAFE_RECT.width, stage.H / LENS_SAFE_RECT.height);
          stage.zoomEnd = Math.max(2, (cover * OVERSHOOT) / baseScale);
        };

        const render = () => {
          const baseScale = stage.width / VB.width;
          const zoom = Math.pow(stage.zoomEnd, cam.zoom);
          const scale = baseScale * zoom;

          // The aim point travels from its place in the layout to the centre of the screen.
          const fromX = stage.x + (LENS_AIM.x - VB.x) * baseScale;
          const fromY = stage.y + (LENS_AIM.y - VB.y) * baseScale;
          const aimX = fromX + (stage.W / 2 - fromX) * cam.pan;
          const aimY = fromY + (stage.H / 2 - fromY) * cam.pan;

          const vx = LENS_AIM.x - (aimX - stage.x) / scale;
          const vy = LENS_AIM.y - (aimY - stage.y) / scale;
          svg.setAttribute(
            "viewBox",
            `${fixed(vx)} ${fixed(vy)} ${fixed(VB.width / zoom)} ${fixed(VB.height / zoom)}`,
          );

          // Once the lenses open, hit-testing has to go through the holes (the
          // header reads what lies under it): only the cut backdrop and the
          // frame's own hit area stay hittable.
          const still = cam.pan === 0 && cam.zoom === 0;
          hero.style.pointerEvents = still ? "" : "none";
          if (still) {
            backdrop.style.clipPath = "";
            return;
          }
          const toStage = (u: number, v: number): [number, number] => [
            stage.x + (u - vx) * scale,
            stage.y + (v - vy) * scale,
          ];
          const frame = `M0 0H${stage.W}V${stage.H}H0Z`;
          backdrop.style.clipPath = `path(evenodd, "${frame} ${mapPath(LENS_LEFT, toStage)} ${mapPath(LENS_RIGHT, toStage)}")`;
        };

        // The glasses are centred above the copy: a late font swap that rewraps
        // the copy moves them without any resize or ScrollTrigger refresh.
        const relayout = new ResizeObserver(() => {
          measure();
          render();
        });
        [hero, box, copy].forEach((el) => relayout.observe(el));

        const pulse = gsap.fromTo(
          ".route-pulse",
          { scale: 1, opacity: 1, transformOrigin: "50% 50%" },
          { scale: 2.6, opacity: 0, duration: DURATION.long * 1.5, ease: EASE.soft, repeat: -1, repeatDelay: 0.6, paused: true },
        );

        const tl = gsap.timeline({
          defaults: { ease: EASE.inOut },
          onUpdate: () => {
            render();
            const live = tl.time() > PULSE_SPAN.from && tl.time() < PULSE_SPAN.to;
            if (live !== !pulse.paused()) pulse.paused(!live);
          },
          scrollTrigger: {
            trigger: wrapper,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.85,
            onRefresh: () => {
              measure();
              render();
            },
          },
        });

        // Hero leaves: copy goes up behind a mask, the object loses its ground.
        tl.fromTo(
          ".hero-copy",
          { yPercent: 0, clipPath: "inset(-30% -4% -30% -4%)" },
          { yPercent: -18, clipPath: "inset(-30% -4% 100% -4%)", duration: 1.4 },
          0,
        )
          .to(".hero-caption", { autoAlpha: 0, y: -14, duration: DURATION.short }, 0.15)
          .to(".hero-shadow-wrap", { autoAlpha: 0, scaleX: 1.35, duration: DURATION.base }, 0.2);

        // Camera: centre the left lens, then push through it. The street comes
        // closer more slowly than the interface: it is further away.
        tl.to(cam, { pan: 1, duration: 2.4, ease: EASE.inOut }, 0.35)
          .to(cam, { zoom: 1, duration: 4, ease: EASE.inOut }, 0.35)
          .fromTo(".passage-depth", { scale: 0.68 }, { scale: 1, duration: 4, ease: EASE.inOut }, 0.35)
          .fromTo(world, { scale: 0.86 }, { scale: 1, duration: 4, ease: EASE.inOut }, 0.35)
          .to(".passage-veil", { autoAlpha: 0, duration: 2.1, ease: EASE.soft }, 0.55)
          .to(".glasses-glass", { opacity: 0, duration: 1.1, ease: "power2.in" }, 3.1)
          .set(".hero", { visibility: "hidden" }, 4.35)
          // Then a slow walk down the street, until the light goes.
          .to(world, { scale: 1.1, duration: 5.65, ease: "none" }, 4.35);

        // Inside: the copy, what follows the eyes, then the route on the ground.
        tl.fromTo(
          ".passage-title",
          { yPercent: 30, clipPath: WIPE_HIDDEN },
          { yPercent: 0, clipPath: WIPE_SHOWN, duration: 1.3, ease: EASE.out },
          4.2,
        )
          .fromTo(
            ".passage-lead",
            { yPercent: 40, clipPath: WIPE_HIDDEN },
            { yPercent: 0, clipPath: WIPE_SHOWN, duration: 1.3, ease: EASE.out },
            4.45,
          )
          .fromTo(".passage-time", { autoAlpha: 0, y: -10 }, { autoAlpha: 1, y: 0, duration: 1.1, ease: EASE.out }, 4.6)
          .fromTo(
            ".glance-head .glance-panel",
            { autoAlpha: 0, y: 12, filter: "blur(8px)" },
            { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 1.3, ease: EASE.out },
            4.9,
          )
          .fromTo(".route-line", { strokeDasharray: "1 1", strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.5 }, 5.15)
          .fromTo(
            ".route-pin",
            { autoAlpha: 0, scale: 0.4, transformOrigin: "50% 50%" },
            { autoAlpha: 1, scale: 1, duration: 1, ease: EASE.out },
            5.9,
          )
          .fromTo(".glance-stem", { scaleY: 0 }, { scaleY: 1, duration: 0.9, ease: EASE.out }, 6)
          .fromTo(
            ".glance-pinned .glance-panel",
            { autoAlpha: 0, y: 10, filter: "blur(8px)" },
            { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 1.2, ease: EASE.out },
            6.2,
          );

        // Exit, slowly: the street is held, then the copy leaves, the interface
        // goes out of focus, and the light dies on smoke.
        tl.fromTo(
          ".passage-copy",
          { yPercent: 0, clipPath: WIPE_SHOWN },
          { yPercent: -14, clipPath: WIPE_GONE, duration: 1.8 },
          8.65,
        )
          .to(".glance-head", { y: -12, autoAlpha: 0, filter: "blur(8px)", duration: 1.6 }, 8.7)
          .to(".passage-time", { autoAlpha: 0, y: -8, duration: 1.3 }, 8.72)
          .to([".glance-pinned", ".passage-route"], { autoAlpha: 0, filter: "blur(6px)", duration: 1.5 }, 8.75)
          .to([".passage-plate", ".passage-atmosphere"], { autoAlpha: 0, duration: 1.8, ease: EASE.soft }, 8.8);

        return () => {
          relayout.disconnect();
          releaseCinematic();
          svg.setAttribute("viewBox", BASE_VIEWBOX);
          backdrop.style.clipPath = "";
          hero.style.pointerEvents = "";
        };
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} className="relative">
      {children}
    </div>
  );
}
