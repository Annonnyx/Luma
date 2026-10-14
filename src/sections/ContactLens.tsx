"use client";

import { useRef } from "react";

import { HANDOFF, HandoffRing } from "@/components/ar/HandoffRing";
import { TitleLines } from "@/components/ui/TitleLines";
import { EYE, Eye, lidPaths } from "@/components/world/Eye";
import { CONTACT_LENS_CONTENT, getScene } from "@/content/scenes";
import { hideWhenDetached, holdCinematic } from "@/lib/cinematic";
import { gsap, useGSAP } from "@/lib/gsap";
import { DURATION, EASE, FINE_POINTER_QUERY, MOTION_OK_QUERY } from "@/lib/motion";

const scene = getScene("lentilles");
const { caption } = CONTACT_LENS_CONTENT;

const WIPE_HIDDEN = "inset(-10% -4% 110% -4%)";
const WIPE_SHOWN = "inset(-10% -4% -10% -4%)";
const WIPE_GONE = "inset(-10% -4% 100% -4%)";

/** The eye follows the pointer between these units, then looks straight again for the handoff. */
const LOOK = { from: 5.6, to: 8.15 };
/** Scroll positions where the eye blinks, played in real time when crossed. */
const BLINKS = [4.6, 7.15];
/** The edge of the iris lights up, then leaves the eye as the ring of scene 6. */
const LIMBUS = { draw: 8.15, handoff: 9.1 };
/** Picture width in its own units (see `Eye`). */
const PICTURE_W = 1600;

/**
 * Scene 5. It starts in the dark left by the kitchen. An eye opens, very
 * close; the lens settles on it; the pupil contracts as the interface lights
 * up inside it. On the way out, light runs round the edge of the iris; the
 * camera pulls back with that ring held on the iris, the eye closes under it,
 * and the ring stays, alone, at the size of the ring of scene 6, which
 * overlaps this section by a screen and starts on that exact frame.
 *
 * Timeline units (10 = the pin, which starts exactly when scene 4 unpins):
 * 0–0.5 dark · 0.5–2.1 a slit of light · 2.1–4.6 the eye opens on the iris ·
 * 3.2–4.8 the lens settles · 3.6–5.2 copy · 5–7 the pupil contracts ·
 * 5.6–8.15 the eye follows the pointer · 8.15–9.1 the iris edge lights up ·
 * 9.1–10 the camera pulls back, the eye closes, the ring stays.
 */
export function ContactLens() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const section = root.current;
      if (!section) return;
      const mm = gsap.matchMedia();

      mm.add({ motion: MOTION_OK_QUERY, fine: FINE_POINTER_QUERY }, (context) => {
        const { motion, fine } = context.conditions as { motion: boolean; fine: boolean };
        if (!motion) return;

        const stage = section.querySelector<HTMLElement>(".lens-stage");
        const camera = section.querySelector<HTMLElement>(".lens-camera");
        const handoff = section.querySelector<SVGSVGElement>(".handoff-ring");
        const lidUpper = section.querySelector<SVGPathElement>(".eye-lid-upper");
        const lidLower = section.querySelector<SVGPathElement>(".eye-lid-lower");
        const edgeUpper = section.querySelector<SVGPathElement>(".eye-lid-upper-edge");
        const edgeLower = section.querySelector<SVGPathElement>(".eye-lid-lower-edge");
        const shades = Array.from(section.querySelectorAll<SVGPathElement>(".eye-lid-shade"));
        const rims = section.querySelector<SVGGElement>(".eye-lid-rims");
        if (!stage || !camera || !handoff || !lidUpper || !lidLower || !edgeUpper || !edgeLower || !rims) return;

        const releaseCinematic = holdCinematic();
        const showStage = hideWhenDetached(section, stage);

        /** `pull`: 0 → 1, the camera backs away until the iris edge is the size of the ring. */
        const view = { open: 0, look: 0, pull: 0 };
        /** Real-time blink, multiplied with the scrubbed opening. */
        const blink = { k: 1 };
        // The iris edge on screen at camera scale 1 (px), and the scale where it matches the ring.
        const iris = { r: 1, box: 1, end: 1 };
        const circles = Array.from(handoff.querySelectorAll<SVGCircleElement>(".handoff-circle"));
        const limbus = {
          bloom: section.querySelector<SVGCircleElement>(".eye-limbus-bloom"),
          glow: section.querySelector<SVGCircleElement>(".eye-limbus-glow"),
          line: section.querySelector<SVGCircleElement>(".eye-limbus-line"),
        };

        // The handoff ring stays on the iris edge: same radius, whatever the camera scale.
        let pulled = false;
        let drawnR = "";
        const renderPull = () => {
          const scale = 1 + (iris.end - 1) * view.pull;
          if (view.pull > 0 || pulled) gsap.set(camera, { scale });
          pulled = view.pull > 0;
          const r = (((iris.r * scale) / iris.box) * 100).toFixed(3);
          if (r === drawnR) return;
          drawnR = r;
          for (const circle of circles) circle.setAttribute("r", r);
        };

        let drawnOpen = -1;
        const renderLids = () => {
          const open = view.open * blink.k;
          if (Math.abs(open - drawnOpen) < 0.0005) return;
          drawnOpen = open;
          const lids = lidPaths(open);
          lidUpper.setAttribute("d", lids.upper);
          lidLower.setAttribute("d", lids.lower);
          edgeUpper.setAttribute("d", lids.upperEdge);
          edgeLower.setAttribute("d", lids.lowerEdge);
          for (const shade of shades) shade.setAttribute("d", lids.upperEdge);
          // Closed, the wet rims would draw a line across the dark.
          rims.style.opacity = String(gsap.utils.clamp(0, 1, open * 4));
        };

        const measure = () => {
          const unit = camera.offsetWidth / PICTURE_W;
          iris.r = EYE.iris * unit;
          iris.box = handoff.getBoundingClientRect().width || 1;
          iris.end = ((HANDOFF.r / 100) * iris.box) / iris.r;
          // The lit edge has the handoff ring's strokes, in px, at camera scale 1.
          limbus.bloom?.setAttribute("stroke-width", (HANDOFF.bloom / unit).toFixed(2));
          limbus.glow?.setAttribute("stroke-width", (HANDOFF.glow / unit).toFixed(2));
          limbus.line?.setAttribute("stroke-width", (HANDOFF.line / unit).toFixed(2));
          renderPull();
        };
        measure();

        // A blink is a gesture, not a scroll position: once its point is crossed
        // going down, it plays at its own pace, slowly, like someone thinking.
        let blinking: gsap.core.Timeline | undefined;
        let lastTime = 0;
        const blinkWhenCrossed = (time: number) => {
          const crossed = BLINKS.some((at) => lastTime < at && time >= at);
          lastTime = time;
          if (!crossed || view.open < 0.9 || blinking?.isActive()) return;
          blinking = gsap
            .timeline({ onUpdate: renderLids })
            .to(blink, { k: 0.03, duration: 0.65, ease: "sine.inOut" })
            .to(blink, { k: 1, duration: 1.1, ease: "power2.out" }, "+=0.16");
        };

        // The eye looks at the pointer, a little; only while it is fully open.
        const gaze = { x: 0, y: 0 };
        const moving = [".eye-iris", ".eye-pupil", ".eye-lens", ".eye-ui"];
        let looked = "";
        const applyGaze = () => {
          const k = view.look;
          const key = `${(gaze.x * k).toFixed(4)} ${(gaze.y * k).toFixed(4)}`;
          if (key === looked) return;
          looked = key;
          gsap.set(moving, { x: gaze.x * 18 * k, y: gaze.y * 10 * k });
          gsap.set(".eye-glints", { x: gaze.x * 7 * k, y: gaze.y * 4 * k });
        };

        const tl = gsap.timeline({
          defaults: { ease: EASE.inOut },
          onUpdate: () => {
            blinkWhenCrossed(tl.time());
            renderLids();
            renderPull();
            applyGaze();
          },
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.85,
            onRefresh: measure,
          },
        });

        // A slit first, then the iris is given time to be seen (a strong ease
        // would skip the middle of the opening, where the drawing lives).
        tl.to(view, { open: 0.2, duration: 1.6, ease: EASE.linear }, 0.5)
          .to(view, { open: 1, duration: 2.5, ease: EASE.linear }, 2.1)
          .fromTo(camera, { scale: 1.14 }, { scale: 1, duration: 4.2, ease: EASE.inOut }, 0.5)
          .fromTo(
            ".eye-lens",
            { autoAlpha: 0, scale: 1.16, yPercent: -3, transformOrigin: "50% 50%" },
            { autoAlpha: 1, scale: 1, yPercent: 0, duration: 2.2, ease: EASE.out },
            3.2,
          )
          .fromTo(".lens-title", { yPercent: 30, clipPath: WIPE_HIDDEN }, { yPercent: 0, clipPath: WIPE_SHOWN, duration: 1.4, ease: EASE.out }, 3.6)
          .fromTo(".lens-lead", { yPercent: 30, clipPath: WIPE_HIDDEN }, { yPercent: 0, clipPath: WIPE_SHOWN, duration: 1.4, ease: EASE.out }, 4);

        // After the first blink, the pupil contracts as the ring draws itself.
        tl.fromTo(".eye-pupil", { scale: 1.24, transformOrigin: "50% 50%" }, { scale: 0.86, duration: 2, ease: EASE.inOut }, 5)
          .fromTo(".eye-ui", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8, ease: EASE.soft }, 5.1)
          .fromTo(".eye-ui-arc", { strokeDasharray: "0 1" }, { strokeDasharray: "0.72 1", duration: 1.8, ease: EASE.out }, 5.15)
          .fromTo(".eye-ui-ticks", { opacity: 0 }, { opacity: 1, duration: 1.2, ease: EASE.soft }, 5.5)
          .fromTo(".lens-caption > *", { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 1.1, ease: EASE.out, stagger: 0.1 }, 5.3)
          .to(view, { look: 1, duration: 0.7, ease: EASE.soft }, LOOK.from)
          .to(view, { look: 0, duration: 0.5 }, LOOK.to - 0.5);

        // Out: the interface leaves the pupil and light runs round the iris.
        tl.to(".eye-ui", { autoAlpha: 0, scale: 0.72, transformOrigin: "50% 50%", duration: 0.7, ease: EASE.soft }, 7.85)
          .to([".lens-title", ".lens-lead"], { yPercent: -14, clipPath: WIPE_GONE, duration: 1.4, stagger: 0.1 }, 8.15)
          .to(".lens-caption > *", { autoAlpha: 0, y: -6, duration: 0.9, stagger: 0.06 }, 8.15)
          .set(".eye-limbus", { autoAlpha: 1 }, LIMBUS.draw)
          .fromTo(".eye-limbus-arc", { strokeDasharray: "0 1" }, { strokeDasharray: "1 0", duration: 0.85, ease: EASE.inOut, stagger: 0.04 }, LIMBUS.draw)
          .to(".eye-iris", { opacity: 0.62, duration: 0.8, ease: EASE.soft }, LIMBUS.draw + 0.2)
          .to([".eye-lens", ".eye-glints"], { autoAlpha: 0, duration: 0.7, ease: EASE.soft }, LIMBUS.draw + 0.25);

        // The lit edge becomes the handoff ring (same frame), then the camera
        // pulls back with it until it is the size of the ring, and the eye closes under it.
        tl.set(".eye-limbus", { autoAlpha: 0 }, LIMBUS.handoff)
          .fromTo(handoff, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, LIMBUS.handoff)
          .to(view, { pull: 1, duration: 0.88, ease: EASE.inOut }, LIMBUS.handoff + 0.02)
          .to(view, { open: 0, duration: 0.8, ease: "sine.inOut" }, LIMBUS.handoff + 0.08)
          .to(".lens-ambient", { autoAlpha: 0, duration: 0.8, ease: EASE.soft }, LIMBUS.handoff);

        let onPointerMove: ((event: PointerEvent) => void) | undefined;
        if (fine) {
          const toX = gsap.quickTo(gaze, "x", { duration: DURATION.long, ease: EASE.soft, onUpdate: applyGaze });
          const toY = gsap.quickTo(gaze, "y", { duration: DURATION.long, ease: EASE.soft, onUpdate: applyGaze });
          onPointerMove = (event: PointerEvent) => {
            if (!tl.scrollTrigger?.isActive) return;
            toX(event.clientX / window.innerWidth - 0.5);
            toY(event.clientY / window.innerHeight - 0.5);
          };
          window.addEventListener("pointermove", onPointerMove, { passive: true });
        }

        const relayout = new ResizeObserver(measure);
        relayout.observe(camera);

        return () => {
          if (onPointerMove) window.removeEventListener("pointermove", onPointerMove);
          relayout.disconnect();
          blinking?.kill();
          releaseCinematic();
          showStage();
          const lids = lidPaths(1);
          lidUpper.setAttribute("d", lids.upper);
          lidLower.setAttribute("d", lids.lower);
          edgeUpper.setAttribute("d", lids.upperEdge);
          edgeLower.setAttribute("d", lids.lowerEdge);
          for (const shade of shades) shade.setAttribute("d", lids.upperEdge);
          rims.style.opacity = "";
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
      className="relative cinematic:-mt-[max(100svh,38rem)] cinematic:h-[640svh]"
    >
      {/* Anchor target: the eye open, the interface lit. */}
      <div id={scene.id} className="absolute inset-x-0 top-0 h-px cinematic:top-[260svh]" />

      {/* Above scene 6's stage, which slides in underneath during the last screen of this pin. */}
      <div className="lens-stage relative h-svh min-h-[38rem] overflow-hidden bg-smoke [container-type:size] cinematic:sticky cinematic:top-0 cinematic:z-10">
        <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {/* Macro: the corners of the eye stay out of the frame. */}
          <div className="lens-camera relative aspect-[8/5] w-[max(140cqw,224cqh)] shrink-0 will-change-transform portrait:w-[265cqw]">
            <Eye />
          </div>
        </div>

        <div aria-hidden className="lens-ambient pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(90%_80%_at_50%_50%,transparent_55%,rgb(0_0_0/0.55))]" />
          <div className="grain absolute inset-0 opacity-[0.05] mix-blend-soft-light" />
        </div>

        <HandoffRing className="invisible" />

        <div className="absolute inset-x-0 bottom-0 px-gutter pb-[clamp(1.75rem,8svh,5rem)]">
          <div className="mx-auto grid max-w-[112rem] grid-cols-12 items-end gap-y-6">
            <div className="col-span-12 md:col-span-7 lg:col-span-5">
              <h2 id={`${scene.id}-title`} className="lens-title type-title">
                <TitleLines title={scene.title} />
              </h2>
              <p className="lens-lead type-lead mt-6 max-w-[36ch] text-pretty text-ink-muted">{scene.lead}</p>
            </div>
            <p className="lens-caption type-caption col-span-12 flex flex-col gap-1 max-md:hidden md:col-span-4 md:col-start-9 md:items-end md:text-right lg:col-span-3 lg:col-start-10">
              <span>{caption.title}</span>
              <span className="text-ink-muted">{caption.body}</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
