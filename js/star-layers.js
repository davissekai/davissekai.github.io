/**
 * Splits a sky into a "baked" layer, painted once into an offscreen canvas,
 * and a small "live" layer repainted every frame. Painting thousands of stars
 * per frame is what makes the skies stutter on ordinary devices; baking most of
 * them turns that into one image copy plus a few hundred live stars.
 */

/**
 * Picks the stars that stay live (twinkling each frame); the rest get baked.
 * Spiked glints are always live: they're the brightest and their twinkle reads most.
 * @template {{ spike?: boolean }} S
 * @param {S[]} stars
 * @param {number} liveCount how many live stars to aim for (spikes may push past it)
 * @param {() => number} random
 * @returns {{ live: S[], baked: S[] }}
 */
export function splitLive(stars, liveCount, random) {
  const live = stars.filter((s) => s.spike);
  const rest = stars.filter((s) => !s.spike);
  // Partial Fisher–Yates: only shuffle as far as the picks we need.
  const picks = Math.max(0, Math.min(rest.length, liveCount - live.length));
  for (let i = 0; i < picks; i++) {
    const j = i + Math.floor(random() * (rest.length - i));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return { live: live.concat(rest.slice(0, picks)), baked: rest.slice(picks) };
}

/**
 * An offscreen canvas at device resolution, pre-scaled so drawing uses CSS px.
 * @param {number} w CSS px
 * @param {number} h CSS px
 * @param {number} dpr
 * @returns {{ canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D }}
 */
export function createLayer(w, h, dpr) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { canvas, ctx };
}

/**
 * Copies a device-resolution layer onto a context 1:1, ignoring its CSS-px scale.
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLCanvasElement} layer
 * @param {number} dpr the scale `ctx` should be left at
 */
export function blitLayer(ctx, layer, dpr) {
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(layer, 0, 0);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/**
 * Buckets static stars by position so the cursor's neighbourhood can be found
 * without scanning the whole sky every frame.
 * @template {{ home: (t: number) => { x: number, y: number } }} S
 * @param {S[]} stars stars whose home doesn't move with time
 * @param {number} cell bucket size in CSS px
 * @returns {{ near: (x: number, y: number, r: number) => S[] }}
 */
export function createGrid(stars, cell) {
  const buckets = new Map();
  const key = (cx, cy) => `${cx},${cy}`;
  for (const s of stars) {
    const { x, y } = s.home(0);
    const k = key(Math.floor(x / cell), Math.floor(y / cell));
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(s);
  }

  /** Stars within `r` of (x, y), inclusive. */
  function near(x, y, r) {
    const found = [];
    for (let cx = Math.floor((x - r) / cell); cx <= Math.floor((x + r) / cell); cx++) {
      for (let cy = Math.floor((y - r) / cell); cy <= Math.floor((y + r) / cell); cy++) {
        for (const s of buckets.get(key(cx, cy)) ?? []) {
          const p = s.home(0);
          if (Math.hypot(p.x - x, p.y - y) <= r) found.push(s);
        }
      }
    }
    return found;
  }

  return { near };
}
