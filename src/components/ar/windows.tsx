import { FLOATING_WINDOWS_CONTENT, SPATIAL_MEMORY_CONTENT } from "@/content/scenes";

import { GlassWindow, type GlassWindowPlacement } from "./GlassWindow";

const { recipe, messages, route } = FLOATING_WINDOWS_CONTENT;
const { list } = SPATIAL_MEMORY_CONTENT;

export function RecipeWindow(props: GlassWindowPlacement) {
  return (
    <GlassWindow label="Fenêtre recette" {...props}>
      <div className="pane-row type-caption flex justify-between gap-4 text-ink-muted">
        <span>{recipe.label}</span>
        <span>
          Étape {recipe.step} sur {recipe.steps}
        </span>
      </div>
      <h3 className="pane-row type-heading mt-5">{recipe.title}</h3>
      <p className="pane-row type-body mt-3 max-w-[34ch] text-pretty text-ink-muted">
        {recipe.instruction}
      </p>
      <div className="pane-row mt-8 flex items-end justify-between gap-8">
        <div aria-hidden className="mb-2 flex flex-1 gap-1.5">
          {Array.from({ length: recipe.steps }, (_, i) => (
            <span
              key={i}
              className={`h-0.5 flex-1 rounded-full ${
                i < recipe.step - 1 ? "bg-ink/55" : i === recipe.step - 1 ? "bg-coat" : "bg-ink/15"
              }`}
            />
          ))}
        </div>
        <p className="flex flex-col items-end">
          <span className="type-caption text-ink-muted">{recipe.timerLabel}</span>
          <span className="type-heading tabular-nums">{recipe.timer}</span>
        </p>
      </div>
    </GlassWindow>
  );
}

export function MessagesWindow(props: GlassWindowPlacement) {
  const bubble = "type-body w-fit max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[0.9375rem] leading-snug";
  return (
    <GlassWindow label="Fenêtre messages" {...props}>
      <div className="pane-row type-caption flex items-center justify-between gap-4">
        <span className="flex items-center gap-2">
          <span aria-hidden className="size-1.5 rounded-full bg-coat" />
          {messages.from}
        </span>
        <span className="text-ink-muted">{messages.time}</span>
      </div>
      <p className={`pane-row ${bubble} mt-4 rounded-tl-md bg-ink/[0.08]`}>{messages.received}</p>
      <p className={`pane-row ${bubble} mt-2 ml-auto rounded-tr-md bg-ink/[0.16]`}>{messages.sent}</p>
    </GlassWindow>
  );
}

export function RouteWindow(props: GlassWindowPlacement) {
  return (
    <GlassWindow label="Fenêtre itinéraire" {...props}>
      <svg viewBox="0 0 240 88" aria-hidden className="pane-row h-auto w-full">
        <path
          d="M 10 74 L 96 74 C 108 74 114 68 114 56 L 114 30 C 114 18 120 12 132 12 L 228 12"
          fill="none"
          className="stroke-ink/25"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path d="M 10 74 L 70 74" fill="none" className="stroke-ink/70" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="70" cy="74" r="9" className="fill-coat/15" />
        <circle cx="70" cy="74" r="3.5" className="fill-coat" />
        <circle cx="228" cy="12" r="3.5" fill="none" className="stroke-ink/70" strokeWidth="1.5" />
      </svg>
      <h3 className="pane-row type-heading mt-5 text-balance">{route.title}</h3>
      <p className="pane-row type-caption mt-2 text-ink-muted">{route.detail}</p>
    </GlassWindow>
  );
}

export function ListWindow(props: GlassWindowPlacement) {
  const done = list.items.filter((item) => item.done).length;
  return (
    <GlassWindow label="Fenêtre courses" {...props}>
      <div className="pane-row type-caption flex justify-between gap-4 text-ink-muted">
        <span>{list.label}</span>
        <span>
          {done} sur {list.items.length}
        </span>
      </div>
      <ul className="mt-4 flex flex-col gap-2.5">
        {list.items.map((item) => (
          <li key={item.text} className="pane-row type-body flex items-center gap-3">
            <span
              aria-hidden
              className={`grid size-3.5 shrink-0 place-items-center rounded-[0.25rem] ${
                item.done ? "bg-coat/85" : "border border-ink/40"
              }`}
            >
              {item.done && (
                <svg viewBox="0 0 12 12" className="size-2.5">
                  <path
                    d="M 2.5 6.2 L 5 8.5 L 9.5 3.5"
                    fill="none"
                    className="stroke-graphite"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
            <span className={item.done ? "text-ink-muted line-through decoration-ink/30" : undefined}>
              {item.text}
              {item.done && <span className="sr-only"> (pris)</span>}
            </span>
          </li>
        ))}
      </ul>
    </GlassWindow>
  );
}
