/**
 * Visiting a world: the star chart flies into one galaxy, setting it on one
 * side of the screen with its story beside it in open sky. This is the view
 * maths only (pure, in frame coordinates); chart.js paints with it.
 *
 * A view maps sky points to screen points as (p - focus) * k + target, so at
 * k = 1 with target = focus it's the plain chart, and landed it holds the
 * galaxy, enlarged, at the centre of its region.
 */
import { shapeBox } from "./annotations.js";

// How far the faintest arms reach past the rim used for annotation.
export const REACH = 1.3;
// Never zoom further than this: past it the stars thin into a sparse scatter.
const MAX_ZOOM = 4;

/**
 * Where a visited galaxy lands. Wide screens: the left side, text on the right.
 * Phones: the top, text in the lower half.
 * @param {number} w frame width
 * @param {number} h frame height
 * @returns {{cx: number, cy: number, w: number, h: number}}
 */
export function galaxyRegion(w, h) {
  return w >= 700 ? { cx: 0.33 * w, cy: 0.5 * h, w: 0.5 * w, h: 0.78 * h } : { cx: 0.5 * w, cy: 0.25 * h, w: 0.9 * w, h: 0.4 * h };
}

/**
 * The landed view for a galaxy: zoomed so its full extent fills its region.
 * @param {{cx: number, cy: number, a: number, b: number, tilt: number}} shape the galaxy's rim
 * @param {number} w
 * @param {number} h
 * @returns {{k: number, fx: number, fy: number, tx: number, ty: number}}
 */
export function focusView(shape, w, h) {
  const r = galaxyRegion(w, h);
  const box = shapeBox(shape);
  const fit = Math.min(r.w / (box.w * REACH), r.h / (box.h * REACH));
  return { k: Math.min(MAX_ZOOM, Math.max(1, fit)), fx: shape.cx, fy: shape.cy, tx: r.cx, ty: r.cy };
}

/**
 * The view `p` of the way (0..1) from the plain chart to `landed`. Zoom moves
 * geometrically so it feels even, not rushed at the start and dragging at the end.
 * @param {{k: number, fx: number, fy: number, tx: number, ty: number}} landed
 * @param {number} p
 * @returns {{k: number, fx: number, fy: number, tx: number, ty: number}}
 */
export function viewAt(landed, p) {
  const { fx, fy } = landed;
  return { k: Math.pow(landed.k, p), fx, fy, tx: fx + (landed.tx - fx) * p, ty: fy + (landed.ty - fy) * p };
}

/**
 * Where a sky point appears under a view.
 * @param {{k: number, fx: number, fy: number, tx: number, ty: number}} v
 * @param {number} x
 * @param {number} y
 * @returns {{x: number, y: number}}
 */
export function toScreen(v, x, y) {
  return { x: (x - v.fx) * v.k + v.tx, y: (y - v.fy) * v.k + v.ty };
}

/**
 * Ease-in-out (cubic) for the flight, clamped to 0..1.
 * @param {number} p
 * @returns {number}
 */
export function ease(p) {
  const t = Math.min(1, Math.max(0, p));
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * The flight's progress over time: 0 on the chart, 1 landed. `go` can be
 * called mid-flight (turning back halfway) and carries on from where it is.
 * A zero duration (reduced motion) arrives at once.
 * @param {number} duration ms
 * @returns {{go: (target: number, now: number) => void, at: (now: number) => number, readonly target: number}}
 */
export function createFlight(duration) {
  let from = 0;
  let to = 0;
  let start = 0;
  const at = (now) => from + (to - from) * (duration > 0 ? ease((now - start) / duration) : 1);
  return {
    go(target, now) {
      from = at(now);
      to = target;
      start = now;
    },
    at,
    get target() {
      return to;
    },
  };
}
