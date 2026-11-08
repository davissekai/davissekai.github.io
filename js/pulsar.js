/**
 * The transmission page's sky (page 3): near-black space past the star chart,
 * and one pulsar beating slowly, each beat sending a gravitational ripple
 * outward that bends the starlight it passes through. Pure timing, layout and
 * wave shape, so it's testable without a canvas.
 */

// Seconds between beats: slow enough to feel like breathing, not blinking.
export const PERIOD = 2.4;
// Seconds a ripple lives while it spreads and fades; three are in flight at once.
export const LIFE = PERIOD * 3;
// Furthest a ripple shoves a star (CSS px), and how wide its wavefront is.
export const RIPPLE_MAX = 7;
const FRONT = 14;
// A few bright field stars get diffraction glints; the rest stay pinpoints.
const SPIKED = 4;

/**
 * The ripples in flight at time t (s), newest first. The pulsar was beating
 * long before the visitor arrived, so the sky is never still for long.
 * @param {number} t
 * @returns {{progress: number, alpha: number}[]} progress 0 (just left) to 1 (gone)
 */
export function ringsAt(t) {
  if (t < 0) return [];
  const rings = [];
  const age0 = t % PERIOD;
  for (let age = age0; age < LIFE; age += PERIOD) {
    const progress = age / LIFE;
    // Squared falloff: bright as it leaves, gone by the time it reaches its full spread.
    rings.push({ progress, alpha: Math.pow(1 - progress, 2) });
  }
  return rings;
}

/**
 * How the ripples bend space `d` px from the pulsar at time t. Each wavefront
 * shoves stars just ahead of it outward and draws those just behind back in
 * (a derivative-of-Gaussian profile), weakening as it spreads, and briefly
 * brightens the stars it carries, like light focused by the bend.
 * @param {number} d distance from the pulsar (CSS px)
 * @param {number} t time (s)
 * @param {number} reach how far ripples spread before they're gone (CSS px)
 * @param {{progress: number, alpha: number}[]} [rings] ringsAt(t), passed in when bending many stars in one frame
 * @returns {{shift: number, glow: number}} radial shift (px, outward positive) and brightness multiplier
 */
export function rippleAt(d, t, reach, rings = ringsAt(t)) {
  let shift = 0;
  let glow = 1;
  for (const r of rings) {
    const x = (d - (6 + r.progress * reach)) / FRONT;
    const bell = Math.exp(-(x * x) / 2);
    // x * e^(1/2 - x²/2) peaks at exactly 1 one front-width ahead, so RIPPLE_MAX is the true maximum.
    shift += RIPPLE_MAX * r.alpha * x * Math.exp(0.5) * bell;
    glow += 1.3 * r.alpha * bell;
  }
  return { shift, glow };
}

/**
 * The pulsar's brightness at time t: a flare on each beat, decaying fast.
 * @param {number} t
 * @returns {number} 0..1
 */
export function beat(t) {
  const phase = (((t % PERIOD) + PERIOD) % PERIOD) / PERIOD;
  return Math.exp(-phase * 8);
}

/**
 * Where the pulsar sits and how far its rings spread. Wide screens: right of
 * the text. Phones: centred above it.
 * @param {number} w
 * @param {number} h
 * @returns {{x: number, y: number, reach: number}}
 */
export function pulsarPlace(w, h) {
  if (w >= 700) return { x: 0.74 * w, y: 0.46 * h, reach: 0.42 * Math.min(w, h) };
  return { x: w / 2, y: 0.27 * h, reach: 0.55 * w };
}

/**
 * Background stars for the transmission sky: sparse pinpoints, a few glints.
 * @param {number} count
 * @param {number} w
 * @param {number} h
 * @param {() => number} random
 * @returns {{x: number, y: number, size: number, bright: number, spike: boolean, rgb: number[]}[]}
 */
export function fieldStars(count, w, h, random) {
  return Array.from({ length: count }, (_, i) => {
    const spike = i < SPIKED;
    return {
      x: random() * w,
      y: random() * h,
      // Squared so most are pinpoints, and kept under the 1.3px halo size so none blur.
      size: spike ? 2 + random() : 0.35 + Math.pow(random(), 2.2) * 0.9,
      bright: spike ? 1 : 0.3 + random() * 0.6,
      spike,
      rgb: random() < 0.12 ? [255, 216, 232] : [228, 234, 255],
    };
  });
}
