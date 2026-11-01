/**
 * Star chart (page 2): slow-turning spiral galaxies over soft nebula dust.
 * Paints only while the section is on screen; reduced-motion gets a still.
 */
import { buildSky, paintNebula } from "../js/galaxies.js";
import { glowFor } from "../js/sprites.js";

const canvas = document.getElementById("chart");
const ctx = canvas.getContext("2d", { alpha: false });
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let w = 0;
let h = 0;
let stars = [];
let nebula = null;
let onScreen = false;
const t0 = performance.now();

/** (Re)builds the galaxies for the section's current size. */
function build() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  w = canvas.clientWidth;
  h = canvas.clientHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  stars = buildSky(w < 700 ? 2600 : 6000, w, h, Math.random);
  nebula = paintNebula(w, h);
}

/** Paints the galaxies at time t (seconds since load). */
function draw(t) {
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#05040a";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(nebula, 0, 0);
  ctx.globalCompositeOperation = "lighter";
  for (const s of stars) {
    const p = s.home(t);
    const a = (0.75 + 0.25 * Math.sin(t * 2.2 + s.twinkle)) * 0.9 * s.bright;
    if (s.size > 1.3) {
      const r = s.size * 5;
      ctx.globalAlpha = a;
      ctx.drawImage(glowFor(s.rgb), p.x - r, p.y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = a;
    ctx.fillStyle = `rgb(${s.rgb[0] | 0},${s.rgb[1] | 0},${s.rgb[2] | 0})`;
    ctx.fillRect(p.x - s.size / 2, p.y - s.size / 2, s.size, s.size);
  }
  ctx.globalAlpha = 1;
}

/** Animation loop; idles while the chart is scrolled out of view. */
function frame(now) {
  if (onScreen) draw((now - t0) / 1000);
  requestAnimationFrame(frame);
}

new IntersectionObserver(([entry]) => {
  onScreen = entry.isIntersecting;
}).observe(canvas);

let resizeTimer = 0;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    build();
    if (reduced) draw(0);
  }, 200);
});

build();
if (reduced) draw(0);
else requestAnimationFrame(frame);
