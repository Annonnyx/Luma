"use client";

import { useRef } from "react";

import { TitleLines } from "@/components/ui/TitleLines";
import { RestingGlasses } from "@/components/world/RestingGlasses";
import { CTA_CONTENT, getScene } from "@/content/scenes";
import { gsap, useGSAP } from "@/lib/gsap";
import { EASE, MOTION_OK_QUERY } from "@/lib/motion";

const scene = getScene("essayer");
const { action, places, mail } = CTA_CONTENT;

const WIPE_HIDDEN = "inset(-10% -4% 110% -4%)";
const WIPE_SHOWN = "inset(-10% -4% -10% -4%)";

/**
 * Scene 8. Back outside: mineral ground, the frame at rest. The visitor has
 * left the interface. No pin overlap with the previous scene — the dark simply
 * ends, and the table is there.
 */
export function FinalCta() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const section = root.current;
      if (!section) return;
      const mm = gsap.matchMedia();

      mm.add(MOTION_OK_QUERY, () => {
        gsap
          .timeline({
            defaults: { ease: EASE.out },
            scrollTrigger: {
              trigger: section,
              start: "top 78%",
              once: true,
            },
          })
          .from(".cta-object", { autoAlpha: 0, yPercent: 8, duration: 1.5 }, 0)
          .fromTo(".cta-title", { yPercent: 30, clipPath: WIPE_HIDDEN }, { yPercent: 0, clipPath: WIPE_SHOWN, duration: 1.4 }, 0.25)
          .fromTo(".cta-lead", { yPercent: 30, clipPath: WIPE_HIDDEN }, { yPercent: 0, clipPath: WIPE_SHOWN, duration: 1.3 }, 0.5)
          .from(".cta-action", { autoAlpha: 0, y: 12, duration: 1.1 }, 0.75)
          .from(".cta-meta", { autoAlpha: 0, duration: 1 }, 0.95);
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
      className="relative min-h-svh overflow-hidden"
    >
      <div className="mx-auto grid min-h-svh max-w-[112rem] grid-rows-[1fr_auto] px-gutter pt-[calc(var(--header-h)+2rem)] pb-[clamp(2rem,6svh,4rem)]">
        <figure className="cta-object flex flex-col items-center justify-center self-center py-10">
          <RestingGlasses className="h-auto w-[min(88vw,42rem)]" />
        </figure>

        <div className="grid grid-cols-12 items-end gap-x-6 gap-y-10">
          <div className="col-span-12 md:col-span-8 lg:col-span-7">
            <h2 id={`${scene.id}-title`} className="cta-title type-title">
              <TitleLines title={scene.title} />
            </h2>
            <p className="cta-lead type-lead mt-6 max-w-[36ch] text-pretty text-ink-muted">{scene.lead}</p>
          </div>
          <div className="cta-action col-span-12 flex flex-col items-start gap-5 md:col-span-4 md:items-end lg:col-span-4 lg:col-start-9">
            <a
              href={`mailto:${mail}`}
              className="type-body inline-flex items-center border-b border-graphite/30 pb-1 text-graphite transition-colors duration-500 ease-out-soft hover:border-coat-ink"
            >
              {action}
            </a>
            <p className="cta-meta type-caption text-ink-muted">{places}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
