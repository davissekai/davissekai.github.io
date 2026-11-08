/**
 * The Domain's sky layout: one dust lane running corner to corner with a hot
 * core, and the stars that settle across it after 人皇 scatters.
 */

/** The lane in viewport fractions; nebula.js paints along the same line. */
// The core sits upper-right of centre so the greeting (lower-left) falls on the lane's dark side.
export const BAND = { x0: 0, y0: 0.14, x1: 1, y1: 0.76, core: { x: 0.6, y: 0.51 }, width: 0.12 };

const WHITE = [236, 242, 255];
const BLUSH = [255, 216, 232];
const LANE_SHARE = 0.45;
const SPIKED = 14;

/** Gaussian-ish noise from three uniforms; cheap and good enough for scatter. */
function gauss(random) {
  return (random() + random() + random() - 1.5) / 1.5;
}

/**
 * Signed perpendicular distance from the lane's centre line, in units of the
 * viewport's shorter side. Positive is the upper side, where the teal gas sits.
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @returns {number}
 */
export function bandDistance(x, y, w, h) {
  const dx = (BAND.x1 - BAND.x0) * w;
  const dy = (BAND.y1 - BAND.y0) * h;
  const len = Math.hypot(dx, dy);
  return ((x - BAND.x0 * w) * dy - (y - BAND.y0 * h) * dx) / len / Math.min(w, h);
}

/**
 * Builds `count` stars for a viewport: about half crowd the lane, the rest
 * scatter evenly, and a few become bright spiked glints.
 * @param {number} count
 * @param {number} w viewport width (CSS px)
 * @param {number} h viewport height (CSS px)
 * @param {() => number} random
 * @returns {{home: (t: number) => {x: number, y: number}, rgb: number[], size: number, bright: number, spike: boolean, twinkle: number}[]}
 */
export function buildSky(count, w, h, random) {
  const stars = [];
  for (let i = 0; i < count; i++) {
    const pos = i < count * LANE_SHARE ? lanePosition(w, h, random) : null;
    stars.push(makeStar(pos ?? { x: random() * w, y: random() * h }, w, h, random, i < SPIKED));
  }
  return stars;
}

/** A point scattered around the lane's centre line, or null if it lands off-screen. */
function lanePosition(w, h, random) {
  const dx = (BAND.x1 - BAND.x0) * w;
  const dy = (BAND.y1 - BAND.y0) * h;
  const len = Math.hypot(dx, dy);
  const t = random();
  const off = gauss(random) * BAND.width * 1.4 * Math.min(w, h);
  const x = BAND.x0 * w + dx * t + (dy / len) * off;
  const y = BAND.y0 * h + dy * t - (dx / len) * off;
  return x >= 0 && x <= w && y >= 0 && y <= h ? { x, y } : null;
}

/** One static star; stars near the core blush pink, and spiked ones are big and full-bright. */
function makeStar({ x, y }, w, h, random, spike) {
  const r = Math.hypot(x - BAND.core.x * w, y - BAND.core.y * h) / Math.min(w, h);
  const warm = random() < 0.1 + 0.6 * Math.exp(-Math.pow(r / 0.3, 2));
  return {
    home: () => ({ x, y }),
    rgb: warm ? BLUSH : WHITE,
    // Squared so most stars are pinpoints. Ordinary stars stay under the 1.3px halo threshold: haloed
    // stars read as blur on the hero, so only the spiked glints carry light beyond their core.
    size: spike ? 2.2 + random() * 1.2 : 0.35 + Math.pow(random(), 2.2) * 0.9,
    bright: spike ? 1 : 0.35 + random() * 0.65,
    spike,
    twinkle: random() * Math.PI * 2,
  };
}
