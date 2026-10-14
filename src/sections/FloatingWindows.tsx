"use client";

import { useRef } from "react";

import { MessagesWindow, RecipeWindow, RouteWindow } from "@/components/ar/windows";
import { TitleLines } from "@/components/ui/TitleLines";
import { Room } from "@/components/world/Room";
import { getScene } from "@/content/scenes";
import { hideWhenDetached, holdCinematic } from "@/lib/cinematic";
import { gsap, useGSAP } from "@/lib/gsap";
import { DURATION, EASE, FINE_POINTER_QUERY, MOTION_OK_QUERY } from "@/lib/motion";

const scene = getScene("fenetres");

const WIPE_HIDDEN = "inset(-10% -4% 110% -4%)";
const WIPE_SHOWN = "inset(-10% -4% -10% -4%)";
const WIPE_GONE = "inset(-10% -4% 100% -4%)";

/**
 * Scene 3. In the dark left by scene 2, one window lights up and the room is
 * first seen through it; then the room opens around it and two more windows
 * arrive from further away. On the way out the room closes back into the
 * recipe window and its light goes out: scene 4 starts on that frame, with
 * its own recipe window at the same place, and takes over when this stage
 * unpins (scene 4 overlaps this section by one screen).
 *
 * Timeline units (10 = from the scene entering the screen to the end of the
 * pin; the pin starts at 3.33):
 * 0–2.4 dark pause · 2.4–4.2 the recipe window opens · 4.1–5.6 copy ·
 * 4.3–6.6 the room opens · 5.3–7.4 the other windows arrive · 7.4–8.3 hold ·
 * 8.3–9.7 the room closes into the recipe window, then goes dark.
 */
export function FloatingWindows() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const section = root.current;
      if (!section) return;
      const mm = gsap.matchMedia();

      mm.add({ motion: MOTION_OK_QUERY, fine: FINE_POINTER_QUERY }, (context) => {
        const { motion, fine } = context.conditions as { motion: boolean; fine: boolean };
        if (!motion) return;

        const stage = section.querySelector<HTMLElement>(".windows-stage");
        const room = section.querySelector<HTMLElement>(".windows-room");
        const aperture = section.querySelector<HTMLElement>(".windows-aperture .pane");
        if (!stage || !room || !aperture) return;

        const releaseCinematic = holdCinematic();

        // The recipe window in the stage, in px (layout box, transforms ignored).
        const box = { x: 0, y: 0, w: 0, h: 0, radius: 0, W: 0, H: 0 };
        const light = { open: 0, full: 0 };

        const measure = () => {
          let x = 0;
          let y = 0;
          for (let n: HTMLElement | null = aperture; n && n !== stage; n = n.offsetParent as HTMLElement | null) {
            x += n.offsetLeft;
            y += n.offsetTop;
          }
          box.x = x;
          box.y = y;
          box.w = aperture.offsetWidth;
          box.h = aperture.offsetHeight;
          box.radius = parseFloat(getComputedStyle(aperture).borderTopLeftRadius) || 0;
          box.W = stage.clientWidth;
          box.H = stage.clientHeight;
        };

        // The room is visible through a slot that opens to the window, then to the whole stage.
        const render = () => {
          const mid = box.y + box.h / 2;
          const half = (box.h / 2) * light.open;
          const rest = 1 - light.full;
          const top = (mid - half) * rest;
          const bottom = (box.H - mid - half) * rest;
          const left = box.x * rest;
          const right = (box.W - box.x - box.w) * rest;
          room.style.clipPath = `inset(${top}px ${right}px ${bottom}px ${left}px round ${box.radius * rest}px)`;
        };

        const relayout = new ResizeObserver(() => {
          measure();
          render();
        });
        [stage, aperture].forEach((el) => relayout.observe(el));

        const tl = gsap.timeline({
          defaults: { ease: EASE.inOut },
          onUpdate: render,
          scrollTrigger: {
            trigger: section,
            start: "top bottom",
            end: "bottom bottom",
            scrub: 0.6,
            onRefresh: () => {
              measure();
              render();
            },
          },
        });

        // Slow camera drift on the room, and the light sliding across the glass.
        tl.fromTo(".windows-plate", { scale: 1.1, yPercent: 2.5 }, { scale: 1, yPercent: -2.5, ease: "none", duration: 10 }, 0)
          .fromTo(".pane-sheen", { xPercent: -60 }, { xPercent: 260, ease: "none", duration: 10 }, 0);

        // One window lights up in the dark, once it is well inside the screen.
        tl.to(light, { open: 1, duration: 2.1 }, 2.4)
          .fromTo(".windows-aperture .pane", { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.5, ease: EASE.soft }, 2.5)
          .fromTo(
            ".windows-aperture .pane-row",
            { autoAlpha: 0, y: 14 },
            { autoAlpha: 1, y: 0, duration: 1.4, ease: EASE.out, stagger: 0.16 },
            3.3,
          )
          .fromTo(".windows-title", { yPercent: 30, clipPath: WIPE_HIDDEN }, { yPercent: 0, clipPath: WIPE_SHOWN, duration: 1.4, ease: EASE.out }, 4.1)
          .fromTo(".windows-lead", { yPercent: 30, clipPath: WIPE_HIDDEN }, { yPercent: 0, clipPath: WIPE_SHOWN, duration: 1.4, ease: EASE.out }, 4.4);

        // The room opens around it; two more windows arrive from further away.
        tl.to(light, { full: 1, duration: 2.3 }, 4.3)
          .fromTo(
            ".windows-satellite .pane",
            { autoAlpha: 0, scale: 0.9, y: 60 },
            { autoAlpha: 1, scale: 1, y: 0, duration: 1.6, ease: EASE.out, stagger: 0.5 },
            5.3,
          )
          .fromTo(
            ".windows-satellite .pane-row",
            { autoAlpha: 0, y: 12 },
            { autoAlpha: 1, y: 0, duration: 1.1, ease: EASE.out, stagger: 0.12 },
            5.8,
          );

        // Out: the other windows drift away, the room closes back into the recipe,
        // then the light goes out in it. Done by 9.7, so the scrub lag cannot
        // carry any of it past the handoff.
        tl.to(
          ".windows-satellite .pane",
          {
            autoAlpha: 0,
            x: (i: number) => (i === 0 ? -40 : 40),
            y: (i: number) => (i === 0 ? -50 : 50),
            duration: 1.1,
            stagger: 0.1,
          },
          8.3,
        )
          .to([".windows-title", ".windows-lead"], { yPercent: -14, clipPath: WIPE_GONE, duration: 1.1, stagger: 0.08 }, 8.3)
          .to(light, { full: 0, duration: 1 }, 8.3)
          .to(light, { open: 0, duration: 0.6 }, 9.1);

        // When the stage unpins, scene 4 is already showing this exact frame beneath it.
        const showStage = hideWhenDetached(section, stage);

        const st = tl.scrollTrigger;
        let onPointerMove: ((event: PointerEvent) => void) | undefined;

        if (fine) {
          const floats = gsap.utils.toArray<HTMLElement>(".pane-float").map((el) => ({
            depth: Number(el.dataset.depth ?? 1),
            x: gsap.quickTo(el, "x", { duration: DURATION.long, ease: EASE.soft }),
            y: gsap.quickTo(el, "y", { duration: DURATION.long, ease: EASE.soft }),
          }));
          const plateX = gsap.quickTo(".windows-plate", "x", { duration: DURATION.long, ease: EASE.soft });
          const plateY = gsap.quickTo(".windows-plate", "y", { duration: DURATION.long, ease: EASE.soft });
          const sheenX = gsap.quickTo(".pane-sheen", "x", { duration: DURATION.long, ease: EASE.soft });

          onPointerMove = (event: PointerEvent) => {
            if (!st?.isActive) return;
            const px = event.clientX / window.innerWidth - 0.5;
            const py = event.clientY / window.innerHeight - 0.5;
            for (const f of floats) {
              f.x(px * 18 * f.depth);
              f.y(py * 12 * f.depth);
            }
            plateX(px * -26);
            plateY(py * -16);
            sheenX(px * -70);
          };
          window.addEventListener("pointermove", onPointerMove, { passive: true });
        }

        return () => {
          if (onPointerMove) window.removeEventListener("pointermove", onPointerMove);
          relayout.disconnect();
          releaseCinematic();
          room.style.clipPath = "";
          showStage();
        };
      });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      id={scene.id}
      data-theme={scene.theme}
      aria-labelledby={`${scene.id}-title`}
      className="relative cinematic:h-[340svh]"
    >
      {/* Each pinned stage paints above the next scene's, which overlaps it by a screen. */}
      <div className="windows-stage relative h-svh min-h-[38rem] overflow-hidden cinematic:sticky cinematic:top-0 cinematic:z-30">
        <div aria-hidden className="windows-room absolute inset-0">
          <div className="windows-plate absolute -inset-[6%] will-change-transform">
            <Room className="size-full" />
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_55%_42%,transparent_45%,rgb(0_0_0/0.55))]" />
          <div className="grain absolute inset-0 opacity-[0.05] mix-blend-soft-light" />
        </div>

        <div role="group" aria-label="Trois fenêtres posées dans la pièce" className="absolute inset-0">
          <MessagesWindow
            depth={0.6}
            className="windows-satellite top-[18%] left-[5%] w-[78%] md:top-[24%] md:left-[8%] md:w-[min(21rem,22vw)]"
          />
          {/* Depth 0: it never follows the pointer, so the room's opening stays on its glass. */}
          <RecipeWindow
            depth={0}
            className="windows-aperture top-[33%] left-[6%] w-[88%] md:top-[22%] md:left-[44%] md:w-[min(30rem,34vw)]"
          />
          <RouteWindow
            depth={1.4}
            className="windows-satellite right-[7%] bottom-[16%] w-[min(19rem,24vw)] max-md:hidden"
          />
        </div>

        <div className="absolute inset-x-0 bottom-0 px-gutter pb-[clamp(1.75rem,8svh,5rem)]">
          <div className="mx-auto grid max-w-[112rem] grid-cols-12">
            <div className="col-span-12 md:col-span-6 lg:col-span-5">
              <h2 id={`${scene.id}-title`} className="windows-title type-title">
                <TitleLines title={scene.title} />
              </h2>
              <p className="windows-lead type-lead mt-6 max-w-[38ch] text-pretty text-ink-muted">{scene.lead}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
