/**
 * Procedural nebula behind the Domain, in Hubble/Webb colours: blue-violet gas
 * billowing above a lane of pink hydrogen glow (star formation), dark dust
 * masses, and a white-hot core. Painted once per viewport.
 */
import { BAND, bandDistance } from "./sky.js";

const BASE = [5, 4, 12];
const GAS = [34, 54, 118];
const GAS_LIT = [132, 158, 236];
const HYDROGEN = [124, 34, 84];
const HALO = [78, 74, 150];
const CORE = [236, 230, 255];
// Noise is evaluated on a coarse grid and upscaled; the blur reads as soft gas.
const SCALE = 4;

/** Integer lattice hash → [0, 1). */
function hash(ix, iy, seed) {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Value noise in [0, 1) with smoothstep interpolation between lattice points. */
function valueNoise(x, y, seed) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy, seed);
  const b = hash(ix + 1, iy, seed);
  const c = hash(ix, iy + 1, seed);
  const d = hash(ix + 1, iy + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/**
 * Fractal noise in [0, 1]: octaves of value noise, each finer and fainter.
 * @param {number} x
 * @param {number} y
 * @param {number} seed
 * @param {number} [octaves]
 * @returns {number}
 */
export function fbm(x, y, seed, octaves = 5) {
  let sum = 0;
  let norm = 0;
  let amp = 0.5;
  let f = 1;
  for (let o = 0; o < octaves; o++) {
    sum += amp * valueNoise(x * f, y * f, seed + o * 101);
    norm += amp;
    amp *= 0.5;
    f *= 2.03;
  }
  return sum / norm;
}

/** Hermite ramp from 0 at `a` to 1 at `b`. */
function smooth(a, b, v) {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/**
 * Nebula color at one viewport point.
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {number} seed
 * @returns {number[]} RGB, each 0..255
 */
export function nebulaColor(x, y, w, h, seed) {
  const unit = Math.min(w, h);
  const u = x / unit;
  const v = y / unit;
  const d = bandDistance(x, y, w, h);
  const r = Math.hypot(x - BAND.core.x * w, y - BAND.core.y * h) / unit;
  const cloud = fbm(u * 2.2, v * 2.2, seed);
  const detail = fbm(u * 6, v * 6, seed + 31, 4);
  const dust = fbm(u * 3 + 7.3, v * 3 - 2.1, seed + 77);

  // Gas billows on the upper side of the lane and thins out quickly below it.
  const reach = d > -0.06 ? Math.exp(-Math.pow(Math.max(0, d) / 0.7, 2)) : Math.exp(-Math.pow((d + 0.06) / 0.1, 2));
  const gas = smooth(0.32, 0.72, cloud * 0.75 + detail * 0.25) * reach;
  const lane = Math.exp(-Math.pow(d / BAND.width, 2)) * smooth(0.3, 0.72, detail * 0.6 + cloud * 0.4);
  const halo = Math.exp(-Math.pow(r / 0.28, 2));
  const core = Math.exp(-Math.pow(r / 0.035, 2));
  // Dark dust masses swallow the light, but the core burns through them.
  const shadow = 1 - 0.88 * smooth(0.5, 0.7, dust) * (1 - halo * 0.7);

  const rgb = [0, 0, 0];
  for (let c = 0; c < 3; c++) {
    const gasC = GAS[c] + (GAS_LIT[c] - GAS[c]) * halo;
    const lit = (gas * gasC + lane * HYDROGEN[c] + halo * HALO[c] * 0.6) * shadow;
    rgb[c] = Math.min(255, BASE[c] + lit + core * CORE[c]);
  }
  return rgb;
}

/**
 * Paints the nebula into an offscreen canvas the size of the viewport.
 * @param {number} w
 * @param {number} h
 * @param {number} [seed]
 * @returns {HTMLCanvasElement}
 */
export function paintNebula(w, h, seed = 7) {
  const lw = Math.max(1, Math.ceil(w / SCALE));
  const lh = Math.max(1, Math.ceil(h / SCALE));
  const small = document.createElement("canvas");
  small.width = lw;
  small.height = lh;
  const sctx = small.getContext("2d");
  const img = sctx.createImageData(lw, lh);
  for (let j = 0; j < lh; j++) {
    for (let i = 0; i < lw; i++) {
      const rgb = nebulaColor(i * SCALE, j * SCALE, w, h, seed);
      const k = (j * lw + i) * 4;
      img.data[k] = rgb[0];
      img.data[k + 1] = rgb[1];
      img.data[k + 2] = rgb[2];
      img.data[k + 3] = 255;
    }
  }
  sctx.putImageData(img, 0, 0);
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(small, 0, 0, lw * SCALE, lh * SCALE);
  return out;
}
