/**
 * Arrival prototype: stars drift in from the void, gather into 人皇,
 * hold a breath, then scatter across a nebula of teal gas and a burning core.
 */
import { sampleInkedPoints, pickTargets } from "../js/glyph-points.js";
import { progress, easeInOutCubic } from "../js/timeline.js";
import { buildSky } from "../js/sky.js";
import { paintNebula } from "../js/nebula.js";
import { glowFor, spikeFor } from "../js/sprites.js";

const T = { gather: 0.5, gatherDur: 2.6, scatter: 4.6, scatterDur: 2.8, reveal: 5.8 };
const END = T.scatter + T.scatterDur + 1;
const GOLD = [255, 192, 96];
// Peak alpha of a gathered glyph star; kept low so neighbours add up to gold, not white.
const GLYPH_ALPHA = 0.9;
const GLYPH_FONT = '"Ma Shan Zheng", "KaiTi", "STKaiti", serif';
const QI_RADIUS = 140;

const canvas = document.getElementById("sky");
const ctx = canvas.getContext("2d", { alpha: false });
const greeting = document.getElementById("greeting");
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let w = 0;
let h = 0;
let stars = [];
let nebula = null;
let t0 = performance.now();
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
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  w = canvas.clientWidth;
  h = canvas.clientHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const count = w < 700 ? 2600 : 6000;
  stars = buildSky(count, w, h, Math.random);
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
  nebula = paintNebula(w, h);
}

/** Mix helper for positions and colors. */
function lerp(a, b, k) {
  return a + (b - a) * k;
}

/** Where a star is, what color, and how bright at time t. */
function place(s, t) {
  const home = s.home(t);
  const tw = 0.75 + 0.25 * Math.sin(t * 2.2 + s.twinkle);
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
    rgb: [lerp(GOLD[0], s.rgb[0], k), lerp(GOLD[1], s.rgb[1], k), lerp(GOLD[2], s.rgb[2], k)],
    a: lerp(lerp(0.15, GLYPH_ALPHA, ga), 0.9 * tw * s.bright, k),
    // Halos blur packed glyph stars into a smear; fade them while gathered, restore on scatter.
    glow: lerp(1 - ga * 0.8, 1, k),
  };
}

/** Paints one frame of the sky at time t (seconds since arrival). */
function draw(t) {
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#05040a";
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = progress(t, T.scatter, T.scatterDur * 1.4);
  ctx.drawImage(nebula, 0, 0);
  ctx.globalCompositeOperation = "lighter";

  for (const s of stars) {
    const p = place(s, t);
    const dx = mouse.x - p.x;
    const dy = mouse.y - p.y;
    const dist = Math.hypot(dx, dy);
    // Qi follows the visitor: nearby stars lean gently toward the cursor.
    if (dist < QI_RADIUS) {
      const pull = 0.12 * (1 - dist / QI_RADIUS);
      p.x += dx * pull;
      p.y += dy * pull;
    }
    if (s.size > 1.3 && p.glow > 0.01) {
      const r = s.size * (s.spike ? 9 : 5);
      ctx.globalAlpha = p.a * p.glow;
      ctx.drawImage(s.spike ? spikeFor(p.rgb) : glowFor(p.rgb), p.x - r, p.y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = p.a;
    ctx.fillStyle = `rgb(${p.rgb[0] | 0},${p.rgb[1] | 0},${p.rgb[2] | 0})`;
    ctx.fillRect(p.x - s.size / 2, p.y - s.size / 2, s.size, s.size);
  }
  ctx.globalAlpha = 1;
  greeting.classList.toggle("is-revealed", t >= T.reveal);
}

/** Animation loop; skips painting while scrolled away. Reduced-motion gets a still. */
function frame(now) {
  if (onScreen || reduced) draw(reduced ? END : (now - t0) / 1000);
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
});
window.addEventListener("pointerleave", () => {
  mouse.x = mouse.y = -1e4;
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
document.getElementById("replay").addEventListener("click", replay);

// Sampling before the brush font loads would trace a fallback face; wait, but never forever.
Promise.race([document.fonts.load(`200px ${GLYPH_FONT}`, "人皇"), new Promise((r) => setTimeout(r, 2500))])
  .catch(() => undefined)
  .then(() => {
    build();
    t0 = performance.now();
    requestAnimationFrame(frame);
  });
