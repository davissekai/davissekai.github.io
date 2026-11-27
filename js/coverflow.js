/**
 * The maths behind the shelf's coverflow: the print in the middle faces you, and the ones either
 * side turn a little and sit further back. Kept apart from the DOM so it can be tested on its own.
 * The numbers follow Swiper's coverflow (13° turn, 68px depth per print), which itsdavis.com uses.
 */
const TILT_DEG = 13;
const DEPTH_PX = 68;
// Past two prints from the middle nothing is visible, so the turn stops growing.
const FURTHEST = 2;

/** How many print widths a print sits from the middle of the shelf: 0 centred, positive to the left. */
export function offsetFromMiddle(printCenter, viewMiddle, printWidth) {
  if (!printWidth) return 0;
  return (viewMiddle - printCenter) / printWidth;
}

/** The CSS transform for a print at `offset` print widths from the middle. */
export function coverflowTransform(offset) {
  const o = Math.max(-FURTHEST, Math.min(FURTHEST, offset));
  const depth = round(-DEPTH_PX * Math.abs(o));
  return `perspective(1200px) translateZ(${depth}px) rotateY(${round(TILT_DEG * o)}deg)`;
}

/** The index of the offset closest to the middle (the first one on a tie), or -1 if there are none. */
export function nearest(offsets) {
  let best = -1;
  for (let i = 0; i < offsets.length; i++) {
    if (best === -1 || Math.abs(offsets[i]) < Math.abs(offsets[best])) best = i;
  }
  return best;
}

/** Moves focus `delta` prints along a shelf of `count`, stopping at either end; -1 if the shelf is empty. */
export function step(index, delta, count) {
  if (count <= 0) return -1;
  return Math.max(0, Math.min(count - 1, index + delta));
}

/** Two decimals keep the transform strings short; -0 is written as 0. */
function round(n) {
  return Math.round(n * 100) / 100 || 0;
}
