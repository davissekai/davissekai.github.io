/**
 * Star chart (page 2): one slow-turning galaxy per project over a deep field.
 * Animates only while its own screen is in view (its top edge also shows,
 * still, through the arrival's fading bottom); reduced-motion gets a still.
 * Pointing at a galaxy lights its label; clicking opens its world.
 *
 * Painting ~6000 stars every frame stutters on ordinary devices, so the sky is
 * layered: still field stars and the nebula are baked once; the turning
 * galaxies are repainted into a back buffer a slice per frame and swapped in
 * when complete (they move under 4px a second, so a few frames' lag is
 * invisible); only a few hundred field stars twinkle live each frame.
 */
import { buildSky, paintNebula, galaxyAt } from "./galaxies.js";
import { paintStar } from "./sprites.js";
import { splitLive, createLayer, blitLayer } from "./star-layers.js";
import { createFrameBudget } from "./frame-budget.js";
import { placeLabels, openWorld, markNear } from "./worlds.js";

// Frames per galaxy refresh at full quality; slower devices stretch it.
const BASE_CYCLE = 3;
const VOID = "#05040a";

const canvas = document.getElementById("chart");
const frameEl = document.getElementById("chart-frame");
const ctx = canvas.getContext("2d", { alpha: false });
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const budget = createFrameBudget();

let w = 0;
// Frame height, and the blend zone above it; the canvas is top + h tall.
let h = 0;
let top = 0;
let dpr = 1;
let galaxy = [];
let live = [];
let still = null;
let front = null;
let back = null;
// Progress of the back buffer's repaint: next star index, and the time it shows.
let cursor = 0;
let cycleT = 0;
let onScreen = false;
const t0 = performance.now();

/** Twinkling brightness of a star at time t. */
function alphaAt(s, t) {
  return (0.75 + 0.25 * Math.sin(t * 2.2 + s.twinkle)) * 0.9 * s.bright;
}

/** (Re)builds the galaxies and every cached layer for the section's current size. */
function build() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  w = canvas.clientWidth;
  top = frameEl.offsetTop;
  h = frameEl.clientHeight;
  const fullH = canvas.clientHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(fullH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const stars = buildSky(w < 700 ? 2600 : 6000, w, h, Math.random, top);
  galaxy = stars.filter((s) => !s.still);
  const split = splitLive(stars.filter((s) => s.still), w < 700 ? 120 : 240, Math.random);
  live = split.live;

  still = createLayer(w, fullH, dpr);
  still.ctx.fillStyle = VOID;
  still.ctx.fillRect(0, 0, w, fullH);
  still.ctx.drawImage(paintNebula(w, h, top), 0, 0);
  still.ctx.globalCompositeOperation = "lighter";
  // Baked at the twinkle's mean so the layer matches the live stars' average glow.
  for (const s of split.baked) {
    const p = s.home(0);
    paintStar(still.ctx, s, p.x, p.y, s.rgb, 0.675 * s.bright);
  }

  front = createLayer(w, fullH, dpr);
  back = createLayer(w, fullH, dpr);
  const t = (performance.now() - t0) / 1000;
  startCycle(front.ctx, t);
  paintGalaxySlice(front.ctx, galaxy.length);
  startCycle(back.ctx, t);
  draw(t);
  placeLabels(w, h, top);
}

/** Begins a fresh galaxy repaint into `layerCtx`, frozen at time t. */
function startCycle(layerCtx, t) {
  blitLayer(layerCtx, still.canvas, dpr);
  layerCtx.globalCompositeOperation = "lighter";
  cursor = 0;
  cycleT = t;
}

/** Paints the next `count` galaxy stars into `layerCtx` at the cycle's time. */
function paintGalaxySlice(layerCtx, count) {
  const end = Math.min(galaxy.length, cursor + count);
  for (; cursor < end; cursor++) {
    const s = galaxy[cursor];
    const p = s.home(cycleT);
    paintStar(layerCtx, s, p.x, p.y, s.rgb, alphaAt(s, cycleT));
  }
}

/** Advances the back buffer one slice, swapping it in once complete. */
function advanceGalaxies(t) {
  const cycle = Math.ceil(BASE_CYCLE / budget.quality);
  paintGalaxySlice(back.ctx, Math.ceil(galaxy.length / cycle));
  if (cursor < galaxy.length) return;
  [front, back] = [back, front];
  startCycle(back.ctx, t);
}

/** Shows the latest galaxies plus the live twinkling stars at time t. */
function draw(t) {
  blitLayer(ctx, front.canvas, dpr);
  ctx.globalCompositeOperation = "lighter";
  for (const s of live) {
    const p = s.home(t);
    paintStar(ctx, s, p.x, p.y, s.rgb, alphaAt(s, t));
  }
  ctx.globalAlpha = 1;
}

/** Animation loop; idles while the chart is scrolled out of view. */
function frame(now) {
  if (onScreen) {
    const start = performance.now();
    const t = (now - t0) / 1000;
    advanceGalaxies(t);
    draw(t);
    budget.record(performance.now() - start);
  }
  requestAnimationFrame(frame);
}

new IntersectionObserver(([entry]) => {
  onScreen = entry.isIntersecting;
}).observe(frameEl);

/** The project galaxy under a pointer event, if any. */
function galaxyUnder(e) {
  const rect = canvas.getBoundingClientRect();
  return galaxyAt(e.clientX - rect.left, e.clientY - rect.top, w, h, top);
}

canvas.addEventListener("pointermove", (e) => {
  const id = galaxyUnder(e);
  canvas.style.cursor = id ? "pointer" : "";
  markNear(id);
});
canvas.addEventListener("pointerleave", () => markNear(null));
canvas.addEventListener("click", (e) => {
  const id = galaxyUnder(e);
  if (id) openWorld(id);
});

let resizeTimer = 0;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    build();
  }, 200);
});

build();
if (!reduced) requestAnimationFrame(frame);
