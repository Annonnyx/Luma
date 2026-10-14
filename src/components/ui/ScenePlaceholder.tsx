import type { AssetKind, Scene, SceneAsset } from "@/content/scenes";
import { SCENES } from "@/content/scenes";

const KIND_LABEL: Record<AssetKind, string> = {
  video: "Vidéo pilotée au scroll",
  interactive: "Démo interactive",
  model: "Modèle 3D",
  image: "Image",
};

const RATIO_CLASS: Record<SceneAsset["ratio"], string> = {
  "16/9": "aspect-video",
  "4/5": "aspect-[4/5]",
  "3/2": "aspect-[3/2]",
  "1/1": "aspect-square",
};

/**
 * Temporary stand-in for a scene that is not built yet. It already carries the
 * final copy, the theme and the anchor, and describes the shot that will fill it.
 */
export function ScenePlaceholder({ scene }: { scene: Scene }) {
  const titleId = `${scene.id}-title`;

  return (
    <section
      id={scene.id}
      data-theme={scene.theme}
      aria-labelledby={titleId}
      className="relative flex min-h-svh items-center px-gutter py-[clamp(6rem,16vh,11rem)]"
    >
      <div className="mx-auto grid w-full max-w-[112rem] grid-cols-12 gap-x-6 gap-y-14">
        <div className="col-span-12 flex flex-col justify-end md:col-span-5 lg:col-span-4">
          <h2 id={titleId} className="type-title text-balance">
            {scene.title}
          </h2>
          <p className="type-lead mt-7 max-w-[36ch] text-pretty text-ink-muted">{scene.lead}</p>
          <p className="type-caption mt-10 text-ink-muted">
            Scène {scene.order} sur {SCENES.length}. {scene.scroll}.
          </p>
        </div>

        <div className="col-span-12 flex flex-col gap-6 md:col-span-7 lg:col-span-7 lg:col-start-6">
          {scene.assets.map((asset, i) => (
            <Plate key={i} asset={asset} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Plate({ asset }: { asset: SceneAsset }) {
  return (
    <figure
      className={`relative w-full overflow-hidden border border-line ${RATIO_CLASS[asset.ratio]}`}
    >
      <CropMarks />
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_45%,color-mix(in_oklab,var(--color-coat)_7%,transparent),transparent)]"
      />
      <p className="type-caption absolute top-5 left-5 text-ink-muted">{KIND_LABEL[asset.kind]}</p>
      <figcaption className="absolute right-5 bottom-5 left-5 flex flex-col gap-2">
        <span className="type-body max-w-[48ch] text-pretty text-ink">{asset.description}</span>
        <span className="type-caption max-w-[60ch] text-ink-muted">{asset.spec}</span>
      </figcaption>
    </figure>
  );
}

function CropMarks() {
  const mark = "absolute size-3 border-ink-muted/60";
  return (
    <div aria-hidden className="pointer-events-none absolute inset-2">
      <span className={`${mark} top-0 left-0 border-t border-l`} />
      <span className={`${mark} top-0 right-0 border-t border-r`} />
      <span className={`${mark} bottom-0 left-0 border-b border-l`} />
      <span className={`${mark} right-0 bottom-0 border-r border-b`} />
    </div>
  );
}
