/**
 * The cursor's warp, shared by every sky: stars near the pointer lean toward
 * it, as if its gravity bends their light. Only a small circle around the
 * cursor is repainted each frame, over a star-free copy of the backdrop, so it
 * costs a few dozen stars, not the whole sky.
 */

// How far the warp reaches (CSS px).
export const WARP_RADIUS = 140;
// Where the pointer "is" when it's away, far enough that nothing warps.
export const OFF = Object.freeze({ x: -1e4, y: -1e4 });
// The strongest pull, as a share of a star's distance from the cursor.
const STRENGTH = 0.12;

/**
 * Leans a point toward the cursor if it's within reach. Mutates and returns
 * `p` so painted stars keep their other fields (colour, alpha) for free.
 * @template {{x: number, y: number}} P
 * @param {P} p
 * @param {{x: number, y: number}} mouse
 * @returns {P}
 */
export function pull(p, mouse) {
  const dx = mouse.x - p.x;
  const dy = mouse.y - p.y;
  const dist = Math.hypot(dx, dy);
  if (dist < WARP_RADIUS) {
    const k = STRENGTH * (1 - dist / WARP_RADIUS);
    p.x += dx * k;
    p.y += dy * k;
  }
  return p;
}

/**
 * Repaints the circle around the cursor: the star-free backdrop, then
 * whatever stars `paint` draws (pulled), all clipped to the warp. Does nothing
 * when the cursor is nowhere near the canvas.
 * @param {CanvasRenderingContext2D} ctx at device scale, drawing in CSS px
 * @param {{mouse: {x: number, y: number}, w: number, h: number, dpr: number, backdrop: HTMLCanvasElement, paint: () => void}} o
 *   backdrop is a device-resolution layer of the sky without its stars
 */
export function warpPatch(ctx, { mouse, w, h, dpr, backdrop, paint }) {
  const reach = WARP_RADIUS + 10;
  if (mouse.x < -reach || mouse.x > w + reach || mouse.y < -reach || mouse.y > h + reach) return;
  ctx.save();
  ctx.beginPath();
  ctx.arc(mouse.x, mouse.y, WARP_RADIUS, 0, Math.PI * 2);
  ctx.clip();
  // One opaque draw resets the patch; layering a second fill would darken the clip's soft edge into a ring.
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(backdrop, 0, 0);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalCompositeOperation = "lighter";
  paint();
  ctx.restore();
}
