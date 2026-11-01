/**
 * Turns rendered glyphs (人皇, the seal) into star destinations.
 * Pure functions so the shape logic is testable without a canvas.
 */

const ALPHA_THRESHOLD = 128;

/**
 * Scans an RGBA buffer on a grid of `step` px and returns cells whose alpha is
 * solidly inked. Skipping anti-aliased edges keeps the formed characters crisp.
 * @param {Uint8ClampedArray} data RGBA pixels (ImageData.data)
 * @param {number} width
 * @param {number} height
 * @param {number} step grid spacing in px; larger = fewer, sparser stars
 * @returns {{x: number, y: number}[]}
 */
export function sampleInkedPoints(data, width, height, step) {
  if (data.length !== width * height * 4) {
    throw new RangeError("pixel buffer does not match width × height");
  }
  if (!(step >= 1)) throw new RangeError("step must be >= 1");

  const points = [];
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      if (data[(y * width + x) * 4 + 3] >= ALPHA_THRESHOLD) points.push({ x, y });
    }
  }
  return points;
}

/**
 * Assigns `n` stars to points from `pool`. Every pool point is used once before
 * any repeats, so the glyph fills evenly instead of clumping on random picks.
 * @param {{x: number, y: number}[]} pool
 * @param {number} n
 * @param {() => number} random injectable RNG in [0, 1)
 * @returns {{x: number, y: number}[]}
 */
export function pickTargets(pool, n, random) {
  if (pool.length === 0) return [];
  const out = [];
  while (out.length < n) {
    const round = pool.slice();
    // Fisher–Yates so each round is an unbiased permutation.
    for (let i = round.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [round[i], round[j]] = [round[j], round[i]];
    }
    out.push(...round.slice(0, n - out.length));
  }
  return out;
}
