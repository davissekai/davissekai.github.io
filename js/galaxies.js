/**
 * The star chart's sky (page 2): one galaxy per project, slow-turning over a
 * deep field of faint distant galaxies. Palette follows Hubble/Webb imagery:
 * cream cores, blue-white arms beaded with pink star-forming knots, near-black
 * space. Coordinates are canvas CSS px; the frame (the visible "screen") starts
 * `top` px down, below the zone where the arrival sky dissolves into this one.
 */

import { CORE, starFor } from "./galaxy-stars.js";

const WHITE = [236, 240, 255];

/**
 * One galaxy per project, positioned in frame fractions; size scales off the
 * frame's shorter side. Each takes a different form from Hubble's catalogue so
 * no two worlds look alike: a grand-design spiral, a golden three-armed one, a
 * patchy flocculent spiral, a disc seen edge-on, and a cloud still forming.
 * `knots` is the share of arm stars that are pink star-forming regions.
 */
export const GALAXIES = [
  { id: "two-eyes", form: "grand-design", x: 0.66, y: 0.42, r: 0.34, tilt: -0.5, squash: 0.5, arms: 2, share: 0.37, arm: [175, 205, 255], rim: [120, 150, 255], knots: 0.035 },
  { id: "atmo", form: "three-armed", x: 0.26, y: 0.34, r: 0.17, tilt: 0.7, squash: 0.6, arms: 3, share: 0.16, arm: [255, 214, 150], rim: [255, 180, 110], knots: 0.01 },
  // Many short, loosely wound arms blur into a patchy disc thick with new stars.
  { id: "venturequest", form: "flocculent", x: 0.84, y: 0.8, r: 0.12, tilt: 0.2, squash: 0.78, arms: 7, wind: 2.4, spread: 1.5, share: 0.1, arm: [196, 214, 255], rim: [150, 176, 255], knots: 0.16 },
  { id: "notify-crossx", form: "edge-on", x: 0.46, y: 0.82, r: 0.14, tilt: -0.18, squash: 0.02, share: 0.1, arm: [215, 225, 255], rim: [170, 190, 255], knots: 0.02 },
  { id: "carbon-markets", form: "forming", x: 0.14, y: 0.66, r: 0.13, tilt: 0.3, squash: 0.8, share: 0.08, arm: [190, 210, 255], rim: [160, 185, 255], knots: 0.05 },
];

// A few bright field stars get Webb-style diffraction glints.
const SPIKED = 8;

/** A galaxy's centre and radius in canvas px. */
function place(g, w, h, top) {
  return { cx: g.x * w, cy: top + g.y * h, R: g.r * Math.min(w, h) };
}

/**
 * Builds `count` sky stars for a canvas whose frame starts `top` px down.
 * @param {number} count
 * @param {number} w frame width (CSS px)
 * @param {number} h frame height (CSS px)
 * @param {() => number} random
 * @param {number} [top] height of the blend zone above the frame
 * @returns {{home: (t: number) => {x: number, y: number}, galaxy?: string, still?: boolean, spike?: boolean, rgb: number[], size: number, bright: number, twinkle: number}[]}
 */
export function buildSky(count, w, h, random, top = 0) {
  const stars = [];
  for (const g of GALAXIES) {
    const n = Math.round(count * g.share);
    const at = place(g, w, h, top);
    for (let i = 0; i < n; i++) stars.push(starFor(g, at, random));
  }
  for (let i = 0; stars.length < count; i++) stars.push(fieldStar(w, top + h, random, i < SPIKED));
  return stars;
}

/** Foreground star; static, twinkles only. Squared sizes keep most of them pinpoints. */
function fieldStar(w, h, random, spike) {
  const x = random() * w;
  const y = random() * h;
  return {
    home: () => ({ x, y }),
    // Still stars can be baked into a cached layer instead of repainted every frame.
    still: true,
    spike,
    rgb: spike ? [255, 236, 210] : WHITE,
    size: spike ? 2 + random() * 1 : 0.35 + Math.pow(random(), 2.2) * 1.2,
    bright: spike ? 1 : 0.35 + random() * 0.65,
    twinkle: random() * Math.PI * 2,
  };
}

/**
 * The project galaxy under a point, or null for empty sky. Picks the smallest
 * galaxy when they overlap, so a small one in front of a big one stays clickable.
 * @param {number} x canvas CSS px
 * @param {number} y canvas CSS px
 * @param {number} w
 * @param {number} h
 * @param {number} [top]
 * @returns {string | null}
 */
export function galaxyAt(x, y, w, h, top = 0) {
  let hit = null;
  let best = Infinity;
  for (const g of GALAXIES) {
    const { cx, cy, R } = place(g, w, h, top);
    const cos = Math.cos(-g.tilt);
    const sin = Math.sin(-g.tilt);
    const u = (x - cx) * cos - (y - cy) * sin;
    // Edge-on discs are a hairline thick; give them a fatter target so they can still be tapped.
    const v = ((x - cx) * sin + (y - cy) * cos) / Math.max(g.squash, 0.3);
    if (Math.hypot(u, v) <= R * 0.85 && R < best) {
      hit = g.id;
      best = R;
    }
  }
  return hit;
}

/**
 * A galaxy's visible rim, as a tilted ellipse in frame coordinates, for
 * annotating it. Trimmed inside the outermost stars, since the arms thin out
 * and the eye reads the galaxy's edge well inside them.
 * @param {string} id
 * @param {number} w frame width
 * @param {number} h frame height
 * @returns {{cx: number, cy: number, a: number, b: number, tilt: number}}
 */
export function galaxyShape(id, w, h) {
  const g = GALAXIES.find((g) => g.id === id);
  if (!g) throw new Error(`no galaxy called ${id}`);
  const { cx, cy, R } = place(g, w, h, 0);
  const a = R * (g.form === "forming" ? 0.6 : 0.8);
  return { cx, cy, a, b: a * g.squash, tilt: g.tilt };
}

/**
 * Faint distant galaxies for the deep-field backdrop, like the smudges behind Webb's first deep field.
 * @param {number} count
 * @param {number} w
 * @param {number} h frame height
 * @param {number} top
 * @param {() => number} random
 * @returns {{x: number, y: number, rx: number, ry: number, angle: number, rgb: number[], alpha: number}[]}
 */
export function distantGalaxies(count, w, h, top, random) {
  const tints = [[255, 150, 90], [255, 225, 190], [200, 215, 255]];
  return Array.from({ length: count }, () => {
    const rx = 1.2 + Math.pow(random(), 2) * 4.8;
    return {
      x: random() * w,
      y: random() * (top + h),
      rx,
      ry: rx * (0.35 + random() * 0.65),
      angle: random() * Math.PI,
      rgb: tints[Math.floor(random() * tints.length)],
      alpha: 0.15 + random() * 0.4,
    };
  });
}

/**
 * Paints the backdrop once into an offscreen canvas: near-black space, a soft
 * glow under each galaxy, and the distant smudges. Composited behind stars.
 * @param {number} w
 * @param {number} h frame height
 * @param {number} [top]
 * @returns {HTMLCanvasElement}
 */
export function paintNebula(w, h, top = 0) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = top + h;
  const ctx = c.getContext("2d");
  ctx.globalCompositeOperation = "lighter";
  for (const g of GALAXIES) {
    const { cx, cy, R } = place(g, w, h, top);
    // Diffuse disc light, drawn in the galaxy's own tilted, squashed plane. It's
    // symmetric, so it can stay baked while the stars above it turn.
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(g.tilt);
    ctx.scale(1, g.squash);
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.05);
    glow.addColorStop(0, `rgba(${CORE.join(",")},${g.form === "forming" ? 0.08 : 0.42})`);
    glow.addColorStop(0.1, `rgba(${CORE.join(",")},${g.form === "forming" ? 0.06 : 0.16})`);
    glow.addColorStop(0.45, `rgba(${g.arm.join(",")},0.06)`);
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(-R * 1.1, -R * 1.1, R * 2.2, R * 2.2);
    ctx.restore();
  }
  for (const d of distantGalaxies(Math.round((w * (top + h)) / 9000), w, h, top, Math.random)) {
    ctx.globalAlpha = d.alpha;
    ctx.fillStyle = `rgb(${d.rgb.join(",")})`;
    ctx.beginPath();
    ctx.ellipse(d.x, d.y, d.rx, d.ry, d.angle, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  return c;
}
