import { tokenRgb } from "./rasterize";

/**
 * What the scene asks of the familiar; it gets there on its own, with springs.
 * Positions in CSS px relative to the canvas.
 */
export type FamiliarIntent = {
  x: number;
  y: number;
  /** Where it looks. */
  lookX: number;
  lookY: number;
  /** 0: a spark, 1: itself. */
  size: number;
  /** 0: eyes shut (asleep, being born), 1: awake. */
  awake: number;
  /** Eyes smiling while it speaks. */
  happy: number;
  /** Fades the whole drawing. */
  alpha: number;
};

export type Familiar = {
  intent: FamiliarIntent;
  /** Where it actually is now. */
  readonly position: { x: number; y: number };
  /** A small hop, as when it decides to speak. */
  hop(): void;
  /** Startled: a quick squash. */
  flinch(): void;
  start(): void;
  stop(): void;
  resize(): void;
  /** Draw one frame at once (static pages). */
  drawStill(): void;
  destroy(): void;
};

type Mote = { x: number; y: number; vx: number; vy: number; age: number; life: number; r: number };

const POINTS = 18;
const TAU = Math.PI * 2;

/**
 * A drop of light with a face: it trails when it moves, stretches with speed,
 * breathes, blinks at its own pace, and sheds a few motes when hurried.
 */
export function createFamiliar(canvas: HTMLCanvasElement, radius: () => number): Familiar | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const coat = tokenRgb("coat");
  const mineral = tokenRgb("mineral");
  const smoke = tokenRgb("smoke");
  const ink = tokenRgb("coat-ink");
  const rgba = (c: [number, number, number], a: number) =>
    `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${Math.max(0, Math.min(1, a)).toFixed(3)})`;

  const intent: FamiliarIntent = { x: 0, y: 0, lookX: 0, lookY: 0, size: 1, awake: 1, happy: 0, alpha: 1 };
  const body = { x: 0, y: 0, vx: 0, vy: 0, set: false };
  const look = { x: 0, y: 0 };
  const shape = { size: intent.size, awake: intent.awake, happy: 0 };
  const bounce = { v: 0, vel: 0 };
  const motes: Mote[] = [];
  let blinkAt = 0;
  let blinkStart = -1;
  let doubleBlink = false;

  let width = 1;
  let height = 1;
  let dpr = 1;
  const resize = () => {
    const box = canvas.getBoundingClientRect();
    width = Math.max(1, box.width);
    height = Math.max(1, box.height);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  };
  resize();

  /** 1 open, 0 shut, over a blink of about a third of a second. */
  const blinkAmount = (now: number) => {
    if (blinkStart < 0) {
      if (!blinkAt) blinkAt = now + 1800 + Math.random() * 2600;
      if (now >= blinkAt) blinkStart = now;
      return 1;
    }
    const t = now - blinkStart;
    const close = 110;
    const hold = 50;
    const open = 210;
    if (t < close) return 1 - t / close;
    if (t < close + hold) return 0;
    if (t < close + hold + open) return (t - close - hold) / open;
    blinkStart = -1;
    if (!doubleBlink && Math.random() < 0.22) {
      doubleBlink = true;
      blinkAt = now + 140;
    } else {
      doubleBlink = false;
      blinkAt = now + 2200 + Math.random() * 3600;
    }
    return 1;
  };

  const outline = (cx: number, cy: number, r: number, now: number) => {
    const t = now / 1000;
    const speed = Math.hypot(body.vx, body.vy);
    const stretch = Math.min(speed / 950, 0.5);
    const heading = Math.atan2(body.vy, body.vx);
    const breath = 1 + Math.sin(t * 2.1) * 0.028;
    const squash = bounce.v;
    const pts: [number, number][] = [];
    for (let i = 0; i < POINTS; i++) {
      const a = (i / POINTS) * TAU;
      const along = Math.cos(a - heading);
      // Longer along the way it goes, a tail behind, thinner across.
      let k = breath * (1 + stretch * 0.32 * along * along) / Math.sqrt(1 + stretch * 0.32);
      k += stretch * 1.05 * Math.max(0, -along) ** 3;
      // Slow, wide wobble: jelly, never corners.
      k += Math.sin(a * 2 + t * 1.4) * 0.022 + Math.sin(a * 3 - t * 1.9 + 1) * 0.012;
      let x = Math.cos(a) * r * k;
      let y = Math.sin(a) * r * k;
      // A drop sits heavier at the bottom.
      if (y > 0) y *= 1.08;
      x *= 1 + squash * 0.55;
      y *= 1 - squash;
      pts.push([cx + x, cy + y + squash * r * 0.45]);
    }
    ctx.beginPath();
    for (let i = 0; i < POINTS; i++) {
      const p0 = pts[(i - 1 + POINTS) % POINTS];
      const p1 = pts[i];
      const p2 = pts[(i + 1) % POINTS];
      const p3 = pts[(i + 2) % POINTS];
      if (i === 0) ctx.moveTo(p1[0], p1[1]);
      ctx.bezierCurveTo(
        p1[0] + (p2[0] - p0[0]) / 6,
        p1[1] + (p2[1] - p0[1]) / 6,
        p2[0] - (p3[0] - p1[0]) / 6,
        p2[1] - (p3[1] - p1[1]) / 6,
        p2[0],
        p2[1],
      );
    }
    ctx.closePath();
  };

  const eye = (x: number, y: number, r: number, open: number, happy: number) => {
    // Open: a dark upright oval with a catch light. Happy: a little arch.
    const o = open * (1 - happy);
    if (o > 0.04) {
      ctx.fillStyle = rgba(smoke, 0.94);
      ctx.beginPath();
      ctx.ellipse(x, y, r * 0.1, r * 0.17 * o, 0, 0, TAU);
      ctx.fill();
      if (o > 0.5) {
        ctx.fillStyle = rgba(mineral, 0.95 * (o - 0.5) * 2);
        ctx.beginPath();
        ctx.arc(x - r * 0.03, y - r * 0.07 * o, r * 0.035, 0, TAU);
        ctx.fill();
      }
    }
    const lineAlpha = Math.max(happy, 1 - open) * 0.92;
    if (lineAlpha > 0.04) {
      ctx.strokeStyle = rgba(smoke, lineAlpha);
      ctx.lineWidth = Math.max(1.6, r * 0.075);
      ctx.lineCap = "round";
      ctx.beginPath();
      if (happy >= 1 - open) ctx.arc(x, y + r * 0.05, r * 0.1, Math.PI * 1.12, Math.PI * 1.88);
      else ctx.arc(x, y - r * 0.03, r * 0.1, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    }
  };

  let raf = 0;
  let last = 0;

  const step = (now: number) => {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;

    if (!body.set) {
      body.x = intent.x;
      body.y = intent.y;
      body.set = true;
    }
    // A spring with a little overshoot: it arrives, not lands.
    const k = 34;
    const c = 2 * Math.sqrt(k) * 0.7;
    body.vx += (k * (intent.x - body.x) - c * body.vx) * dt;
    body.vy += (k * (intent.y - body.y) - c * body.vy) * dt;
    body.x += body.vx * dt;
    body.y += body.vy * dt;

    bounce.vel += (-160 * bounce.v - 9 * bounce.vel) * dt;
    bounce.v += bounce.vel * dt;

    const ease = (from: number, to: number, rate: number) => from + (to - from) * (1 - Math.exp(-dt * rate));
    shape.size = ease(shape.size, intent.size, 9);
    shape.awake = ease(shape.awake, intent.awake, 4);
    shape.happy = ease(shape.happy, intent.happy, 7);
    const lx = Math.max(-1, Math.min(1, (intent.lookX - body.x) / 320));
    const ly = Math.max(-1, Math.min(1, (intent.lookY - body.y) / 320));
    look.x = ease(look.x, lx, 7);
    look.y = ease(look.y, ly, 7);

    const speed = Math.hypot(body.vx, body.vy);
    const r = radius() * (0.46 + shape.size * 0.54);
    if (speed > 240 && intent.alpha > 0.2 && motes.length < 60) {
      const count = speed > 900 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const back = Math.atan2(-body.vy, -body.vx) + (Math.random() - 0.5) * 1.4;
        motes.push({
          x: body.x + Math.cos(back) * r * 0.9,
          y: body.y + Math.sin(back) * r * 0.9,
          vx: -body.vx * 0.08 + (Math.random() - 0.5) * 30,
          vy: -body.vy * 0.08 - 14 - Math.random() * 18,
          age: 0,
          life: 0.7 + Math.random() * 0.6,
          r: 1 + Math.random() * 1.6,
        });
      }
    }
    for (let i = motes.length - 1; i >= 0; i--) {
      const m = motes[i];
      m.age += dt;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.vx *= 1 - dt * 1.5;
      if (m.age > m.life) motes.splice(i, 1);
    }

    draw(now, r);
  };

  const draw = (now: number, r: number) => {
    const t = now / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    if (intent.alpha <= 0.002) return;
    ctx.globalAlpha = intent.alpha;
    const bob = Math.sin(t * 1.7) * r * 0.12 * shape.size;
    const x = body.x;
    const y = body.y + bob;

    // Its light on the air around it
    const halo = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 4.2);
    const pulse = 0.85 + Math.sin(t * 2.1) * 0.15;
    halo.addColorStop(0, rgba(coat, 0.3 * pulse));
    halo.addColorStop(0.3, rgba(coat, 0.11 * pulse));
    halo.addColorStop(0.65, rgba(coat, 0.03 * pulse));
    halo.addColorStop(1, rgba(coat, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(x - r * 4.2, y - r * 4.2, r * 8.4, r * 8.4);

    for (const m of motes) {
      const life = 1 - m.age / m.life;
      ctx.fillStyle = rgba(coat, 0.75 * life);
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r * (0.6 + life * 0.4), 0, TAU);
      ctx.fill();
    }

    // The body: light inside, a little denser at the edge
    outline(x, y, r, now);
    const glow = ctx.createRadialGradient(x - r * 0.3, y - r * 0.38, r * 0.05, x + r * 0.08, y + r * 0.1, r * 1.08);
    glow.addColorStop(0, rgba(mineral, 1));
    glow.addColorStop(0.3, rgba(coat, 1));
    glow.addColorStop(0.68, rgba(coat, 0.96));
    glow.addColorStop(0.9, rgba(ink, 0.5));
    glow.addColorStop(1, rgba(ink, 0.72));
    ctx.fillStyle = glow;
    ctx.fill();
    ctx.save();
    ctx.clip();
    // Shade low on one side, then light bounced back up into the bottom edge
    const shade = ctx.createRadialGradient(x + r * 0.35, y + r * 0.55, 0, x + r * 0.35, y + r * 0.55, r * 1.1);
    shade.addColorStop(0, rgba(ink, 0.32));
    shade.addColorStop(1, rgba(ink, 0));
    ctx.fillStyle = shade;
    ctx.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);
    const bounceLight = ctx.createLinearGradient(x, y + r * 0.55, x, y + r * 1.15);
    bounceLight.addColorStop(0, rgba(mineral, 0));
    bounceLight.addColorStop(1, rgba(mineral, 0.38));
    ctx.strokeStyle = bounceLight;
    ctx.lineWidth = r * 0.16;
    ctx.stroke();
    ctx.restore();

    // Specular glint, and a smaller one beside it
    ctx.fillStyle = rgba(mineral, 0.92);
    ctx.beginPath();
    ctx.ellipse(x - r * 0.42, y - r * 0.44, r * 0.16, r * 0.09, -0.65, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgba(mineral, 0.6);
    ctx.beginPath();
    ctx.arc(x - r * 0.18, y - r * 0.62, r * 0.045, 0, TAU);
    ctx.fill();

    // The face follows the gaze, and lags a touch behind fast moves
    const lagX = Math.max(-0.12, Math.min(0.12, body.vx / 4000));
    const lagY = Math.max(-0.1, Math.min(0.1, body.vy / 4000));
    const fx = x + (look.x * 0.24 - lagX) * r;
    const fy = y + (look.y * 0.16 - 0.02 - lagY + bounce.v * 0.3) * r;
    const open = shape.awake * blinkAmount(now);
    const blush = 0.12 + shape.happy * 0.2;
    if (shape.awake > 0.3) {
      ctx.fillStyle = rgba(ink, blush * shape.awake);
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(fx + side * r * 0.42, fy + r * 0.2, r * 0.12, r * 0.065, 0, 0, TAU);
        ctx.fill();
      }
    }
    eye(fx - r * 0.27, fy, r, open, shape.happy);
    eye(fx + r * 0.27, fy, r, open, shape.happy);

    ctx.globalAlpha = 1;
  };

  const frame = (now: number) => {
    step(now);
    raf = requestAnimationFrame(frame);
  };

  return {
    intent,
    get position() {
      return { x: body.x, y: body.y };
    },
    hop() {
      bounce.vel -= 5.5;
    },
    flinch() {
      bounce.vel += 4;
    },
    start() {
      if (!raf) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    },
    stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    },
    resize,
    drawStill() {
      body.x = intent.x;
      body.y = intent.y;
      body.vx = body.vy = 0;
      body.set = true;
      shape.size = intent.size;
      shape.awake = intent.awake;
      shape.happy = intent.happy;
      draw(performance.now(), radius() * (0.46 + shape.size * 0.54));
    },
    destroy() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    },
  };
}
