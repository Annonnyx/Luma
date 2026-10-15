export type SceneTheme = "light" | "dark";

export type SceneId =
  | "accueil"
  | "dans-le-verre"
  | "fenetres"
  | "memoire"
  | "lentilles"
  | "bague"
  | "familier"
  | "essayer";

export type AssetKind = "video" | "interactive" | "model" | "image";

export interface SceneAsset {
  kind: AssetKind;
  /** What the shot or the demo shows, in plain words. */
  description: string;
  /** Delivery spec for the file, or the technique for code-driven placeholders. */
  spec: string;
  /** Plate ratio while the real asset is missing. */
  ratio: "16/9" | "4/5" | "3/2" | "1/1";
}

export interface Scene {
  id: SceneId;
  /** Position in the story, 1-based. */
  order: number;
  theme: SceneTheme;
  /** `\n` marks a deliberate line break on wide screens. */
  title: string;
  lead: string;
  /** Planned scroll length once the scene is built (pinned distance). */
  scroll: string;
  assets: SceneAsset[];
}

export const SCENES: Scene[] = [
  {
    id: "accueil",
    order: 1,
    theme: "light",
    title: "Le monde,\nà peine augmenté.",
    lead: "Orée ressemble à une paire de lunettes, parce que c'en est une. L'interface n'apparaît que pour vous, et seulement quand vous en avez besoin.",
    scroll: "Plein écran, sans épinglage",
    assets: [
      {
        kind: "model",
        description: "Monture Orée de face, acétate noir poli, verres clairs.",
        spec: "GLB Draco < 2 Mo ou rendu PNG 4K détouré, éclairage studio doux par le haut",
        ratio: "16/9",
      },
    ],
  },
  {
    id: "dans-le-verre",
    order: 2,
    theme: "dark",
    title: "Entrez dans le verre.",
    lead: "Ce que vous voyez reste le monde. Lume y pose seulement ce qui vous sert, là où vous en avez besoin.",
    scroll: "Séquence collante de 420 % avec le Hero : traversée du verre, l'interface, une sortie longue",
    assets: [
      {
        kind: "video",
        description: "Optionnel. La traversée est rendue en code à partir du dessin de la monture ; un rendu 3D pourrait la remplacer plus tard.",
        spec: "1920×1080 et 1080×1350, 5 s, 30 i/s, une keyframe par image, sans son",
        ratio: "16/9",
      },
    ],
  },
  {
    id: "fenetres",
    order: 3,
    theme: "dark",
    title: "Des fenêtres,\npas des écrans.",
    lead: "Messages, recette, itinéraire : chaque fenêtre est une plaque de verre posée dans la pièce. Elle laisse passer la lumière qui l'entoure.",
    scroll: "Collante sur 240 %, ouverte après une pause dans le noir, refermée par la fenêtre de recette",
    assets: [
      {
        kind: "video",
        description: "Intérieur calme en légère dérive de caméra, lumière de fin d'après-midi. En attendant, la pièce est dessinée en code (mur, tache de soleil, table floue).",
        spec: "1920×1080 et 1080×1350, 8 s en boucle, 24 i/s, sombre et désaturé",
        ratio: "16/9",
      },
      {
        kind: "interactive",
        description: "Fenêtres de verre au premier plan, flou d'arrière-plan et reflets qui suivent la lumière.",
        spec: "Code : backdrop-filter, bord de verre en dégradé, reflet au pointeur, aucun fichier à fournir",
        ratio: "16/9",
      },
    ],
  },
  {
    id: "memoire",
    order: 4,
    theme: "dark",
    title: "Posez-la.\nElle reste là.",
    lead: "Un minuteur au-dessus de la casserole, la recette près de la fenêtre. Revenez demain : tout vous attend au même endroit.",
    scroll: "Collante sur 580 %, enchaînée aux scènes 3 et 5 ; la démo est libre, la sortie est longue",
    assets: [
      {
        kind: "image",
        description: "Cuisine le soir, vue à hauteur d'yeux. En attendant, elle est dessinée en code (fenêtre, placards, casserole).",
        spec: "Photo ou rendu 3840×2400 (16:10), AVIF, même cadrage que le dessin : fenêtre au centre gauche, plaques au centre, colonne à droite",
        ratio: "16/9",
      },
      {
        kind: "interactive",
        description: "Le visiteur déplace les fenêtres à la souris, au doigt par leur poignée ou au clavier ; leurs positions sont gardées.",
        spec: "Code : Draggable et Inertia (GSAP), positions en fractions de l'image de la cuisine, conservées en localStorage",
        ratio: "16/9",
      },
    ],
  },
  {
    id: "lentilles",
    order: 5,
    theme: "dark",
    title: "Ou rien du tout\nsur le nez.",
    lead: "Les lentilles Lume affichent la même interface, directement dans l'œil. Vue de l'extérieur, à peine un reflet.",
    scroll: "Collante sur 540 %, enchaînée à la scène 4 ; l'œil s'ouvre lentement, le bord de l'iris devient la bague de la scène 6",
    assets: [
      {
        kind: "video",
        description: "Macro d'un œil : la lentille se pose, l'iris se contracte, l'interface s'allume dans la pupille.",
        spec: "1920×1080 et 1080×1350, 6 s, 30 i/s, une keyframe par image, sans son",
        ratio: "16/9",
      },
    ],
  },
  {
    id: "bague",
    order: 6,
    theme: "dark",
    title: "Tout passe\npar la bague.",
    lead: "Un anneau de titane. Tournez-le pour faire défiler, touchez-le pour choisir, serrez-le pour revenir. Les mains restent libres.",
    scroll: "Collante sur 500 %, enchaînée à la scène 5 ; la lumière devient un objet, qui fait tourner les fenêtres",
    assets: [
      {
        kind: "video",
        description: "La bague tourne lentement sur elle-même sur fond sombre, puis se pose au doigt.",
        spec: "1920×1080 et 1080×1350, 6 s, 30 i/s, une keyframe par image",
        ratio: "16/9",
      },
      {
        kind: "model",
        description: "Bague en titane brossé pour la démo interactive (rotation au scroll et au glisser).",
        spec: "GLB Draco < 1,5 Mo, matériaux PBR, origine au centre de l'anneau",
        ratio: "1/1",
      },
    ],
  },
  {
    id: "familier",
    order: 7,
    theme: "dark",
    title: "Quelqu'un,\nquand il le faut.",
    lead: "Un petit compagnon se tient au bord de votre regard. Il ne parle que si vous hésitez, et se tait dès que vous savez.",
    scroll: "Collante sur 260 %, enchaînée à la scène 6 ; l'étincelle de la bague devient le compagnon, qui se tient au bord du regard et parle quand on s'arrête",
    assets: [
      {
        kind: "interactive",
        description: "Petit personnage lumineux qui suit le curseur, cligne, et propose de l'aide quand on s'attarde.",
        spec: "Code : SVG + GSAP. Optionnel : fichier Rive ou personnage dessiné à fournir",
        ratio: "4/5",
      },
    ],
  },
  {
    id: "essayer",
    order: 8,
    theme: "light",
    title: "Essayez-les chez un opticien.",
    lead: "Trente minutes, à votre vue, sans engagement. Vous repartirez peut-être avec une simple paire de lunettes. C'est aussi le but.",
    scroll: "Plein écran",
    assets: [
      {
        kind: "image",
        description: "Les lunettes posées, branches repliées, sur une surface minérale. Le dernier plan du site.",
        spec: "Rendu 3840×2160 AVIF ou dernière image de la vidéo du Hero",
        ratio: "16/9",
      },
    ],
  },
];

/**
 * Scene 2, on the way home, before scenes 3 and 4. What follows the eyes (the
 * time, a message) sits at the edge of the view; what belongs to a place (the
 * turn) is pinned on it.
 */
export const LENS_PASSAGE_CONTENT = {
  time: { title: "18:20", body: "Pluie vers 21 h" },
  message: { from: "Léa", when: "À l'instant", body: "Prends du parmesan, il n'y en a plus." },
  route: { title: "Rue Charlot", body: "À gauche dans 80 m" },
} as const;

/** Scene 3: three windows in the same room, late afternoon, one small story. */
export const FLOATING_WINDOWS_CONTENT = {
  recipe: {
    label: "Recette",
    title: "Risotto aux cèpes",
    step: 3,
    steps: 6,
    instruction: "Versez une louche de bouillon chaud et remuez jusqu'à ce qu'il soit absorbé.",
    timerLabel: "Minuteur",
    timer: "18:00",
  },
  messages: {
    from: "Léa",
    time: "18:42",
    received: "On dîne à quelle heure ?",
    sent: "Vers 20 h. Je lance le risotto.",
  },
  route: {
    title: "Marché des Enfants-Rouges",
    detail: "7 min à pied, ferme à 19 h 30",
  },
} as const;

/** Scene 5: the lens, named like the frame in the Hero. */
export const CONTACT_LENS_CONTENT = {
  caption: { title: "Lentille Lume", body: "Hydrogel de silicone, 14,2 mm" },
} as const;

export type KitchenWindowId = "recipe" | "timer" | "list";

/** Wide screens see the whole kitchen; narrow ones see a slice of it. */
export type KitchenLayoutKind = "wide" | "narrow";

/** A point in the kitchen picture, in fractions of its width and height. */
export interface KitchenPoint {
  x: number;
  y: number;
}

export interface KitchenLayout {
  /** Horizontal centre of what the camera frames once settled. */
  frame: number;
  /** Top-left corner of each window. */
  anchors: Record<KitchenWindowId, KitchenPoint>;
}

/** Scene 4: the same evening, in the kitchen. */
export const SPATIAL_MEMORY_CONTENT = {
  timer: { label: "Minuteur", title: "Risotto", minutes: 18 },
  list: {
    label: "Courses",
    items: [
      { text: "Parmesan", done: true },
      { text: "Échalotes", done: true },
      { text: "Vin blanc sec", done: false },
    ],
  },
  /** How each window is named once it has been put somewhere. */
  windows: {
    recipe: { name: "La recette", placed: "posée", grip: "la recette" },
    timer: { name: "Le minuteur", placed: "posé", grip: "le minuteur" },
    list: { name: "La liste de courses", placed: "posée", grip: "la liste de courses" },
  } satisfies Record<KitchenWindowId, { name: string; placed: string; grip: string }>,
  /** Recognisable spots in the kitchen picture. */
  places: [
    { x: 0.35, y: 0.37, label: "près de la fenêtre" },
    { x: 0.12, y: 0.29, label: "près de l'étagère" },
    { x: 0.5625, y: 0.5, label: "au-dessus des plaques" },
    { x: 0.72, y: 0.56, label: "au-dessus du plan de travail" },
    { x: 0.66, y: 0.24, label: "contre les placards" },
    { x: 0.92, y: 0.42, label: "sur le réfrigérateur" },
    { x: 0.4, y: 0.8, label: "devant les placards du bas" },
  ] satisfies (KitchenPoint & { label: string })[],
  hint: {
    pointer: "Faites glisser une fenêtre.",
    touch: "Faites glisser une fenêtre par sa poignée.",
    returning: "Vos fenêtres vous attendaient.",
    keys: "Au clavier, choisissez une poignée puis utilisez les flèches. Maj pour aller plus loin.",
    reset: "Remettre en place",
  },
  layouts: {
    wide: {
      frame: 0.5,
      anchors: {
        recipe: { x: 0.16, y: 0.22 },
        timer: { x: 0.6, y: 0.4 },
        list: { x: 0.715, y: 0.13 },
      },
    },
    narrow: {
      frame: 0.44,
      anchors: {
        recipe: { x: 0.333, y: 0.13 },
        timer: { x: 0.434, y: 0.44 },
        list: { x: 0.53, y: 0.2 },
      },
    },
  } satisfies Record<KitchenLayoutKind, KitchenLayout>,
} as const;

/** Scene 6: the titanium ring, born from the light of scene 5. */
export const RING_CONTENT = {
  caption: { title: "Bague Lume", body: "Titane brossé, 4,2 g" },
  hint: {
    pointer: {
      turn: "Faites tourner la bague pour changer de fenêtre.",
      look: "Passez la souris pour voir la rue telle qu'elle est.",
    },
    touch: {
      turn: "Glissez sur la bague pour changer de fenêtre.",
      look: "Par endroits, la rue apparaît telle qu'elle est.",
    },
  },
  /** The ring, as a control, and the windows it brings round, in order. */
  control: "Bague",
  windows: ["Itinéraire", "Messages de Léa", "Courses", "Recette", "Minuteur"],
} as const;

/** Scene 7: a small presence at the edge of the gaze. */
export const COMPANION_CONTENT = {
  line: "Il reste le vin blanc.",
} as const;

/** Scene 8: back outside. */
export const CTA_CONTENT = {
  action: "Réserver un essai",
  places: "Paris, Lyon, Bordeaux.",
  mail: "bonjour@lume.fr",
} as const;

export function getScene(id: SceneId): Scene {
  const scene = SCENES.find((s) => s.id === id);
  if (!scene) throw new Error(`Unknown scene: ${id}`);
  return scene;
}
