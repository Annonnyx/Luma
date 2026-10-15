"use client";

import { useRef } from "react";

import { Glance } from "@/components/ar/Glance";
import { TitleLines } from "@/components/ui/TitleLines";
import { SHELF, Shelf } from "@/components/world/Shelf";
import { COMPANION_CONTENT, getScene } from "@/content/scenes";
import { holdCinematic } from "@/lib/cinematic";
import { createFamiliar } from "@/lib/familiar";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { EASE, FINE_POINTER_QUERY, MOTION_OK_QUERY, REDUCED_MOTION_QUERY } from "@/lib/motion";

const scene = getScene("familier");
const { line } = COMPANION_CONTENT;

const WIPE_HIDDEN = "inset(-10% -4% 110% -4%)";
const WIPE_SHOWN = "inset(-10% -4% -10% -4%)";
const WIPE_GONE = "inset(-10% -4% 100% -4%)";

/** Units of the pin during which it follows and may speak. */
const LIVE = { from: 3.3, to: 8.1 };
const HESITATE_MS = 1600;
/** Where it waits when nobody points: the edge of the gaze, not the middle. */
const REST = { x: 0.8, y: 0.34 };

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const radius = (width: number) => clamp(width * 0.02, 24, 40);

/**
 * Scene 7. It starts on the last frame of scene 6: a coat spark at the centre.
 * The spark becomes a drop of light that wakes up, then a grocery shelf comes
 * up around it. It keeps to the side of wherever you look, follows with a
 * little lag, and only speaks when you stop: it hops, says the white wine is
 * the last thing on the list, looks at the bottle (marked on the shelf), then
 * at you. Move, and it goes quiet and steps back.
 *
 * Timeline units (10 = the pin, which starts when scene 6 unpins):
 * 0.4–1.3 the spark becomes it · 1.3–2.4 it wakes · 1.6 the shelf ·
 * 2.1–3.7 it moves to the edge · 2.5–4 copy · 3.3–8.1 it follows ·
 * 8.15–10 back to the middle, asleep, gone.
 */
export function Companion() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const section = root.current;
      if (!section) return;
      const stage = section.querySelector<HTMLElement>(".companion-stage");
      const canvas = section.querySelector<HTMLCanvasElement>(".companion-canvas");
      const glance = section.querySelector<HTMLElement>(".companion-glance");
      const mark = section.querySelector<HTMLElement>(".companion-mark");
      if (!stage || !canvas || !glance || !mark) return;

      const familiar = createFamiliar(canvas, () => radius(stage.clientWidth));
      if (!familiar) return;
      const mm = gsap.matchMedia();

      mm.add({ motion: MOTION_OK_QUERY, fine: FINE_POINTER_QUERY }, (context) => {
        const { motion, fine } = context.conditions as { motion: boolean; fine: boolean };
        if (!motion) return;
        const releaseCinematic = holdCinematic();

        const view = { alpha: 0, size: 0.7, awake: 0, follow: 0 };
        const pointer = { x: 0, y: 0, known: false, t: 0 };
        const box = { w: 1, h: 1, glanceW: 0, glanceH: 0 };
        let speaking = false;
        let atBottle = false;
        let hesitate: number | undefined;
        let glanceAt: number | undefined;

        const measure = () => {
          box.w = stage.clientWidth || 1;
          box.h = stage.clientHeight || 1;
          box.glanceW = glance.offsetWidth;
          box.glanceH = glance.offsetHeight;
          familiar.resize();
        };
        measure();

        /** Where it would like to be: beside the pointer, never on it. */
        const edge = () => {
          if (!fine || !pointer.known) {
            const t = performance.now() / 1000;
            return {
              x: box.w * (REST.x + Math.sin(t * 0.37) * 0.02),
              y: box.h * (REST.y + Math.sin(t * 0.53 + 1) * 0.025),
            };
          }
          const side = pointer.x > box.w * 0.62 ? -1 : 1;
          const reach = speaking ? 0.55 : 1;
          const x = clamp(pointer.x + side * box.w * 0.12 * reach, box.w * 0.08, box.w * 0.92);
          let y = clamp(pointer.y - box.h * 0.11 * reach, box.h * 0.17, box.h * 0.7);
          // Keeps clear of the copy, bottom left.
          if (x < box.w * 0.46) y = Math.min(y, box.h * 0.56);
          return { x, y };
        };

        const tick = () => {
          const intent = familiar.intent;
          const target = edge();
          intent.x = box.w / 2 + (target.x - box.w / 2) * view.follow;
          intent.y = box.h / 2 + (target.y - box.h / 2) * view.follow;
          intent.size = view.size;
          intent.awake = view.awake;
          intent.alpha = view.alpha;
          intent.happy = speaking ? 1 : 0;

          if (atBottle) {
            const bottle = mark.getBoundingClientRect();
            const frame = stage.getBoundingClientRect();
            intent.lookX = bottle.left + bottle.width / 2 - frame.left;
            intent.lookY = bottle.top + bottle.height * 0.4 - frame.top;
          } else if (pointer.known) {
            intent.lookX = pointer.x;
            intent.lookY = pointer.y;
          } else {
            intent.lookX = box.w * 0.45;
            intent.lookY = box.h * 0.62;
          }

          // It speaks towards the middle of the view.
          const { x, y } = familiar.position;
          const gap = radius(box.w) * 1.7;
          const toLeft = x > box.w * 0.55;
          gsap.set(glance, {
            x: toLeft ? x - gap - box.glanceW : x + gap,
            y: y - box.glanceH / 2 - radius(box.w) * 0.3,
          });
        };

        const live = () => {
          const time = tl.time();
          return !!tl.scrollTrigger?.isActive && time >= LIVE.from && time <= LIVE.to;
        };
        const hush = () => {
          window.clearTimeout(glanceAt);
          atBottle = false;
          if (!speaking) return;
          speaking = false;
          gsap.to(glance, { autoAlpha: 0, duration: 0.45, ease: EASE.soft, overwrite: "auto" });
          gsap.to(mark, { autoAlpha: 0, duration: 0.6, ease: EASE.soft, overwrite: "auto" });
        };
        const speak = () => {
          if (speaking || !live()) return;
          speaking = true;
          familiar.hop();
          gsap.fromTo(glance, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8, ease: EASE.out, overwrite: "auto" });
          gsap.fromTo(mark, { autoAlpha: 0, scale: 1.12 }, { autoAlpha: 1, scale: 1, duration: 0.9, ease: EASE.out, overwrite: "auto" });
          // A look at the bottle, then back at you.
          atBottle = true;
          glanceAt = window.setTimeout(() => {
            atBottle = false;
          }, 1300);
        };
        const wait = () => {
          window.clearTimeout(hesitate);
          hesitate = window.setTimeout(speak, HESITATE_MS);
        };

        const tl = gsap.timeline({
          defaults: { ease: EASE.inOut },
          onUpdate: () => {
            // Scrolling is not hesitating.
            hush();
            wait();
          },
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.8,
            onRefresh: measure,
          },
        });

        tl.fromTo(".companion-spark", { autoAlpha: 1, scale: 1 }, { autoAlpha: 0, scale: 0.7, duration: 0.9, ease: EASE.soft }, 0.45)
          .to(view, { alpha: 1, duration: 0.8, ease: EASE.soft }, 0.4)
          .to(view, { size: 1, duration: 1.4, ease: EASE.out }, 0.5)
          .to(view, { awake: 1, duration: 1.1, ease: EASE.inOut }, 1.3)
          .fromTo(".companion-world", { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.6, ease: EASE.soft }, 1.6)
          .fromTo(".companion-ambient", { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.2, ease: EASE.soft }, 1.6)
          .fromTo(".companion-camera", { scale: 1.06 }, { scale: 1, duration: 7.4, ease: EASE.linear }, 1.6)
          .to(view, { follow: 1, duration: 1.6, ease: EASE.inOut }, 2.1)
          .fromTo(".companion-title", { yPercent: 30, clipPath: WIPE_HIDDEN }, { yPercent: 0, clipPath: WIPE_SHOWN, duration: 1.3, ease: EASE.out }, 2.5)
          .fromTo(".companion-lead", { yPercent: 30, clipPath: WIPE_HIDDEN }, { yPercent: 0, clipPath: WIPE_SHOWN, duration: 1.3, ease: EASE.out }, 2.85);

        tl.to([".companion-title", ".companion-lead"], { yPercent: -14, clipPath: WIPE_GONE, duration: 1.3, stagger: 0.08 }, 8.15)
          .to(view, { follow: 0, duration: 1.1, ease: EASE.inOut }, 8.2)
          .to(".companion-world", { autoAlpha: 0, duration: 1.2, ease: EASE.soft }, 8.6)
          .to(view, { awake: 0, duration: 0.8, ease: EASE.inOut }, 8.9)
          .to(".companion-ambient", { autoAlpha: 0, duration: 1, ease: EASE.soft }, 9)
          .to(view, { size: 0.6, alpha: 0, duration: 0.8, ease: EASE.inOut }, 9.2);

        // The drawing runs only while the stage can be seen.
        const running = ScrollTrigger.create({
          trigger: section,
          start: "top bottom",
          end: "bottom top",
          onToggle: (self) => {
            if (self.isActive) {
              measure();
              gsap.ticker.add(tick);
              tick();
              familiar.start();
            } else {
              gsap.ticker.remove(tick);
              familiar.stop();
            }
          },
        });

        let onPointerMove: ((event: PointerEvent) => void) | undefined;
        if (fine) {
          onPointerMove = (event: PointerEvent) => {
            if (!running.isActive) return;
            const frame = stage.getBoundingClientRect();
            const x = event.clientX - frame.left;
            const y = event.clientY - frame.top;
            const now = performance.now();
            if (pointer.known && speaking) {
              const speed = (Math.hypot(x - pointer.x, y - pointer.y) / Math.max(1, now - pointer.t)) * 1000;
              if (speed > 1800) familiar.flinch();
            }
            Object.assign(pointer, { x, y, known: true, t: now });
            hush();
            wait();
          };
          window.addEventListener("pointermove", onPointerMove, { passive: true });
        }

        const relayout = new ResizeObserver(measure);
        relayout.observe(stage);

        return () => {
          if (onPointerMove) window.removeEventListener("pointermove", onPointerMove);
          window.clearTimeout(hesitate);
          window.clearTimeout(glanceAt);
          relayout.disconnect();
          gsap.ticker.remove(tick);
          familiar.stop();
          releaseCinematic();
        };
      });

      // Without motion: it waits at the edge, awake, and has already spoken.
      mm.add(REDUCED_MOTION_QUERY, () => {
        const place = () => {
          const w = stage.clientWidth;
          const h = stage.clientHeight;
          familiar.resize();
          Object.assign(familiar.intent, {
            x: w * REST.x,
            y: h * REST.y,
            lookX: w * 0.45,
            lookY: h * 0.6,
            size: 1,
            awake: 1,
            happy: 1,
            alpha: 1,
          });
          familiar.drawStill();
          gsap.set(glance, { x: w * REST.x - radius(w) * 1.7 - glance.offsetWidth, y: h * REST.y - glance.offsetHeight / 2 });
        };
        place();
        gsap.set([glance, mark], { autoAlpha: 1 });
        gsap.set(".companion-spark", { autoAlpha: 0 });
        const relayout = new ResizeObserver(place);
        relayout.observe(stage);
        return () => relayout.disconnect();
      });

      return () => familiar.destroy();
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      data-theme={scene.theme}
      aria-labelledby={`${scene.id}-title`}
      className="relative cinematic:-mt-[max(100svh,38rem)] cinematic:h-[360svh]"
    >
      <div id={scene.id} className="absolute inset-x-0 top-0 h-px cinematic:top-[120svh]" />

      <div className="companion-stage relative h-svh min-h-[38rem] overflow-hidden bg-smoke [container-type:size] cinematic:sticky cinematic:top-0">
        {/* A grocery shelf in the evening, through the smoked glass */}
        <div aria-hidden className="companion-world pointer-events-none absolute inset-0">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="companion-camera relative aspect-[8/5] w-[max(112cqw,179cqh)] shrink-0 will-change-transform">
              <Shelf className="absolute inset-0 size-full" />
              {/* The bottle it means, marked where it stands */}
              <div
                className="companion-mark invisible absolute"
                style={{
                  left: `${SHELF.wine.x * 100}%`,
                  top: `${SHELF.wine.y * 100}%`,
                  width: `${SHELF.wine.w * 100}%`,
                  height: `${SHELF.wine.h * 100}%`,
                }}
              >
                <span className="absolute -inset-x-3 -inset-y-3.5">
                  <span className="absolute top-0 left-0 size-3 rounded-tl-[3px] border-t border-l border-coat/90" />
                  <span className="absolute top-0 right-0 size-3 rounded-tr-[3px] border-t border-r border-coat/90" />
                  <span className="absolute bottom-0 left-0 size-3 rounded-bl-[3px] border-b border-l border-coat/90" />
                  <span className="absolute right-0 bottom-0 size-3 rounded-br-[3px] border-r border-b border-coat/90" />
                </span>
              </div>
            </div>
          </div>
          <div className="absolute inset-0 bg-smoke/30" />
          <div className="absolute inset-0 bg-[radial-gradient(90%_80%_at_50%_45%,transparent_48%,rgb(0_0_0/0.55))]" />
        </div>
        <div aria-hidden className="companion-ambient pointer-events-none absolute inset-0">
          <div className="grain absolute inset-0 opacity-[0.05] mix-blend-soft-light" />
        </div>

        <canvas aria-hidden className="companion-canvas pointer-events-none absolute inset-0 size-full" />

        <div
          aria-hidden
          className="companion-spark pointer-events-none absolute top-1/2 left-1/2 size-(--handoff-spark) -translate-x-1/2 -translate-y-1/2 rounded-full bg-coat"
        />

        <Glance className="companion-glance pointer-events-none invisible absolute top-0 left-0 w-max max-w-[15rem]">
          <p className="type-body text-[0.9375rem] leading-snug">{line}</p>
        </Glance>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 px-gutter pb-[clamp(1.75rem,8svh,5rem)]">
          <div className="mx-auto grid max-w-[112rem] grid-cols-12">
            <div className="col-span-12 md:col-span-7 lg:col-span-5">
              <h2 id={`${scene.id}-title`} className="companion-title type-title">
                <TitleLines title={scene.title} />
              </h2>
              <p className="companion-lead type-lead mt-6 max-w-[36ch] text-pretty text-ink-muted">{scene.lead}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
