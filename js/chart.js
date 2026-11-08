/**
 * Star chart (page 2): one slow-turning galaxy per project over a deep field.
 * Animates only while its own screen is in view (its top edge also shows,
 * still, through the arrival's fading bottom); reduced-motion gets a still.
 * Pointing at a galaxy lights its label; clicking flies into it to visit its world.
 * Stars near the cursor lean toward it (warp.js), galaxy stars included.
 *
 * Painting ~6000 stars every frame stutters on ordinary devices, so the sky is
 * layered: still field stars and the nebula are baked once; the turning
 * galaxies are repainted into a back buffer a slice per frame and swapped in
 * when complete (they move under 4px a second, so a few frames' lag is
 * invisible); only a few hundred field stars twinkle live each frame.
 */
import { buildSky, paintNebula, galaxyAt, galaxyShape } from "./galaxies.js";
import { paintStar } from "./sprites.js";
import { splitLive, createLayer, blitLayer } from "./star-layers.js";
import { pull, warpPatch, OFF } from "./warp.js";
import { createChartWarp } from "./chart-warp.js";
import { createFrameBudget } from "./frame-budget.js";
import { placeLabels, openWorld, markNear } from "./worlds.js";
import { focusView, viewAt, createFlight } from "./visit.js";
import { paintZoomed } from "./zoomed-sky.js";

// Frames per galaxy refresh at full quality; slower devices stretch it.
const BASE_CYCLE = 3;
const VOID = "#05040a";

const canvas = document.getElementById("chart");
const frameEl = document.getElementById("chart-frame");
const ctx = canvas.getContext("2d", { alpha: false });
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const budget = createFrameBudget();
const flight = createFlight(reduced ? 0 : 1100);

let w = 0;
// Frame height, and the blend zone above it; the canvas is top + h tall.
let h = 0;
let top = 0;
let dpr = 1;
let galaxy = [];
let live = [];
let still = null;
// The sky without stars, which the cursor's warp repaints over, and the warp itself.
let bare = null;
let warp = null;
const mouse = { ...OFF };
let front = null;
let back = null;
// Progress of the back buffer's repaint: next star index, and the time it shows.
let cursor = 0;
let cycleT = 0;
let onScreen = false;
// The world being visited (or last visited, while flying back), its landed view, and its stars.
let visiting = null;
let landed = null;
let focus = [];
let fullH = 0;
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
  fullH = canvas.clientHeight;
  // A hidden page (zero-size viewport) has nothing to paint; the resize on reveal rebuilds.
  if (!w || !h) return;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(fullH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const stars = buildSky(w < 700 ? 2600 : 6000, w, h, Math.random, top);
  galaxy = stars.filter((s) => !s.still);
  const split = splitLive(stars.filter((s) => s.still), w < 700 ? 120 : 240, Math.random);
  live = split.live;

  const nebula = paintNebula(w, h, top);
  bare = createLayer(w, fullH, dpr);
  bare.ctx.fillStyle = VOID;
  bare.ctx.fillRect(0, 0, w, fullH);
  bare.ctx.drawImage(nebula, 0, 0);
  warp = createChartWarp({ galaxy, baked: split.baked, w, h, top });

  still = createLayer(w, fullH, dpr);
  blitLayer(still.ctx, bare.canvas, dpr);
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
  if (visiting) aim(visiting);
  render(performance.now());
  placeLabels(w, h);
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

/** Shows the latest galaxies, the cursor's warp, and the live twinkling stars at time t. */
function draw(t) {
  blitLayer(ctx, front.canvas, dpr);
  warpPatch(ctx, { mouse, w, h: fullH, dpr, backdrop: bare.canvas, paint: () => warp.paint(ctx, t, mouse, alphaAt) });
  ctx.globalCompositeOperation = "lighter";
  for (const s of live) {
    const p = pull(s.home(t), mouse);
    paintStar(ctx, s, p.x, p.y, s.rgb, alphaAt(s, t));
  }
  ctx.globalAlpha = 1;
}

/** Points the flight at a galaxy for the current canvas size. */
function aim(id) {
  landed = focusView(galaxyShape(id, w, h), w, h);
  focus = galaxy.filter((s) => s.galaxy === id);
}

/** Paints the chart as it stands at `now`: plain, or flown some way into a galaxy. */
function render(now) {
  const t = (now - t0) / 1000;
  const p = flight.at(now);
  if (p <= 0 || !landed) return draw(t);
  paintZoomed(ctx, { dpr, w, fullH, top, still: still.canvas, front: front.canvas, focus, live, view: viewAt(landed, p), p, t, alphaAt, quality: budget.quality });
}

/** Animation loop; idles while the chart is scrolled out of view. */
function frame(now) {
  if (onScreen && front) {
    const start = performance.now();
    advanceGalaxies((now - t0) / 1000);
    render(now);
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

/** True while the sky is zoomed (or zooming), when chart coordinates don't match the screen. */
function flown() {
  return flight.at(performance.now()) > 0;
}

canvas.addEventListener("pointermove", (e) => {
  if (flown()) return;
  const id = galaxyUnder(e);
  canvas.style.cursor = id ? "pointer" : "";
  markNear(id);
});
canvas.addEventListener("pointerleave", () => markNear(null));
canvas.addEventListener("click", (e) => {
  if (flown()) return;
  const id = galaxyUnder(e);
  if (id) openWorld(id);
});

// worlds.js announces visits (an id) and returns (null); fly to match.
document.addEventListener("world:visit", (e) => {
  if (e.detail) {
    visiting = e.detail;
    aim(visiting);
  }
  flight.go(e.detail ? 1 : 0, performance.now());
  canvas.style.cursor = "";
  if (reduced && front) render(performance.now());
});

// The warp follows the pointer anywhere over the chart, labels included.
window.addEventListener("pointermove", (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
});
document.documentElement.addEventListener("pointerleave", () => Object.assign(mouse, OFF));

let resizeTimer = 0;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    build();
  }, 200);
});

build();
if (!reduced) requestAnimationFrame(frame);
