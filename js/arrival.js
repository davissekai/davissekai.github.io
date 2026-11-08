/**
 * Arrival: stars drift in from the void, gather into 人皇,
 * hold a breath, then scatter across a nebula of teal gas and a burning core.
 *
 * While the stars fly, every one is repainted each frame (fewer on slow
 * devices, via the frame budget). Once they settle, most are baked into one
 * cached image and only a few hundred twinkle live, plus whatever sits under
 * the cursor; settled frames also run at half rate unless the cursor moves.
 */
import { sampleInkedPoints, pickTargets } from "./glyph-points.js";
import { progress, easeInOutCubic } from "./timeline.js";
import { buildSky } from "./sky.js";
import { paintNebula } from "./nebula.js";
import { paintStar } from "./sprites.js";
import { splitLive, createGrid, createLayer, blitLayer } from "./star-layers.js";
import { createFrameBudget } from "./frame-budget.js";
import { pull, WARP_RADIUS } from "./warp.js";

const T = { gather: 0.5, gatherDur: 2.6, scatter: 4.6, scatterDur: 2.8, reveal: 5.8 };
// Every star is home and the nebula fully faded in; from here the baked layer takes over.
const END = T.scatter + T.scatterDur * 1.4 + 0.1;
// Baked stars ease out of twinkling over this long before END, so the hand-off doesn't pop.
const TWINKLE_FADE = 1.5;
// Twinkle alone is slow enough for ~30fps; cursor movement still gets every frame.
const SETTLED_FRAME_MS = 33;
// Widest halo a baked star can have, so stars just outside the cursor's reach still paint their spill.
const HALO_PAD = 10;
const VOID = "#05040a";
// 人皇 forms in cool starlight. Saturated on its own, because packed neighbours add up toward
// white: this way the glyph reads pale blue, like a young star cluster, not a white blot.
const STARLIGHT = [150, 176, 255];
// Peak alpha of a gathered glyph star; kept low so neighbours add up to starlight, not white.
const GLYPH_ALPHA = 0.9;
const GLYPH_FONT = '"Ma Shan Zheng", "KaiTi", "STKaiti", serif';

const canvas = document.getElementById("sky");
const ctx = canvas.getContext("2d", { alpha: false });
const greeting = document.getElementById("greeting");
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const budget = createFrameBudget();

let w = 0;
let h = 0;
let dpr = 1;
let drawOrder = [];
let live = [];
let grid = null;
let baked = null;
let nebula = null;
let t0 = performance.now();
let lastPaint = 0;
let pointerDirty = false;
const mouse = { x: -1e4, y: -1e4 };

/** Renders the characters off-screen and returns inked pixel cells. */
function glyphPool() {
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const g = off.getContext("2d");
  const size = Math.min((w * 0.82) / 2, h * 0.5);
  g.font = `${size}px ${GLYPH_FONT}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("人皇", w / 2, h * 0.45);
  return sampleInkedPoints(g.getImageData(0, 0, w, h).data, w, h, glyphStep());
}

/** Sampling grid spacing for the glyph; denser on small screens where the strokes are thin. */
function glyphStep() {
  return w < 700 ? 2 : 3;
}

/** (Re)builds the sky for the arrival screen's current size. */
function build() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  w = canvas.clientWidth;
  h = canvas.clientHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const count = w < 700 ? 2600 : 6000;
  const stars = buildSky(count, w, h, Math.random);
  const pool = glyphPool();
  // Never more stars than ink cells: repeats would stack on one spot and burn white.
  const glyphCount = Math.min(Math.round(count * 0.62), pool.length);
  const targets = pickTargets(pool, glyphCount, Math.random);
  const order = pickTargets(stars, stars.length, Math.random);
  // Jitter a full cell so the sampling grid doesn't show through the strokes.
  const jit = glyphStep();
  order.forEach((s, i) => {
    s.target = i < targets.length ? { x: targets[i].x + (Math.random() - 0.5) * jit, y: targets[i].y + (Math.random() - 0.5) * jit } : null;
    s.start = { x: (Math.random() * 1.6 - 0.3) * w, y: (Math.random() * 1.6 - 0.3) * h };
    s.delay = Math.random() * 0.7;
  });
  // Spikes first so a reduced-quality frame always keeps the brightest glints.
  drawOrder = [...order.filter((s) => s.spike), ...order.filter((s) => !s.spike)];
  nebula = paintNebula(w, h);

  const split = splitLive(stars, w < 700 ? 120 : 260, Math.random);
  for (const s of split.live) s.live = true;
  live = split.live;
  grid = createGrid(split.baked, 64);
  baked = createLayer(w, h, dpr);
  baked.ctx.fillStyle = VOID;
  baked.ctx.fillRect(0, 0, w, h);
  baked.ctx.drawImage(nebula, 0, 0);
  baked.ctx.globalCompositeOperation = "lighter";
  for (const s of split.baked) {
    const p = s.home(END);
    paintStar(baked.ctx, s, p.x, p.y, s.rgb, settledAlpha(s));
  }
}

/** A baked star's brightness once settled: the twinkle's mean. */
function settledAlpha(s) {
  return 0.9 * 0.75 * s.bright;
}

/** Mix helper for positions and colors. */
function lerp(a, b, k) {
  return a + (b - a) * k;
}

/** Where a star is, what color, and how bright at time t. */
function place(s, t) {
  const home = s.home(t);
  const amp = s.live ? 0.25 : 0.25 * (1 - progress(t, END - TWINKLE_FADE, TWINKLE_FADE));
  const tw = 0.75 + amp * Math.sin(t * 2.2 + s.twinkle);
  const sc = easeInOutCubic(progress(t, T.scatter + s.delay * 0.5, T.scatterDur));
  if (!s.target) {
    return { x: home.x, y: home.y, rgb: s.rgb, a: lerp(0.06, 0.9, sc) * tw * s.bright, glow: 1 };
  }
  const ga = easeInOutCubic(progress(t, T.gather + s.delay, T.gatherDur));
  const shimmer = ga === 1 && sc === 0 ? Math.sin(t * 3 + s.twinkle) * 0.4 : 0;
  const fx = lerp(s.start.x, s.target.x, ga) + shimmer;
  const fy = lerp(s.start.y, s.target.y, ga);
  const k = sc;
  return {
    x: lerp(fx, home.x, k),
    y: lerp(fy, home.y, k),
    rgb: [lerp(STARLIGHT[0], s.rgb[0], k), lerp(STARLIGHT[1], s.rgb[1], k), lerp(STARLIGHT[2], s.rgb[2], k)],
    a: lerp(lerp(0.15, GLYPH_ALPHA, ga), 0.9 * tw * s.bright, k),
    // Halos blur packed glyph stars into a smear; fade them while gathered, restore on scatter.
    glow: lerp(1 - ga * 0.8, 1, k),
  };
}


/** Paints a frame while stars are in flight: every star (or the budget's share) is live. */
function drawMoving(t) {
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.fillStyle = VOID;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = progress(t, T.scatter, T.scatterDur * 1.4);
  ctx.drawImage(nebula, 0, 0);
  ctx.globalCompositeOperation = "lighter";
  const n = Math.ceil(drawOrder.length * budget.quality);
  for (let i = 0; i < n; i++) {
    const s = drawOrder[i];
    const p = pull(place(s, t), mouse);
    paintStar(ctx, s, p.x, p.y, p.rgb, p.a, p.glow);
  }
  ctx.globalAlpha = 1;
}

/** Paints a settled frame: the baked sky, the cursor's neighbourhood redrawn with its pull, then live twinklers. */
function drawSettled(t) {
  blitLayer(ctx, baked.canvas, dpr);
  const reach = WARP_RADIUS + HALO_PAD;
  if (mouse.x > -reach && mouse.x < w + reach && mouse.y > -reach && mouse.y < h + reach) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(mouse.x, mouse.y, WARP_RADIUS, 0, Math.PI * 2);
    ctx.clip();
    // The nebula is opaque, so it alone resets the patch; a second fill would double-darken the clip's soft edge into a ring.
    ctx.drawImage(nebula, 0, 0);
    ctx.globalCompositeOperation = "lighter";
    for (const s of grid.near(mouse.x, mouse.y, reach)) {
      const p = pull(s.home(t), mouse);
      paintStar(ctx, s, p.x, p.y, s.rgb, settledAlpha(s));
    }
    ctx.restore();
  }
  ctx.globalCompositeOperation = "lighter";
  for (const s of live) {
    const p = pull(place(s, t), mouse);
    paintStar(ctx, s, p.x, p.y, p.rgb, p.a, p.glow);
  }
  ctx.globalAlpha = 1;
}

/** Animation loop; skips painting while scrolled away. Reduced-motion gets a still. */
function frame(now) {
  const t = reduced ? END : (now - t0) / 1000;
  if (onScreen || reduced) {
    if (t < END) {
      const start = performance.now();
      drawMoving(t);
      budget.record(performance.now() - start);
    } else if (reduced || pointerDirty || now - lastPaint >= SETTLED_FRAME_MS) {
      drawSettled(t);
      lastPaint = now;
      pointerDirty = false;
    }
    greeting.classList.toggle("is-revealed", t >= T.reveal);
  }
  if (!reduced) requestAnimationFrame(frame);
}

/** Restarts the arrival from the void, bringing the visitor back up to see it. */
function replay() {
  window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  t0 = performance.now();
}

let onScreen = true;
new IntersectionObserver(([entry]) => {
  onScreen = entry.isIntersecting;
}).observe(canvas);

window.addEventListener("pointermove", (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
  pointerDirty = true;
});
window.addEventListener("pointerleave", () => {
  mouse.x = mouse.y = -1e4;
  pointerDirty = true;
});

let resizeTimer = 0;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    build();
    t0 = performance.now() - END * 1000;
    if (reduced) frame(performance.now());
  }, 200);
});

document.getElementById("seal").addEventListener("click", replay);

// Sampling before the brush font loads would trace a fallback face; wait, but never forever.
Promise.race([document.fonts.load(`200px ${GLYPH_FONT}`, "人皇"), new Promise((r) => setTimeout(r, 2500))])
  .catch(() => undefined)
  .then(() => {
    build();
    t0 = performance.now();
    requestAnimationFrame(frame);
  });
