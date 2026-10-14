"use client";

import { useEffect, useRef } from "react";

import { gsap, useGSAP } from "@/lib/gsap";
import { DURATION, EASE, MOTION_OK_QUERY, REDUCED_MOTION_QUERY } from "@/lib/motion";

const NAV = [
  { href: "#dans-le-verre", label: "Lunettes" },
  { href: "#lentilles", label: "Lentilles" },
  { href: "#bague", label: "Bague" },
] as const;

/** Scrubbed scenes keep moving for a moment after the last scroll event. */
const SETTLE_MS = 1200;

export function SiteHeader() {
  const header = useRef<HTMLElement>(null);

  // Each item reads the theme of whatever is painted right under it, so it
  // stays legible over masks, pinned scenes and overlapping layers.
  useEffect(() => {
    const el = header.current;
    if (!el) return;
    const items = Array.from(el.querySelectorAll<HTMLElement>("[data-theme]"));

    let frame = 0;
    let until = 0;

    const sample = () => {
      for (const item of items) {
        const rect = item.getBoundingClientRect();
        if (!rect.width) continue;
        const hit = document
          .elementsFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
          .find((node) => !el.contains(node));
        const theme = hit?.closest<HTMLElement>("[data-theme]")?.dataset.theme ?? "light";
        if (item.dataset.theme !== theme) item.dataset.theme = theme;
      }
    };

    const loop = (now: number) => {
      sample();
      frame = now < until ? requestAnimationFrame(loop) : 0;
    };

    const wake = () => {
      until = performance.now() + SETTLE_MS;
      if (!frame) frame = requestAnimationFrame(loop);
    };

    wake();
    window.addEventListener("scroll", wake, { passive: true });
    window.addEventListener("resize", wake);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", wake);
      window.removeEventListener("resize", wake);
    };
  }, []);

  useGSAP(
    () => {
      const el = header.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add(REDUCED_MOTION_QUERY, () => {
        el.dataset.intro = "ready";
      });
      mm.add(MOTION_OK_QUERY, () => {
        el.dataset.intro = "ready";
        gsap.from(".header-item", {
          autoAlpha: 0,
          y: -8,
          duration: DURATION.base,
          ease: EASE.inOut,
          stagger: 0.08,
          delay: 1.15,
        });
      });
    },
    { scope: header },
  );

  const item = "header-item text-ink transition-colors duration-700 ease-in-out-power3";

  return (
    <header
      ref={header}
      data-intro="pending"
      className="pointer-events-none fixed inset-x-0 top-0 z-50"
    >
      <div className="mx-auto flex h-(--header-h) max-w-[112rem] items-center justify-between px-gutter">
        <a
          href="#accueil"
          data-theme="light"
          className={`${item} type-wordmark pointer-events-auto py-2`}
          aria-label="Lume, retour en haut de page"
        >
          Lume
        </a>

        <nav aria-label="Navigation principale" className="pointer-events-auto">
          <ul className="type-caption flex items-center gap-7">
            {NAV.map((link) => (
              <li key={link.href} data-theme="light" className={`${item} max-md:hidden`}>
                <a
                  href={link.href}
                  className="py-2 text-ink-muted transition-colors duration-500 ease-out-soft hover:text-ink"
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li data-theme="light" className={item}>
              <a
                href="#essayer"
                className="inline-flex h-10 items-center rounded-full border border-current px-5 transition-[background-color,color] duration-500 ease-out-soft hover:bg-ink hover:text-surface"
              >
                Réserver un essai
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
