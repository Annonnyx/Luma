"use client";

import { useRef } from "react";

import { HandoffRing } from "@/components/ar/HandoffRing";
import { TimerWindow } from "@/components/ar/TimerWindow";
import { ListWindow, MessagesWindow, RecipeWindow, RouteWindow } from "@/components/ar/windows";
import { BAND_STEPS, Band, poseBand } from "@/components/product/Band";
import { TitleLines } from "@/components/ui/TitleLines";
import { Street } from "@/components/world/Street";
import { getScene, RING_CONTENT } from "@/content/scenes";
import { useFinePointer } from "@/hooks/useMediaQuery";
import { hideWhenDetached, holdCinematic } from "@/lib/cinematic";
import { Draggable, gsap, useGSAP } from "@/lib/gsap";
import { EASE, FINE_POINTER_QUERY, MOTION_OK_QUERY, REDUCED_MOTION_QUERY } from "@/lib/motion";
import { rasterizeSvg } from "@/lib/rasterize";
import { createReveal } from "@/lib/reveal";

const scene = getScene("bague");
const { caption, hint, control, windows: WINDOW_NAMES } = RING_CONTENT;

const WIPE_HIDDEN = "inset(-10% -4% 110% -4%)";
const WIPE_SHOWN = "inset(-10% -4% -10% -4%)";
const WIPE_GONE = "inset(-10% -4% 100% -4%)";

/** In the order the ring brings them round; one detent each. */
const DECK = [RouteWindow, MessagesWindow, ListWindow, RecipeWindow, TimerWindow] as const;
const STEP_DEG = 360 / BAND_STEPS;
/** Drag distance for one detent, px. */
const STEP_PX = 160;
const TILT = 64;
const DEMO = { from: 4.6, to: 7.9 };
/** Left alone, the ring turns one detent by itself here. */
const AUTO_TURN = 6.5;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (v: number) => v * v * (3 - 2 * v);

/**
 * Scene 6. It starts on the last frame of scene 5: the lit edge of the iris,
 * alone on smoke. Titanium forms inside that light, from the edge inwards; the
 * ring tilts into the hand and the windows come out of it, over the street.
 * Turning the ring brings the next window round, one detent at a time. The
 * pointer wipes the interface away: under it, the street as it is.
 * On the way out the windows go back into the ring, which recedes to a spark.
 *
 * Timeline units (10 = the pin, which starts when scene 5 unpins):
 * 0.3–1.8 the metal forms · 1.6–3.8 the ring in the hand · 2.2 the street ·
 * 3.1–4.8 the windows · 3.5–5 copy · 4.6–7.9 free turn (one detent by itself
 * at 6.5) · 7.9–9 the windows go back · 8.6–9.8 the ring becomes a spark.
 */
export function Ring() {
  const root = useRef<HTMLElement>(null);
  const fine = useFinePointer();
  const hints = fine ? hint.pointer : hint.touch;

  useGSAP(
    () => {
      const section = root.current;
      if (!section) return;
      const stage = section.querySelector<HTMLElement>(".ring-stage");
      const object = section.querySelector<HTMLElement>(".ring-object");
      const band = section.querySelector<SVGSVGElement>(".ring-band");
      const hit = section.querySelector<HTMLElement>(".ring-hit");
      const deck = section.querySelector<HTMLElement>(".ring-deck");
      const camera = section.querySelector<HTMLElement>(".ring-camera");
      const spark = section.querySelector<HTMLElement>(".ring-spark");
      const hintEl = section.querySelector<HTMLElement>(".ring-hint");
      if (!stage || !object || !band || !hit || !deck || !camera || !spark || !hintEl) return;

      const pose = poseBand(band);
      const cards = Array.from(deck.querySelectorAll<HTMLElement>(".ring-window")).map((el) => ({
        el,
        pane: el.querySelector<HTMLElement>(".pane"),
      }));

      const layout = { w: 1, h: 1, box: 1, held: 0.4, lift: 0, deckY: 0, gap: 0, spark: 0.08 };
      /** `hold` 0 → 1: from the handoff frame to the ring in the hand; `shrink` 0 → 1: to the spark. */
      const view = { fill: 0, rim: 0, tilt: 0, hold: 0, spin: 0, emerge: 0, auto: 0, shrink: 0 };
      const user = { p: 0 };
      let active = -1;

      const measure = () => {
        layout.w = stage.clientWidth || 1;
        layout.h = stage.clientHeight || 1;
        layout.box = object.offsetWidth || 1;
        const narrow = layout.w < 768;
        layout.held = narrow ? 0.5 : 0.4;
        layout.lift = layout.h * (narrow ? 0.27 : 0.21);
        layout.deckY = layout.h * (narrow ? 0.5 : 0.33);
        layout.gap = narrow ? layout.w * 0.92 : Math.min(layout.w * 0.23, 400);
        layout.spark = spark.offsetWidth / layout.box;
        // Under the ring: half its tilted height (face and wall), then a gap.
        const ringHalf = layout.box * layout.held * 0.31;
        hintEl.style.top = `${Math.round(layout.h / 2 + layout.lift + ringHalf + 22)}px`;
      };

      const renderDeck = (p: number, ringY: number) => {
        const count = cards.length;
        cards.forEach(({ el, pane }, i) => {
          let d = (((i - p) % count) + count) % count;
          if (d > count / 2) d -= count;
          const far = Math.abs(d);
          // The one in front comes out first.
          const e = clamp01(view.emerge * 1.35 - far * 0.18);
          const k = smooth(e);
          const slotX = layout.w / 2 + d * layout.gap;
          const slotY = layout.deckY + d * d * layout.h * 0.022;
          const slotScale = 1 - Math.min(far, 2) * 0.13;
          // Never more than three panes: the next ones go before they arrive.
          const slotAlpha = far < 1 ? 1 - far * 0.45 : far < 1.5 ? 0.55 * ((1.5 - far) / 0.5) : 0;
          const alpha = slotAlpha * clamp01(e * 1.8);
          // Centred on (x, y) by its own -50% translate.
          gsap.set(el, {
            left: 0,
            top: 0,
            x: layout.w / 2 + (slotX - layout.w / 2) * k,
            y: ringY + (slotY - ringY) * k,
            scale: 0.1 + (slotScale - 0.1) * k,
            zIndex: 10 - Math.round(far * 2),
            visibility: alpha > 0.01 ? "visible" : "hidden",
          });
          if (pane) pane.style.opacity = alpha.toFixed(3);
        });
      };

      const announce = (p: number) => {
        const index = ((Math.round(p) % cards.length) + cards.length) % cards.length;
        if (index === active) return;
        active = index;
        hit.setAttribute("aria-valuenow", String(index + 1));
        hit.setAttribute("aria-valuetext", WINDOW_NAMES[index] ?? "");
      };

      const render = () => {
        const held = 1 + (layout.held - 1) * view.hold;
        const scale = held + (layout.spark - held) * view.shrink;
        const lift = layout.lift * view.hold * (1 - view.shrink);
        gsap.set(object, { y: lift, scale });
        const p = view.auto + user.p;
        pose({ tilt: view.tilt, turn: view.spin + p * STEP_DEG, fill: view.fill, rim: view.rim });
        renderDeck(p, layout.h / 2 + lift);
        announce(p);
      };

      const mm = gsap.matchMedia();

      mm.add({ motion: MOTION_OK_QUERY, fine: FINE_POINTER_QUERY }, (context) => {
        const { motion, fine: precise } = context.conditions as { motion: boolean; fine: boolean };
        if (!motion) return;

        const releaseCinematic = holdCinematic();
        const showStage = hideWhenDetached(section, stage);
        measure();

        // Turning: a horizontal drag on the ring or the windows, with inertia,
        // landing on a detent. The proxy's x is the turn.
        const proxy = document.createElement("div");
        proxy.style.cssText = "position:absolute;top:0;left:0;width:1px;height:1px;visibility:hidden";
        stage.append(proxy);
        const follow = () => {
          user.p = -(gsap.getProperty(proxy, "x") as number) / STEP_PX;
          render();
        };
        let stepping: gsap.core.Tween | undefined;
        const choose = () => {
          const pane = cards[active]?.pane;
          if (pane) gsap.fromTo(pane, { scale: 1 }, { scale: 1.035, duration: 0.2, ease: EASE.soft, yoyo: true, repeat: 1 });
          gsap.fromTo(band.querySelector(".band-tick"), { strokeWidth: 1.15 }, { strokeWidth: 2.4, duration: 0.2, yoyo: true, repeat: 1 });
        };
        const [drag] = Draggable.create(proxy, {
          type: "x",
          trigger: [hit, deck],
          inertia: true,
          minimumMovement: 4,
          cursor: "grab",
          activeCursor: "grabbing",
          snap: (value: number) => Math.round(value / STEP_PX) * STEP_PX,
          onPress: () => stepping?.kill(),
          onDrag: follow,
          onThrowUpdate: follow,
          onClick: choose,
        });
        drag.disable();

        const step = (direction: number) => {
          const at = Math.round(-(gsap.getProperty(proxy, "x") as number) / STEP_PX);
          stepping?.kill();
          stepping = gsap.to(proxy, {
            x: -(at + direction) * STEP_PX,
            duration: 0.8,
            ease: EASE.inOut,
            onUpdate: () => {
              drag.update();
              follow();
            },
          });
        };
        let armed = false;
        const onKey = (event: KeyboardEvent) => {
          if (!armed) return;
          if (event.key === "ArrowRight" || event.key === "ArrowDown") step(1);
          else if (event.key === "ArrowLeft" || event.key === "ArrowUp") step(-1);
          else if (event.key === "Enter" || event.key === " ") choose();
          else return;
          event.preventDefault();
        };
        hit.addEventListener("keydown", onKey);
        const arm = (next: boolean) => {
          if (next === armed || (!next && (drag.isPressed || drag.isThrowing))) return;
          armed = next;
          if (next) drag.enable();
          else drag.disable();
          hit.tabIndex = next ? 0 : -1;
        };
        hit.tabIndex = -1;

        // The world without the interface, drawn once when the page is idle.
        const canvas = section.querySelector<HTMLCanvasElement>(".ring-reveal");
        const reveal = canvas
          ? createReveal(canvas, () => {
              const picture = camera.getBoundingClientRect();
              const box = canvas.getBoundingClientRect();
              return { x: picture.left - box.left, y: picture.top - box.top, width: picture.width, height: picture.height };
            })
          : null;
        let cancelled = false;
        const prepare = () => {
          const street = section.querySelector<SVGSVGElement>(".ring-street");
          if (!street || !reveal) return;
          const dpr = Math.min(2, window.devicePixelRatio || 1);
          const width = Math.min(3200, Math.round(camera.offsetWidth * dpr));
          rasterizeSvg(street, width, Math.round((width * 5) / 8))
            .then((picture) => {
              if (!cancelled) reveal.setPicture(picture);
            })
            .catch(() => undefined);
        };
        const usesIdle = typeof window.requestIdleCallback === "function";
        const idle = usesIdle ? window.requestIdleCallback(prepare, { timeout: 5000 }) : window.setTimeout(prepare, 2500);

        let revealing = false;
        const onPointerMove = (event: PointerEvent) => {
          if (!revealing || !reveal || !canvas) return;
          const box = canvas.getBoundingClientRect();
          reveal.point(event.clientX - box.left, event.clientY - box.top);
        };
        const onPointerLeave = () => reveal?.leave();
        window.addEventListener("pointermove", onPointerMove, { passive: true });
        document.documentElement.addEventListener("pointerleave", onPointerLeave);

        const tl = gsap.timeline({
          defaults: { ease: EASE.inOut },
          onUpdate: () => {
            render();
            const time = tl.time();
            const inside = !!tl.scrollTrigger?.isActive;
            arm(inside && time >= DEMO.from && time <= DEMO.to);
            revealing = inside && time >= DEMO.from - 0.4 && time <= DEMO.to + 0.1;
            reveal?.setLive(revealing);
            reveal?.setWander(revealing && !precise);
          },
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.8,
            onRefresh: () => {
              measure();
              render();
            },
          },
        });

        // The light of scene 5 becomes metal, from its edge inwards; a little
        // of it stays on the rim.
        tl.to(view, { fill: 1, duration: 1.5, ease: EASE.inOut }, 0.3)
          .to(".ring-handoff", { autoAlpha: 0, duration: 0.9, ease: EASE.soft }, 1.2)
          .to(view, { rim: 0.32, duration: 0.9, ease: EASE.soft }, 1.2)
          .to(view, { tilt: TILT, duration: 2.2, ease: EASE.inOut }, 1.6)
          .to(view, { hold: 1, duration: 2.2, ease: EASE.inOut }, 1.6)
          .fromTo(view, { spin: -150 }, { spin: 0, duration: 2.6, ease: EASE.out }, 1.6)
          .fromTo(".ring-world", { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.8, ease: EASE.soft }, 2.2)
          .fromTo(".ring-ambient", { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.2, ease: EASE.soft }, 2.2)
          .fromTo(camera, { scale: 1.08 }, { scale: 1, duration: 7, ease: EASE.linear }, 2.2)
          .to(view, { emerge: 1, duration: 1.7, ease: EASE.linear }, 3.1)
          .fromTo(".ring-title", { yPercent: 30, clipPath: WIPE_HIDDEN }, { yPercent: 0, clipPath: WIPE_SHOWN, duration: 1.3, ease: EASE.out }, 3.5)
          .fromTo(".ring-lead", { yPercent: 30, clipPath: WIPE_HIDDEN }, { yPercent: 0, clipPath: WIPE_SHOWN, duration: 1.3, ease: EASE.out }, 3.8)
          .fromTo(".ring-caption > *", { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 1, ease: EASE.out, stagger: 0.1 }, 4.3)
          .fromTo(".ring-hint > *", { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 1, ease: EASE.out, stagger: 0.14 }, 4.5)
          .to(view, { auto: 1, duration: 0.8, ease: EASE.inOut }, AUTO_TURN);

        // Out: the windows go back into the ring; it lies flat, turns, and
        // recedes to the spark scene 7 starts on, light again.
        tl.to(".ring-hint > *", { autoAlpha: 0, y: -6, duration: 0.7, stagger: 0.05 }, DEMO.to)
          .to(view, { emerge: 0, duration: 1.1, ease: EASE.linear }, DEMO.to)
          .to([".ring-title", ".ring-lead"], { yPercent: -14, clipPath: WIPE_GONE, duration: 1.3, stagger: 0.08 }, DEMO.to + 0.05)
          .to(".ring-caption > *", { autoAlpha: 0, y: -6, duration: 0.8, stagger: 0.06 }, DEMO.to + 0.05)
          .to(".ring-world", { autoAlpha: 0, duration: 1.1, ease: EASE.soft }, 8.5)
          .to(".ring-ambient", { autoAlpha: 0, duration: 1, ease: EASE.soft }, 8.6)
          .to(view, { tilt: 0, duration: 1.1, ease: EASE.inOut }, 8.6)
          .to(view, { shrink: 1, duration: 1.1, ease: EASE.inOut }, 8.6)
          .to(view, { spin: 200, duration: 1.1, ease: "power2.in" }, 8.6)
          .to(view, { rim: 1, duration: 0.6, ease: EASE.soft }, 9.0)
          .to(".ring-band", { autoAlpha: 0, duration: 0.5, ease: EASE.soft }, 9.35)
          .fromTo(spark, { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.55, ease: EASE.out }, 9.3);
        // The first frame must be the handoff frame before anything scrolls.
        render();

        const relayout = new ResizeObserver(() => {
          measure();
          render();
          reveal?.resize();
        });
        relayout.observe(stage);

        return () => {
          cancelled = true;
          if (usesIdle) window.cancelIdleCallback(idle);
          else window.clearTimeout(idle);
          window.removeEventListener("pointermove", onPointerMove);
          document.documentElement.removeEventListener("pointerleave", onPointerLeave);
          hit.removeEventListener("keydown", onKey);
          relayout.disconnect();
          stepping?.kill();
          drag.kill();
          proxy.remove();
          reveal?.destroy();
          releaseCinematic();
          showStage();
        };
      });

      // Without motion: the ring in the hand, the windows out, nothing moves.
      mm.add(REDUCED_MOTION_QUERY, () => {
        Object.assign(view, { fill: 1, rim: 0.32, tilt: TILT, hold: 1, spin: 0, emerge: 1, auto: 0, shrink: 0 });
        user.p = 0;
        measure();
        render();
        gsap.set([".ring-handoff", spark], { autoAlpha: 0 });
        const onKey = (event: KeyboardEvent) => {
          const forward = event.key === "ArrowRight" || event.key === "ArrowDown";
          const back = event.key === "ArrowLeft" || event.key === "ArrowUp";
          if (!forward && !back) return;
          event.preventDefault();
          user.p = Math.round(user.p) + (forward ? 1 : -1);
          render();
        };
        hit.addEventListener("keydown", onKey);
        const relayout = new ResizeObserver(() => {
          measure();
          render();
        });
        relayout.observe(stage);
        return () => {
          hit.removeEventListener("keydown", onKey);
          relayout.disconnect();
        };
      });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      data-theme={scene.theme}
      aria-labelledby={`${scene.id}-title`}
      className="relative cinematic:-mt-[max(100svh,38rem)] cinematic:h-[600svh]"
    >
      {/* Anchor target: the ring in the hand, the windows out. */}
      <div id={scene.id} className="absolute inset-x-0 top-0 h-px cinematic:top-[260svh]" />

      {/* Below scene 5's stage (it slides in underneath), above scene 7's. */}
      <div className="ring-stage relative h-svh min-h-[38rem] overflow-hidden bg-smoke [container-type:size] cinematic:sticky cinematic:top-0 cinematic:z-[5]">
        {/* The street, through the smoked glass */}
        <div aria-hidden className="ring-world pointer-events-none absolute inset-0">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="ring-camera relative aspect-[8/5] w-[max(112cqw,179cqh)] shrink-0 will-change-transform">
              <Street className="ring-street absolute inset-0 size-full" />
            </div>
          </div>
          <div className="absolute inset-0 bg-smoke/35" />
          <div className="absolute inset-0 bg-[radial-gradient(85%_75%_at_50%_42%,transparent_45%,rgb(0_0_0/0.5))]" />
        </div>
        <div aria-hidden className="ring-ambient pointer-events-none absolute inset-0">
          <div className="grain absolute inset-0 opacity-[0.05] mix-blend-soft-light" />
        </div>

        <div className="ring-deck absolute inset-0 touch-pan-y">
          {DECK.map((Window, i) => (
            <Window
              key={WINDOW_NAMES[i]}
              windowId={`ring-${i}`}
              className={`ring-window top-[33%] left-1/2 w-[min(20rem,76vw)] -translate-x-1/2 -translate-y-1/2 ${i ? "invisible" : ""}`}
            />
          ))}
        </div>

        {/* Above the windows, under the ring: the ring is real, it stays. */}
        <canvas aria-hidden className="ring-reveal pointer-events-none absolute inset-0 size-full" />

        <div className="ring-object pointer-events-none absolute top-1/2 left-1/2 size-(--handoff-ring) -translate-x-1/2 -translate-y-1/2 will-change-transform">
          <Band className="ring-band size-full" />
          <div
            role="slider"
            tabIndex={0}
            aria-label={control}
            aria-valuemin={1}
            aria-valuemax={WINDOW_NAMES.length}
            aria-valuenow={1}
            aria-valuetext={WINDOW_NAMES[0]}
            className="ring-hit pointer-events-auto absolute inset-x-[2%] inset-y-[16%] cursor-grab touch-pan-y rounded-[50%] focus-visible:outline-[3px]"
          />
        </div>

        <HandoffRing className="ring-handoff" />

        <div
          aria-hidden
          className="ring-spark pointer-events-none absolute top-1/2 left-1/2 size-(--handoff-spark) -translate-x-1/2 -translate-y-1/2 rounded-full bg-coat opacity-0"
        />

        <p className="ring-hint type-caption pointer-events-none absolute top-[86%] left-1/2 flex w-max max-w-[88vw] -translate-x-1/2 flex-col items-center gap-1 text-center text-ink-muted">
          <span>{hints.turn}</span>
          <span>{hints.look}</span>
        </p>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 px-gutter pb-[clamp(1.75rem,8svh,5rem)] max-md:top-[calc(var(--header-h)+0.5rem)] max-md:bottom-auto">
          <div className="mx-auto grid max-w-[112rem] grid-cols-12 items-end gap-y-6">
            <div className="col-span-12 md:col-span-7 lg:col-span-4">
              <h2 id={`${scene.id}-title`} className="ring-title type-title">
                <TitleLines title={scene.title} />
              </h2>
              <p className="ring-lead type-lead mt-6 max-w-[34ch] text-pretty text-ink-muted max-md:mt-3">{scene.lead}</p>
            </div>
            <p className="ring-caption type-caption col-span-12 flex flex-col gap-1 max-md:hidden md:col-span-4 md:col-start-9 md:items-end md:text-right lg:col-span-3 lg:col-start-10">
              <span>{caption.title}</span>
              <span className="text-ink-muted">{caption.body}</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
