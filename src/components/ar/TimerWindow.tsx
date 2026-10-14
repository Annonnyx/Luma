"use client";

import { useEffect, useRef, useState } from "react";

import { SPATIAL_MEMORY_CONTENT } from "@/content/scenes";

import { GlassWindow, type GlassWindowPlacement } from "./GlassWindow";

const { timer } = SPATIAL_MEMORY_CONTENT;
const TOTAL = timer.minutes * 60;

const clock = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

/** A kitchen timer that really runs, from the moment it is first seen. */
export function TimerWindow(props: GlassWindowPlacement) {
  const [left, setLeft] = useState(TOTAL);
  const face = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    let id: number | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        const start = Date.now();
        id = window.setInterval(() => {
          setLeft(Math.max(0, TOTAL - Math.floor((Date.now() - start) / 1000)));
        }, 1000);
      },
      { threshold: 0.5 },
    );
    if (face.current) observer.observe(face.current);
    return () => {
      observer.disconnect();
      window.clearInterval(id);
    };
  }, []);

  return (
    <GlassWindow label="Fenêtre minuteur" {...props}>
      <div className="pane-row type-caption flex items-center justify-between gap-4">
        <span className="flex items-center gap-2">
          <span aria-hidden className="size-1.5 rounded-full bg-coat" />
          {timer.label}
        </span>
        <span className="text-ink-muted">{timer.title}</span>
      </div>
      <p ref={face} className="pane-row type-heading mt-4 tabular-nums">
        <time dateTime={`PT${Math.floor(left / 60)}M${left % 60}S`}>{clock(left)}</time>
      </p>
      <div aria-hidden className="pane-row mt-4 h-0.5 overflow-hidden rounded-full bg-ink/15">
        <div
          className="h-full origin-left rounded-full bg-coat"
          style={{ transform: `scaleX(${left / TOTAL})` }}
        />
      </div>
    </GlassWindow>
  );
}
