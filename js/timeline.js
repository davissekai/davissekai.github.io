/**
 * Time helpers for the arrival sequence (void → 人皇 → galaxies).
 * Kept pure so phase boundaries can be tested without animation frames.
 */

/**
 * Clamped 0..1 progress of time `t` through a phase starting at `start` lasting `dur`.
 * @param {number} t
 * @param {number} start
 * @param {number} dur
 * @returns {number}
 */
export function progress(t, start, dur) {
  if (dur <= 0) return t >= start ? 1 : 0;
  return Math.min(1, Math.max(0, (t - start) / dur));
}

/**
 * Slow-fast-slow easing; gives star flights weight at both ends.
 * @param {number} x 0..1
 * @returns {number}
 */
export function easeInOutCubic(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
