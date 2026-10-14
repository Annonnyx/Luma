"use client";

import { Fragment, useRef } from "react";

import { Glasses } from "@/components/product/Glasses";
import { getScene } from "@/content/scenes";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";
import {
  DURATION,
  EASE,
  FINE_POINTER_QUERY,
  REDUCED_MOTION_QUERY,
  STAGGER,
} from "@/lib/motion";

const scene = getScene("accueil");
const titleLines = scene.title.split("\n");

export function Hero() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const section = root.current;
      if (!section) return;

      const mm = gsap.matchMedia();

      mm.add({ reduce: REDUCED_MOTION_QUERY, fine: FINE_POINTER_QUERY }, (context) => {
        const { reduce, fine } = context.conditions as { reduce: boolean; fine: boolean };
        section.dataset.intro = "ready";
        if (reduce) return;

        gsap
          .timeline({ defaults: { ease: EASE.out } })
          .from(".hero-object", { autoAlpha: 0, yPercent: 5, scale: 0.97, duration: DURATION.long }, 0.15)
          .from(".hero-shadow", { autoAlpha: 0, scaleX: 0.55, duration: DURATION.long }, 0.35)
          .fromTo(
            ".glasses-glint",
            { x: -200 },
            { x: 1400, duration: DURATION.long, ease: EASE.inOut },
            0.95,
          )
          .from(".hero-lead", { autoAlpha: 0, y: 16, duration: DURATION.base }, 1.05)
          .from(
            ".hero-caption > *",
            { autoAlpha: 0, y: 8, duration: DURATION.base, stagger: STAGGER.base },
            1.2,
          );

        SplitText.create(".hero-title", {
          type: "lines",
          mask: "lines",
          linesClass: "split-line",
          autoSplit: true,
          onSplit: (split) =>
            gsap.from(split.lines, {
              yPercent: 115,
              duration: 1.5,
              ease: EASE.out,
              stagger: STAGGER.loose,
              delay: 0.5,
            }),
        });

        if (!fine) return;

        const follow = { duration: DURATION.base, ease: EASE.soft };
        const drift = { duration: DURATION.long, ease: EASE.soft };
        const rotateY = gsap.quickTo(".hero-tilt", "rotationY", follow);
        const rotateX = gsap.quickTo(".hero-tilt", "rotationX", follow);
        const reflection = gsap.quickTo(".glasses-reflection", "x", drift);
        const sheen = gsap.quickTo(".glasses-sheen", "x", drift);
        const shadow = gsap.quickTo(".hero-shadow", "x", drift);

        const aim = (x: number, y: number) => {
          rotateY(x * 9);
          rotateX(y * -5);
          reflection(x * -70);
          sheen(x * 50);
          shadow(x * -28);
        };

        // The lens passage masks the page with the lens outline: the frame has
        // to be square to the screen as soon as scrolling starts.
        const isScrolled = () => window.scrollY > 4;

        const onPointerMove = (event: PointerEvent) => {
          if (isScrolled()) return;
          aim(event.clientX / window.innerWidth - 0.5, event.clientY / window.innerHeight - 0.5);
        };
        const onScroll = () => {
          if (isScrolled()) aim(0, 0);
        };

        window.addEventListener("pointermove", onPointerMove, { passive: true });
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => {
          window.removeEventListener("pointermove", onPointerMove);
          window.removeEventListener("scroll", onScroll);
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
      data-intro="pending"
      aria-labelledby="accueil-title"
      className="hero relative overflow-hidden bg-transparent cinematic:sticky cinematic:top-0 cinematic:z-10 cinematic:h-svh"
    >
      <div aria-hidden className="hero-backdrop pointer-events-auto absolute inset-0 bg-surface" />

      <div className="relative mx-auto grid min-h-svh max-w-[112rem] grid-rows-[1fr_auto] px-gutter pt-[calc(var(--header-h)+1.5rem)] pb-[clamp(1.75rem,5svh,3.5rem)]">
        <figure className="hero-object flex flex-col items-center justify-center self-center py-8">
          <div className="hero-lens-box w-[min(90vw,60rem,calc((100svh-26rem)*2.7))] min-w-[min(90vw,20rem)] perspective-[1600px]">
            <div className="hero-tilt">
              <Glasses className="hero-svg h-auto w-full" />
            </div>
          </div>
          <div aria-hidden className="hero-shadow-wrap -mt-[1.5%] flex justify-center">
            <div className="hero-shadow h-[clamp(0.9rem,2.2vw,1.9rem)] w-[min(66vw,48rem)] bg-[radial-gradient(closest-side,rgb(23_25_26/0.24),transparent)]" />
          </div>
          <figcaption className="hero-caption type-caption mt-6 flex flex-col items-center gap-1 text-center">
            <span>Monture Orée</span>
            <span className="text-ink-muted">Acétate noir poli à la main, 29 g</span>
          </figcaption>
        </figure>

        <div className="hero-copy grid grid-cols-12 items-end gap-x-6 gap-y-6">
          <h1 id="accueil-title" className="hero-title type-display col-span-12 lg:col-span-8">
            {titleLines.map((line, i) => (
              <Fragment key={line}>
                {i > 0 && (
                  <>
                    {" "}
                    <br />
                  </>
                )}
                {line}
              </Fragment>
            ))}
          </h1>
          <p className="hero-lead type-lead col-span-12 max-w-[36ch] text-pretty text-ink-muted md:col-span-7 lg:col-span-4 lg:justify-self-end lg:pb-[0.4em]">
            {scene.lead}
          </p>
        </div>
      </div>
    </section>
  );
}
