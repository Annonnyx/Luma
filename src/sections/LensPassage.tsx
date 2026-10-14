import { Glance, PinnedGlance } from "@/components/ar/Glance";
import { TitleLines } from "@/components/ui/TitleLines";
import { STREET, Street, StreetRoute } from "@/components/world/Street";
import { getScene, LENS_PASSAGE_CONTENT } from "@/content/scenes";

const scene = getScene("dans-le-verre");
const { time, message, route } = LENS_PASSAGE_CONTENT;

/**
 * The street picture is 16:10 and covers the stage, a little larger than it
 * so the camera can start further back. The route and its glance live in a
 * box of the same size, so they stay on the ground whatever the screen.
 */
const WORLD = "relative aspect-[8/5] w-[max(112cqw,179cqh)] shrink-0";
const ORIGIN = `${STREET.vanishing.x * 100}% ${STREET.vanishing.y * 100}%`;

/**
 * The world seen from inside the lens: a street on the way home. What
 * follows the eyes (the time, Léa's message) sits at the edge of the view;
 * the turn is pinned on the ground, where it happens. On its own it is a calm
 * dark scene; in the cinematic sequence (see `Prologue`) it sits under the
 * Hero and is seen through the lenses before the camera passes the frame.
 */
export function LensPassage() {
  return (
    <section
      data-theme={scene.theme}
      aria-labelledby={`${scene.id}-title`}
      className="passage relative cinematic:-mt-[100svh] cinematic:h-[520svh]"
    >
      {/* Anchor target: the moment the interface is fully in place. */}
      <div id={scene.id} className="absolute inset-x-0 top-0 h-px cinematic:top-[260svh]" />

      <div className="passage-stage relative h-svh min-h-[34rem] overflow-hidden [container-type:size] cinematic:sticky cinematic:top-0">
        <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className={`passage-plate ${WORLD} will-change-transform`} style={{ transformOrigin: ORIGIN }}>
            <Street className="absolute inset-0 size-full" />
          </div>
        </div>

        <div aria-hidden className="passage-atmosphere pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(130%_100%_at_55%_45%,transparent_50%,rgb(0_0_0/0.55))]" />
          <div className="grain absolute inset-0 opacity-[0.06] mix-blend-soft-light" />
        </div>

        <div className="passage-depth absolute inset-0">
          {/* Time in the left lens; Léa's note in the right — the two edges of the view. */}
          <div className="absolute inset-x-0 top-[calc(var(--header-h)+1.25rem)] px-gutter">
            <div className="mx-auto grid max-w-[112rem] grid-cols-1 items-start gap-y-5 md:grid-cols-12">
              <p className="passage-time flex flex-col gap-0.5 md:col-span-4">
                <time className="type-heading tabular-nums" dateTime={time.title}>
                  {time.title}
                </time>
                <span className="type-caption text-ink-muted">{time.body}</span>
              </p>
              <Glance className="glance-head w-full max-w-[20.5rem] md:col-span-5 md:col-start-8 md:justify-self-end lg:col-span-4 lg:col-start-9">
                <p className="type-caption flex items-center justify-between gap-8">
                  <span className="flex items-center gap-2 text-ink">
                    <span aria-hidden className="size-1.5 rounded-full bg-coat" />
                    {message.from}
                  </span>
                  <span className="text-ink-muted">{message.when}</span>
                </p>
                <p className="type-body mt-3 text-[0.9375rem] leading-snug text-pretty">{message.body}</p>
              </Glance>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 px-gutter pb-[clamp(1.75rem,8svh,5rem)]">
            <div className="mx-auto grid max-w-[112rem] grid-cols-12">
              <div className="passage-copy col-span-12 md:col-span-8 lg:col-span-7">
                <h2 id={`${scene.id}-title`} className="passage-title type-title">
                  <TitleLines title={scene.title} />
                </h2>
                <p className="passage-lead type-lead mt-6 max-w-[34ch] text-pretty text-ink-muted">{scene.lead}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className={`passage-anchors ${WORLD}`} style={{ transformOrigin: ORIGIN }}>
            <StreetRoute className="passage-route absolute inset-0 size-full" />
            <PinnedGlance
              className="glance-pinned"
              style={{ left: `${STREET.turn.x * 100}%`, top: `${STREET.turn.y * 100}%` }}
            >
              <p className="type-caption flex items-center gap-2 text-ink">
                <TurnLeft />
                {route.title}
              </p>
              <p className="type-caption mt-1 text-ink-muted">{route.body}</p>
            </PinnedGlance>
          </div>
        </div>

        {/* Photochromic veil: the lenses start clear and darken as the camera approaches. */}
        <div
          aria-hidden
          data-theme="light"
          className="passage-veil absolute inset-0 hidden bg-mineral cinematic:block"
        />
      </div>
    </section>
  );
}

function TurnLeft() {
  return (
    <svg viewBox="0 0 14 14" aria-hidden className="size-3.5 shrink-0 text-coat">
      <path
        d="M 10.5 13 V 7.5 Q 10.5 4.5 7.5 4.5 H 2.5 M 5 2 L 2.5 4.5 L 5 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
