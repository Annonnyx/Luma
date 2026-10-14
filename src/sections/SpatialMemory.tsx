"use client";

import { useRef, useState } from "react";

import { TimerWindow } from "@/components/ar/TimerWindow";
import { ListWindow, RecipeWindow } from "@/components/ar/windows";
import { TitleLines } from "@/components/ui/TitleLines";
import { Kitchen, KitchenForeground } from "@/components/world/Kitchen";
import {
  getScene,
  SPATIAL_MEMORY_CONTENT,
  type KitchenLayoutKind,
  type KitchenPoint,
  type KitchenWindowId,
} from "@/content/scenes";
import { useFinePointer } from "@/hooks/useMediaQuery";
import { hideWhenDetached, holdCinematic } from "@/lib/cinematic";
import { Draggable, gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { DURATION, EASE, FINE_POINTER_QUERY, MOTION_OK_QUERY } from "@/lib/motion";
import { clearAnchors, loadAnchors, saveAnchors } from "@/lib/spatial-memory";

const scene = getScene("memoire");
const { windows: NAMES, places: PLACES, hint: HINT, layouts: LAYOUTS } = SPATIAL_MEMORY_CONTENT;
const IDS: KitchenWindowId[] = ["recipe", "timer", "list"];

/** Carried at arm's length, then set against the wall: the recipe looks smaller there. */
const PLACED_SCALE = 0.85;
/** Below this share of the kitchen on screen, windows use the narrow layout. */
const WIDE_MIN_SHARE = 0.75;
/** Keyboard steps, in fractions of the kitchen picture. */
const STEP = 0.02;
const STEP_FAR = 0.06;
/** Space kept around the windows, in px; the top one leaves the header free. */
const EDGE = 12;
const UNDER_HEADER = 80;
/** Timeline span in which the visitor moves the windows. */
const DEMO = { from: 4.4, to: 5.8 };
/** The picture is 16:10; both layers below share this box so windows stay anchored in it. */
const WORLD = "relative aspect-[8/5] w-[max(100cqw,160cqh)] shrink-0 will-change-transform";

const WIPE_HIDDEN = "inset(-10% -4% 110% -4%)";
const WIPE_SHOWN = "inset(-10% -4% -10% -4%)";
const WIPE_GONE = "inset(-10% -4% 100% -4%)";

const KEYS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

type Message = { kind: "idle" } | { kind: "returning" } | { kind: "placed"; text: string };

const percent = (point: KitchenPoint) => ({ left: `${point.x * 100}%`, top: `${point.y * 100}%` });

/** The recognisable spot closest to a point of the picture (16:10, so x counts more). */
function placeName(point: KitchenPoint) {
  let best: string = PLACES[0].label;
  let bestDistance = Infinity;
  for (const place of PLACES) {
    const distance = Math.hypot((place.x - point.x) * 1.6, place.y - point.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = place.label;
    }
  }
  return best;
}

/**
 * Scene 4. It starts on the last frame of scene 3: the recipe window, alone,
 * light out. The camera turns into the kitchen, where a timer and a shopping
 * list were left earlier; the recipe, still carried, stays in front of the
 * eyes, then is set by the window. Then the visitor moves the windows; where
 * they put them is kept on this device. On the way out the camera slowly
 * turns away: the windows leave with the kitchen, the light goes, and scene 5
 * (which overlaps this one by a screen) starts on that dark frame.
 *
 * Positions are fractions of the kitchen picture, so a window stays on the
 * same spot of the kitchen whatever the screen and the camera.
 *
 * Timeline units (10 = the pin, which starts exactly when scene 3 unpins):
 * 0–0.35 handoff · 0.35–2.7 the kitchen turns in · 2–3.3 title ·
 * 2.15–3.75 the recipe is set down · 3.65–5.1 lead, the camera settles, hint ·
 * 4.4–5.8 free demo · 5.8–10 the camera turns away, slowly · 8.8–10 the light goes.
 */
export function SpatialMemory() {
  const root = useRef<HTMLElement>(null);
  const reset = useRef<((fromKeyboard: boolean) => void) | null>(null);
  const fine = useFinePointer();
  const [message, setMessage] = useState<Message>({ kind: "idle" });
  const [customized, setCustomized] = useState(false);

  useGSAP(
    () => {
      const section = root.current;
      if (!section) return;
      const mm = gsap.matchMedia();

      mm.add({ motion: MOTION_OK_QUERY, fine: FINE_POINTER_QUERY }, (context) => {
        const { motion, fine } = context.conditions as { motion: boolean; fine: boolean };

        const stage = section.querySelector<HTMLElement>(".kitchen-stage");
        const plate = section.querySelector<HTMLElement>(".kitchen-plate");
        const front = section.querySelector<SVGElement>(".kitchen-front");
        const world = section.querySelector<HTMLElement>(".kitchen-windows");
        const carryFrom = section.querySelector<HTMLElement>(".kitchen-carry-from");
        if (!stage || !plate || !front || !world || !carryFrom) return;

        const items = IDS.flatMap((id) => {
          const float = world.querySelector<HTMLElement>(`[data-window="${id}"]`);
          const pane = float?.querySelector<HTMLElement>(".pane");
          const grip = float?.querySelector<HTMLElement>(".kitchen-grip");
          return float && pane && grip ? [{ id, float, pane, grip }] : [];
        });
        type Item = (typeof items)[number];
        const recipe = items.find((item) => item.id === "recipe");
        const sheens = Array.from(world.querySelectorAll<HTMLElement>(".pane-sheen"));
        const scaleOf = (item: Item) => (item === recipe ? PLACED_SCALE : 1);

        const releaseCinematic = motion ? holdCinematic() : null;

        // Layout boxes in px, transforms ignored. `world` is the kitchen picture box.
        const geo = { W: 0, H: 0, worldW: 1, worldH: 1, worldX: 0, worldY: 0, restX: 0, travel: 0, fromX: 0, fromY: 0 };
        const view = { cam: motion ? -1 : 0, carry: motion ? 0 : 1 };
        // Where each window was put (or its default), and where it is shown on this screen.
        const wanted = {} as Record<KitchenWindowId, KitchenPoint>;
        const anchors = {} as Record<KitchenWindowId, KitchenPoint>;
        let kind: KitchenLayoutKind | null = null;
        let tl: gsap.core.Timeline | undefined;
        let showStage: (() => void) | undefined;

        const place = (item: Item, point: KitchenPoint) => {
          anchors[item.id] = point;
          Object.assign(item.float.style, percent(point));
        };
        const put = (item: Item, point: KitchenPoint) => {
          wanted[item.id] = point;
          place(item, point);
        };

        // What the screen shows of the picture once the camera rests, in `world` px.
        // Dragging, the keyboard and saved spots all stay inside it.
        const area = { left: 0, top: 0, width: 0, height: 0 };

        // Very wide or tall screens crop the picture, and a saved spot may come
        // from another screen: keep every window inside what this one shows.
        const onScreen = (item: Item, point: KitchenPoint): KitchenPoint => {
          const w = item.float.offsetWidth * scaleOf(item);
          const h = item.float.offsetHeight * scaleOf(item);
          return {
            x: gsap.utils.clamp(area.left, area.left + area.width - w, point.x * geo.worldW) / geo.worldW,
            y: gsap.utils.clamp(area.top, area.top + area.height - h, point.y * geo.worldH) / geo.worldH,
          };
        };

        const applyLayout = (next: KitchenLayoutKind) => {
          kind = next;
          const saved = loadAnchors(next);
          for (const item of items) wanted[item.id] = saved?.[item.id] ?? { ...LAYOUTS[next].anchors[item.id] };
          setCustomized(Boolean(saved));
          setMessage(saved ? { kind: "returning" } : { kind: "idle" });
        };

        // Sub-pixel boxes (offsetLeft rounds): the handoff from scene 3 must not move by a pixel.
        const measure = () => {
          const box = stage.getBoundingClientRect();
          const picture = world.getBoundingClientRect();
          const from = carryFrom.getBoundingClientRect();
          geo.W = box.width;
          geo.H = box.height;
          geo.worldW = picture.width || 1;
          geo.worldH = picture.height || 1;
          geo.worldX = picture.left - box.left - Number(gsap.getProperty(world, "x"));
          geo.worldY = picture.top - box.top;
          const next: KitchenLayoutKind = geo.W / geo.worldW >= WIDE_MIN_SHARE ? "wide" : "narrow";
          geo.restX = (0.5 - LAYOUTS[next].frame) * geo.worldW;
          geo.travel = (geo.W + geo.worldW) / 2 + Math.abs(geo.restX) + 40;
          geo.fromX = from.left - box.left;
          geo.fromY = from.top - box.top;
          area.left = EDGE - geo.worldX - geo.restX;
          area.top = UNDER_HEADER - geo.worldY;
          area.width = geo.W - 2 * EDGE;
          area.height = geo.H - UNDER_HEADER - EDGE;
          if (next !== kind) applyLayout(next);
          for (const item of items) place(item, onScreen(item, wanted[item.id]));
        };

        let armed: boolean | null = null;
        const drags: Draggable[] = [];
        const arm = (next: boolean) => {
          if (next === armed || (!next && drags.some((d) => d.isPressed || d.isThrowing))) return;
          armed = next;
          for (const drag of drags) {
            if (next) drag.enable();
            else drag.disable();
          }
        };

        const render = () => {
          const camX = geo.restX - view.cam * geo.travel;
          gsap.set([plate, world], { x: camX });
          gsap.set(front, { x: (camX - geo.restX) * 0.4 });
          gsap.set(sheens, { xPercent: 100 - view.cam * 160 });

          // Carried: the recipe stays where scene 3 left it, whatever the camera does.
          if (recipe) {
            const scale = gsap.utils.interpolate(1, PLACED_SCALE, view.carry);
            const rest = 1 - view.carry;
            const dx = geo.fromX - (geo.worldX + camX + anchors.recipe.x * geo.worldW);
            const dy = geo.fromY - (geo.worldY + anchors.recipe.y * geo.worldH);
            gsap.set(recipe.float, { scale });
            gsap.set(recipe.pane, { x: (rest * dx) / scale, y: (rest * dy) / scale });
          }

          if (tl) arm(tl.time() >= DEMO.from && tl.time() <= DEMO.to);
        };

        const remember = (item: Item) => {
          if (kind) saveAnchors(kind, wanted);
          const anchor = anchors[item.id];
          const scale = scaleOf(item);
          const where = placeName({
            x: anchor.x + (item.pane.offsetWidth * scale) / 2 / geo.worldW,
            y: anchor.y + (item.pane.offsetHeight * scale) / 2 / geo.worldH,
          });
          setCustomized(true);
          setMessage({ kind: "placed", text: `${NAMES[item.id].name} est ${NAMES[item.id].placed} ${where}.` });
        };

        // Picked up: a little closer to the eyes. Put down: back against the wall.
        const lift = (item: Item, up: boolean) => {
          item.float.toggleAttribute("data-held", up);
          if (!motion) return;
          gsap.to(item.pane, {
            scale: up ? 1.025 : 1,
            duration: up ? DURATION.short : DURATION.base,
            ease: up ? EASE.out : EASE.inOut,
            overwrite: "auto",
          });
        };

        const settle = (item: Item, drag: Draggable) => {
          lift(item, false);
          const x = Number(gsap.getProperty(item.float, "x"));
          const y = Number(gsap.getProperty(item.float, "y"));
          if (Math.abs(x) < 1 && Math.abs(y) < 1) return;
          const anchor = anchors[item.id];
          put(item, { x: anchor.x + x / geo.worldW, y: anchor.y + y / geo.worldH });
          gsap.set(item.float, { x: 0, y: 0 });
          drag.update();
          remember(item);
        };

        // New anchor now, then glide there from wherever the window is on screen.
        const moveTo = (item: Item, point: KitchenPoint) => {
          const fromX = item.float.offsetLeft + Number(gsap.getProperty(item.float, "x"));
          const fromY = item.float.offsetTop + Number(gsap.getProperty(item.float, "y"));
          put(item, point);
          gsap.killTweensOf(item.float, "x,y");
          gsap.set(item.float, { x: fromX - item.float.offsetLeft, y: fromY - item.float.offsetTop });
          gsap.to(item.float, {
            x: 0,
            y: 0,
            duration: motion ? DURATION.short : 0,
            ease: EASE.out,
            onComplete: () => drags[items.indexOf(item)]?.update(),
          });
        };

        // A Draggable keeps its target inside `area` as soon as it is created:
        // measure first, with the recipe at the size it has once set down.
        measure();
        if (recipe) gsap.set(recipe.float, { scale: PLACED_SCALE });
        for (const item of items) {
          const [drag] = Draggable.create(item.float, {
            type: "x,y",
            // Read again on every press, so it follows `measure`.
            bounds: area,
            trigger: fine ? item.float : item.grip,
            dragClickables: true,
            inertia: motion,
            edgeResistance: 0.9,
            overshootTolerance: 0,
            maxDuration: 1.2,
            cursor: "grab",
            activeCursor: "grabbing",
            onPress: () => lift(item, true),
            onRelease: () => {
              if (!drag.isThrowing) settle(item, drag);
            },
            onThrowComplete: () => settle(item, drag),
          });
          drags.push(drag);
        }

        const onKey = (item: Item) => (event: KeyboardEvent) => {
          const direction = KEYS[event.key];
          if (!direction) return;
          event.preventDefault();
          const step = event.shiftKey ? STEP_FAR : STEP;
          // The anchor is where the window is heading, even mid-glide.
          const anchor = anchors[item.id];
          const next = onScreen(item, { x: anchor.x + direction[0] * step, y: anchor.y + direction[1] * step });
          if (Math.abs(next.x - anchor.x) * geo.worldW < 0.5 && Math.abs(next.y - anchor.y) * geo.worldH < 0.5) return;
          // In front of the others, as when it is picked up with the pointer.
          gsap.set(item.float, { zIndex: Draggable.zIndex++ });
          moveTo(item, next);
          remember(item);
        };
        const keyHandlers = items.map((item) => {
          const handler = onKey(item);
          item.grip.addEventListener("keydown", handler);
          return () => item.grip.removeEventListener("keydown", handler);
        });

        reset.current = (fromKeyboard) => {
          if (!kind) return;
          clearAnchors(kind);
          for (const item of items) {
            moveTo(item, onScreen(item, LAYOUTS[kind].anchors[item.id]));
            wanted[item.id] = { ...LAYOUTS[kind].anchors[item.id] };
          }
          // The button goes away with the change: keep the keyboard on the first window.
          if (fromKeyboard) items[0]?.grip.focus({ preventScroll: true });
          setCustomized(false);
          setMessage({ kind: "idle" });
        };

        if (recipe) gsap.set(recipe.float, { transformOrigin: "0% 0%" });

        if (motion) {
          // Until scene 3 unpins, its own recipe window is the one on screen.
          if (recipe) {
            const show = (on: boolean) => {
              recipe.float.style.visibility = on ? "" : "hidden";
            };
            show(false);
            ScrollTrigger.create({
              trigger: section,
              start: "top top",
              end: "max",
              onToggle: (self) => show(self.isActive),
            });
          }

          tl = gsap.timeline({
            defaults: { ease: EASE.inOut },
            onUpdate: render,
            scrollTrigger: {
              trigger: section,
              start: "top top",
              end: "bottom bottom",
              scrub: 0.6,
              onRefresh: () => {
                measure();
                render();
              },
            },
          });

          // The kitchen turns in; the timer and the list come with it.
          gsap.to(".kitchen-steam", {
            opacity: 0.45,
            duration: 2.8,
            yoyo: true,
            repeat: -1,
            ease: EASE.soft,
          });

          tl.to(view, { cam: -0.08, duration: 2.35 }, 0.35)
            .fromTo(".kitchen-ambient", { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.8, ease: EASE.soft }, 0.5)
            .fromTo(
              ".kitchen-title",
              { yPercent: 30, clipPath: WIPE_HIDDEN },
              { yPercent: 0, clipPath: WIPE_SHOWN, duration: 1.3, ease: EASE.out },
              2,
            );

          // The recipe is set down by the window, then the camera settles: everything stays put.
          tl.to(view, { carry: 1, duration: 1.6 }, 2.15)
            .fromTo(
              ".kitchen-lead",
              { yPercent: 30, clipPath: WIPE_HIDDEN },
              { yPercent: 0, clipPath: WIPE_SHOWN, duration: 1.3, ease: EASE.out },
              3.65,
            )
            .to(view, { cam: 0, duration: 1.15 }, 3.95)
            .fromTo(".kitchen-hint", { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 1, ease: EASE.out }, 4.4)
            .fromTo(".kitchen-handle", { opacity: 0 }, { opacity: 1, duration: 0.8, stagger: 0.12, ease: EASE.soft }, 4.5);

          // Out, slowly: the copy leaves first, then the camera drifts away at a
          // constant pace (a strong ease would rush the middle of the turn).
          tl.to(".kitchen-handle", { opacity: 0, duration: 1 }, DEMO.to)
            .to(".kitchen-hint", { opacity: 0, y: -8, duration: 1.3 }, DEMO.to)
            .to(
              [".kitchen-title", ".kitchen-lead"],
              { yPercent: -16, clipPath: WIPE_GONE, duration: 2.1, stagger: 0.18 },
              DEMO.to + 0.2,
            )
            .to(view, { cam: 1, duration: 4, ease: EASE.linear }, DEMO.to + 0.2)
            .to(".kitchen-ambient", { autoAlpha: 0, duration: 1.8, ease: EASE.soft }, 8.8);

          // Scene 5 overlaps this one by a screen and pins when this stage unpins.
          showStage = hideWhenDetached(section, stage);
        } else {
          render();
          arm(true);
        }

        const relayout = new ResizeObserver(() => {
          measure();
          render();
        });
        [stage, world].forEach((el) => relayout.observe(el));

        return () => {
          relayout.disconnect();
          keyHandlers.forEach((off) => off());
          drags.forEach((drag) => drag.kill());
          releaseCinematic?.();
          showStage?.();
          reset.current = null;
          if (recipe) recipe.float.style.visibility = "";
          gsap.set([plate, world, front, ...sheens, ...items.flatMap((item) => [item.float, item.pane])], {
            clearProps: "transform",
          });
        };
      });
    },
    { scope: root },
  );

  const hint =
    message.kind === "placed"
      ? message.text
      : message.kind === "returning"
        ? HINT.returning
        : fine
          ? HINT.pointer
          : HINT.touch;

  const keysId = `${scene.id}-keys`;
  const grip = (id: KitchenWindowId) => <Grip label={NAMES[id].grip} describedBy={keysId} />;

  return (
    <section
      ref={root}
      id={scene.id}
      data-theme={scene.theme}
      aria-labelledby={`${scene.id}-title`}
      className="relative cinematic:-mt-[max(100svh,38rem)] cinematic:h-[680svh]"
    >
      <div className="kitchen-stage relative h-svh min-h-[38rem] overflow-hidden bg-smoke [container-type:size] cinematic:sticky cinematic:top-0 cinematic:z-20">
        <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className={`kitchen-plate ${WORLD}`}>
            <Kitchen className="absolute inset-0 size-full" />
            <KitchenForeground className="kitchen-front absolute inset-x-0 bottom-0 h-[18%] w-full will-change-transform" />
          </div>
        </div>

        <div aria-hidden className="kitchen-ambient pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(120%_95%_at_45%_40%,transparent_50%,rgb(0_0_0/0.5))]" />
          <div className="grain absolute inset-0 opacity-[0.05] mix-blend-soft-light" />
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 px-gutter pb-[clamp(1.75rem,8svh,5rem)]">
          <div className="mx-auto grid max-w-[112rem] grid-cols-12">
            <div className="col-span-12 md:col-span-6 lg:col-span-5">
              <h2 id={`${scene.id}-title`} className="kitchen-title type-title">
                <TitleLines title={scene.title} />
              </h2>
              <p className="kitchen-lead type-lead mt-6 max-w-[38ch] text-pretty text-ink-muted">{scene.lead}</p>
              <div className="kitchen-hint mt-7 flex min-h-6 flex-wrap items-center gap-x-6 gap-y-2 focus-within:opacity-100!">
                <p aria-live="polite" className="type-caption">
                  {hint}
                </p>
                {customized && (
                  <button
                    type="button"
                    onClick={(event) => reset.current?.(event.detail === 0)}
                    className="type-caption pointer-events-auto text-ink-muted underline decoration-ink/30 underline-offset-4 transition-colors duration-500 ease-in-out-power3 hover:text-ink"
                  >
                    {HINT.reset}
                  </button>
                )}
              </div>
              <p id={keysId} className="sr-only">
                {HINT.keys}
              </p>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div role="group" aria-label="Fenêtres posées dans la cuisine" className={`kitchen-windows ${WORLD}`}>
            <RecipeWindow
              windowId="recipe"
              style={{
                ...percent(LAYOUTS.wide.anchors.recipe),
                transform: `scale(${PLACED_SCALE})`,
                transformOrigin: "0 0",
                zIndex: 1,
              }}
              className="group/float pointer-events-auto w-[88cqw] md:w-[min(30rem,34vw)]"
              controls={grip("recipe")}
            />
            <TimerWindow
              windowId="timer"
              style={percent(LAYOUTS.wide.anchors.timer)}
              className="group/float pointer-events-auto w-[46cqw] md:w-[min(15rem,18vw)]"
              controls={grip("timer")}
            />
            <ListWindow
              windowId="list"
              style={percent(LAYOUTS.wide.anchors.list)}
              className="group/float pointer-events-auto max-md:hidden md:w-[min(17rem,21vw)]"
              controls={grip("list")}
            />
          </div>
        </div>

        {/* Where scene 3 leaves its recipe window: same classes as there. */}
        <div aria-hidden className="kitchen-carry-from pointer-events-none absolute top-[33%] left-[6%] md:top-[22%] md:left-[44%]" />
      </div>
    </section>
  );
}

/** The bar under a window, as on a headset: grab it to move the window (the only way by touch). */
function Grip({ label, describedBy }: { label: string; describedBy: string }) {
  return (
    <div className="kitchen-handle flex justify-center pt-2 focus-within:opacity-100!">
      <button
        type="button"
        aria-label={`Déplacer ${label}`}
        aria-describedby={describedBy}
        className="kitchen-grip group/grip flex h-9 w-28 touch-none items-center justify-center"
      >
        <span className="h-1 w-11 rounded-full bg-ink/35 transition-colors duration-500 ease-in-out-power3 group-hover/float:bg-ink/60 group-focus-visible/grip:bg-coat group-data-held/float:bg-coat" />
      </button>
    </div>
  );
}
