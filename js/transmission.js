/**
 * Transmission (page 3): past the star chart the sky thins to near-black and
 * one pulsar beats. Each beat sends a gravitational ripple outward: as a
 * wavefront passes, the stars it crosses are shoved out, drawn back, and
 * briefly brightened, so the ripple shows only as bending starlight.
 * The void and haze are baked; the few hundred stars are drawn
 * live so the ripples (and the cursor's warp) can move them. Animates only
 * while on screen; reduced motion gets a still frame.
 */
import { rippleAt, ringsAt, beat, pulsarPlace, fieldStars } from "./pulsar.js";
import { paintStar } from "./sprites.js";
import { createLayer, blitLayer } from "./star-layers.js";
import { pull, OFF } from "./warp.js";
import { whenNeeded } from "./when-needed.js";

const VOID = "#05040a";
const PULSAR = { size: 3.2, spike: true };
const PULSAR_RGB = [226, 234, 255];

const canvas = document.getElementById("transmission-sky");
const ctx = canvas.getContext("2d", { alpha: false });
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const t0 = performance.now();

let w = 0;
let h = 0;
let dpr = 1;
let place = null;
let backdrop = null;
let stars = [];
const mouse = { ...OFF };
let onScreen = false;

/** (Re)builds the sky for the section's current size. */
function build() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  w = canvas.clientWidth;
  h = canvas.clientHeight;
  // A hidden page (zero-size viewport) has nothing to paint; the resize on reveal rebuilds.
  if (!w || !h) return;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  place = pulsarPlace(w, h);

  backdrop = createLayer(w, h, dpr);
  const b = backdrop.ctx;
  b.fillStyle = VOID;
  b.fillRect(0, 0, w, h);
  // A cool haze around the pulsar, like the nebula a dead star leaves behind.
  const haze = b.createRadialGradient(place.x, place.y, 0, place.x, place.y, place.reach * 1.1);
  haze.addColorStop(0, "rgba(120, 140, 230, 0.16)");
  haze.addColorStop(0.35, "rgba(90, 80, 170, 0.07)");
  haze.addColorStop(1, "rgba(0, 0, 0, 0)");
  b.fillStyle = haze;
  b.fillRect(0, 0, w, h);

  // Stars everywhere, plus a denser swarm within the ripples' reach so each wavefront has light to bend.
  const field = fieldStars(Math.round((w * h) / 2400), w, h, Math.random);
  const side = place.reach * 2;
  const swarm = fieldStars(Math.round(place.reach * 1.6), side, side, Math.random)
    .map((s) => ({ ...s, spike: false, size: 0.55 + Math.random() * 0.6, x: s.x + place.x - place.reach, y: s.y + place.y - place.reach }))
    .filter((s) => Math.hypot(s.x - place.x, s.y - place.y) < place.reach && s.x >= 0 && s.x <= w && s.y >= 0 && s.y <= h);
  stars = field.concat(swarm).map((s) => {
    const dx = s.x - place.x;
    const dy = s.y - place.y;
    const d = Math.hypot(dx, dy) || 1;
    return { ...s, d, ux: dx / d, uy: dy / d };
  });
  draw((performance.now() - t0) / 1000);
  canvas.classList.add("is-built");
}

/** Draws the sky at time t (s): stars bent by the ripples and the cursor, and the pulsar. */
function draw(t) {
  blitLayer(ctx, backdrop.canvas, dpr);
  ctx.globalCompositeOperation = "lighter";
  const flare = beat(t);
  const rings = ringsAt(t);
  for (const s of stars) {
    const rip = rippleAt(s.d, t, place.reach, rings);
    const p = pull({ x: s.x + s.ux * rip.shift, y: s.y + s.uy * rip.shift }, mouse);
    paintStar(ctx, s, p.x, p.y, s.rgb, Math.min(1, 0.75 * s.bright * rip.glow));
  }
  paintStar(ctx, PULSAR, place.x, place.y, PULSAR_RGB, 0.6 + 0.4 * flare, 0.7 + flare);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

/** Animation loop; idles while the section is scrolled out of view. */
function frame(now) {
  if (onScreen && backdrop) draw((now - t0) / 1000);
  requestAnimationFrame(frame);
}

new IntersectionObserver(([entry]) => {
  onScreen = entry.isIntersecting;
}).observe(canvas);

window.addEventListener("pointermove", (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
  if (reduced && backdrop) draw((performance.now() - t0) / 1000);
});
document.documentElement.addEventListener("pointerleave", () => Object.assign(mouse, OFF));

let resizeTimer = 0;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  // Before its first build the section has nothing to resize.
  resizeTimer = setTimeout(() => backdrop && build(), 200);
});

// Built a screen before the visitor reaches it, or once the arrival settles, not at load.
whenNeeded(canvas, build, "100% 0px");
if (!reduced) requestAnimationFrame(frame);
