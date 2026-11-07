/**
 * Cached star sprites for the sky canvas. Each is tinted to its star's color;
 * colors are rounded to steps of 32 so the cache stays small (≤729 per kind).
 */

const glows = new Map();
const spikes = new Map();

/** Rounds an RGB triplet into a cache key / CSS color body like "224,224,255". */
function colorKey(rgb) {
  return rgb.map((v) => Math.min(255, Math.round(v / 32) * 32)).join(",");
}

/** Returns the cached sprite for `rgb`, painting it with `paint` on first use. */
function cached(cache, rgb, size, paint) {
  const key = colorKey(rgb);
  let c = cache.get(key);
  if (!c) {
    c = document.createElement("canvas");
    c.width = c.height = size;
    paint(c.getContext("2d"), key, size);
    cache.set(key, c);
  }
  return c;
}

/**
 * Paints one star: a halo (or glint, for spiked stars) on the bigger ones, then
 * a crisp core. Shared by every sky layer so baked and live stars look identical.
 * Expects the context to be in "lighter" compositing at CSS-px scale.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ size: number, spike?: boolean }} star
 * @param {number} x
 * @param {number} y
 * @param {number[]} rgb
 * @param {number} alpha
 * @param {number} [glow] halo strength multiplier
 * @param {number} [scale] size multiplier, for stars seen up close (zoomed in)
 */
export function paintStar(ctx, star, x, y, rgb, alpha, glow = 1, scale = 1) {
  const size = star.size * scale;
  if (size > 1.3 && glow > 0.01) {
    const r = size * (star.spike ? 9 : 5);
    ctx.globalAlpha = alpha * glow;
    ctx.drawImage(star.spike ? spikeFor(rgb) : glowFor(rgb), x - r, y - r, r * 2, r * 2);
  }
  ctx.globalAlpha = alpha;
  ctx.fillStyle = `rgb(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0})`;
  ctx.fillRect(x - size / 2, y - size / 2, size, size);
}

/**
 * A soft round halo in the star's color.
 * @param {number[]} rgb
 * @returns {HTMLCanvasElement}
 */
export function glowFor(rgb) {
  return cached(glows, rgb, 32, (g, key) => {
    const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, `rgba(${key},0.6)`);
    grad.addColorStop(1, `rgba(${key},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, 32, 32);
  });
}

/**
 * A four-point diffraction glint, like bright stars in a long-exposure photo.
 * @param {number[]} rgb
 * @returns {HTMLCanvasElement}
 */
export function spikeFor(rgb) {
  return cached(spikes, rgb, 64, (g, key) => {
    const mid = 32;
    const across = g.createLinearGradient(0, 0, 64, 0);
    const down = g.createLinearGradient(0, 0, 0, 64);
    for (const grad of [across, down]) {
      grad.addColorStop(0, `rgba(${key},0)`);
      grad.addColorStop(0.5, `rgba(${key},0.85)`);
      grad.addColorStop(1, `rgba(${key},0)`);
    }
    g.fillStyle = across;
    g.fillRect(0, mid - 0.6, 64, 1.2);
    g.fillStyle = down;
    g.fillRect(mid - 0.6, 0, 1.2, 64);
    const core = g.createRadialGradient(mid, mid, 0, mid, mid, 9);
    core.addColorStop(0, `rgba(${key},0.9)`);
    core.addColorStop(1, `rgba(${key},0)`);
    g.fillStyle = core;
    g.fillRect(0, 0, 64, 64);
  });
}
