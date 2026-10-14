import { tokenRgb } from "./rasterize";

type Rect = { x: number; y: number; width: number; height: number };

export type Reveal = {
  /** The picture shown through the trace (the world without the interface). */
  setPicture(picture: TexImageSource): void;
  /** Pointer position, in CSS px relative to the canvas. */
  point(x: number, y: number): void;
  /** The pointer left the page: no new trace. */
  leave(): void;
  /** Off: no new trace; what is drawn dissolves, then the loop stops. */
  setLive(live: boolean): void;
  /** Without a pointer (touch screens), the trace wanders on its own. */
  setWander(wander: boolean): void;
  resize(): void;
  destroy(): void;
};

/** The trace is drawn at a quarter of the resolution; the shader makes its edge sharp. */
const FIELD_SCALE = 0.25;
/** Share of the trace lost per frame at 60 Hz: the trail lasts about half a second. */
const DECAY = 0.03;
/** How long a dissolving trace keeps the loop running, ms. */
const SETTLE_MS = 2000;

const VERTEX = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D uField;
uniform sampler2D uPicture;
uniform vec4 uRect;
uniform vec3 uRim;
uniform vec3 uTone;
uniform float uTime;
uniform vec2 uPx;
in vec2 vUv;
out vec4 outColor;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

void main() {
  // A slow wobble, so the edge reads as liquid rather than as circles.
  vec2 q = vUv / uPx / 170.0;
  vec2 warp = vec2(noise(q + uTime * 0.16), noise(q + 17.0 - uTime * 0.13)) - 0.5;
  float a = texture(uField, vUv + warp * uPx * 28.0).r;
  float w = max(fwidth(a), 0.0008);
  float m = smoothstep(0.5 - w, 0.5 + w, a);
  if (m <= 0.001) discard;

  // Near the edge the picture bends a little, like through the edge of a lens.
  vec2 g = vec2(dFdx(a), dFdy(a));
  vec2 dir = dot(g, g) > 0.0 ? normalize(g) : vec2(0.0);
  float edge = 1.0 - smoothstep(0.5, 0.78, a);
  vec2 uv = vUv + dir * edge * edge * uPx * 18.0;
  vec3 c = texture(uPicture, (uv - uRect.xy) / uRect.zw).rgb;

  // Daylight: without the smoked glass, shadows open up.
  c = 1.0 - pow(1.0 - c, vec3(2.6));
  c = mix(c, uTone, 0.07);

  // A hairline of coat just inside the edge: where the interface stops.
  float rim = smoothstep(0.5 + w, 0.5 + 2.0 * w, a) * (1.0 - smoothstep(0.5 + 2.6 * w, 0.5 + 4.2 * w, a));
  c = mix(c, uRim, rim * 0.6);
  outColor = vec4(c * m, m);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
}

function texture(gl: WebGL2RenderingContext) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

/** A soft round stamp, (1 − r²)², white on transparent. */
function stampSprite() {
  const size = 128;
  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = size;
  const ctx = sprite.getContext("2d");
  if (!ctx) return sprite;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (let i = 0; i <= 10; i++) {
    const r = i / 10;
    gradient.addColorStop(r, `rgba(255,255,255,${((1 - r * r) ** 2).toFixed(4)})`);
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return sprite;
}

/**
 * The cursor wipes the interface off the world: a liquid trace follows it with
 * a little lag, swells when it moves fast, thins as it fades, and shows the
 * picture underneath in daylight. WebGL 2; returns null where unavailable
 * (the scene simply has no reveal then).
 */
export function createReveal(canvas: HTMLCanvasElement, pictureRect: () => Rect): Reveal | null {
  const gl = canvas.getContext("webgl2", { premultipliedAlpha: true, antialias: false, alpha: true });
  if (!gl) return null;

  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vs || !fs || !program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uniform = (name: string) => gl.getUniformLocation(program, name);
  const u = {
    field: uniform("uField"),
    picture: uniform("uPicture"),
    rect: uniform("uRect"),
    rim: uniform("uRim"),
    tone: uniform("uTone"),
    time: uniform("uTime"),
    px: uniform("uPx"),
  };
  const fieldTex = texture(gl);
  const pictureTex = texture(gl);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  const rim = tokenRgb("coat");
  const tone = tokenRgb("mineral");

  // The trace itself: grey levels on black, read by the shader.
  const field = document.createElement("canvas");
  const f = field.getContext("2d", { alpha: false });
  if (!f) return null;
  const sprite = stampSprite();

  let width = 1;
  let height = 1;
  const clearField = () => {
    f.globalCompositeOperation = "source-over";
    f.globalAlpha = 1;
    f.fillStyle = "black";
    f.fillRect(0, 0, field.width, field.height);
  };
  const resize = () => {
    const box = canvas.getBoundingClientRect();
    width = Math.max(1, box.width);
    height = Math.max(1, box.height);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    field.width = Math.ceil(width * FIELD_SCALE);
    field.height = Math.ceil(height * FIELD_SCALE);
    clearField();
  };
  resize();

  let hasPicture = false;
  let live = false;
  let wander = false;
  const target = { x: 0, y: 0, in: false };
  const head = { x: 0, y: 0, set: false };
  let lastMove = 0;
  let lastTrace = -Infinity;
  let last = 0;
  let raf = 0;

  const stamp = (x: number, y: number, radius: number) => {
    const r = radius * FIELD_SCALE;
    f.drawImage(sprite, x * FIELD_SCALE - r, y * FIELD_SCALE - r, r * 2, r * 2);
  };

  const draw = (now: number) => {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (!hasPicture) return;
    gl.useProgram(program);
    gl.bindVertexArray(vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fieldTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, field);
    gl.uniform1i(u.field, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, pictureTex);
    gl.uniform1i(u.picture, 1);
    const r = pictureRect();
    gl.uniform4f(u.rect, r.x / width, 1 - (r.y + r.height) / height, r.width / width, r.height / height);
    gl.uniform3f(u.rim, rim[0], rim[1], rim[2]);
    gl.uniform3f(u.tone, tone[0], tone[1], tone[2]);
    gl.uniform1f(u.time, (now / 1000) % 1000);
    gl.uniform2f(u.px, 1 / width, 1 / height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  const frame = (now: number) => {
    raf = 0;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;

    f.globalCompositeOperation = "source-over";
    f.globalAlpha = 1;
    f.fillStyle = `rgba(0,0,0,${(1 - Math.pow(1 - DECAY, dt * 60)).toFixed(4)})`;
    f.fillRect(0, 0, field.width, field.height);

    if (live && wander) {
      // A slow, uneven figure of eight across the middle of the picture.
      const t = now / 1000;
      target.x = width * (0.5 + 0.32 * Math.sin(t * 0.31) + 0.06 * Math.sin(t * 1.3));
      target.y = height * (0.42 + 0.2 * Math.sin(t * 0.53 + 1.1));
      target.in = true;
      lastMove = now;
    }

    if (live && target.in) {
      if (!head.set) {
        head.x = target.x;
        head.y = target.y;
        head.set = true;
      }
      const fromX = head.x;
      const fromY = head.y;
      const k = 1 - Math.exp(-dt * 10);
      head.x += (target.x - head.x) * k;
      head.y += (target.y - head.y) * k;
      const dist = Math.hypot(head.x - fromX, head.y - fromY);
      const base = Math.min(150, Math.max(70, Math.min(width, height) * 0.13));
      const size = base * (0.8 + Math.min(dist / dt / 1500, 1) * 0.8);

      f.globalCompositeOperation = "lighter";
      if (dist > 0.4) {
        const steps = Math.max(1, Math.ceil(dist / (size * 0.16)));
        f.globalAlpha = 0.26;
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          stamp(fromX + (head.x - fromX) * t, fromY + (head.y - fromY) * t, size);
        }
      }
      // Resting, it keeps a small window open under the pointer.
      if (now - lastMove > 120) {
        f.globalAlpha = Math.min(1, 0.06 * dt * 60);
        stamp(head.x, head.y, base * 0.95);
      }
      lastTrace = now;
    }

    draw(now);

    if (live || now - lastTrace < SETTLE_MS) {
      raf = requestAnimationFrame(frame);
    } else {
      clearField();
      draw(now);
      head.set = false;
      last = 0;
    }
  };

  const wake = () => {
    if (!raf) raf = requestAnimationFrame(frame);
  };

  return {
    setPicture(picture) {
      gl.bindTexture(gl.TEXTURE_2D, pictureTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, picture);
      hasPicture = true;
    },
    point(x, y) {
      target.x = x;
      target.y = y;
      target.in = x >= 0 && y >= 0 && x <= width && y <= height;
      lastMove = performance.now();
      if (live) wake();
    },
    leave() {
      target.in = false;
    },
    setLive(next) {
      if (next === live) return;
      live = next;
      wake();
    },
    setWander(next) {
      if (next === wander) return;
      wander = next;
      if (!wander) target.in = false;
      if (live) wake();
    },
    resize() {
      resize();
      head.set = false;
      wake();
    },
    destroy() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      gl.deleteTexture(fieldTex);
      gl.deleteTexture(pictureTex);
      gl.deleteBuffer(quad);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    },
  };
}
