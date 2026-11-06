/**
 * Adaptive quality for the sky canvases. Slow devices can't paint thousands of
 * stars every frame, so each sky reports how long its paint took and scales its
 * work by `quality` (0..1). Decisions use a window's mean, so one hitch
 * (a GC pause, a tab switch) never degrades the sky.
 */

/**
 * @param {{ budgetMs?: number, window?: number, min?: number }} [options]
 *   budgetMs: target paint time per frame; window: samples per decision; min: quality floor.
 * @returns {{ record: (ms: number) => number, readonly quality: number }}
 */
export function createFrameBudget({ budgetMs = 10, window = 20, min = 0.25 } = {}) {
  let quality = 1;
  let sum = 0;
  let count = 0;

  /** Adds one paint duration; returns the (possibly updated) quality. */
  function record(ms) {
    if (!Number.isFinite(ms) || ms < 0) return quality;
    sum += ms;
    count += 1;
    if (count < window) return quality;
    const mean = sum / count;
    sum = 0;
    count = 0;
    if (mean > budgetMs) {
      // Cut in proportion to the overrun, but at most in half per window so one bad window can't crater it.
      quality = Math.max(min, quality * Math.max(0.5, budgetMs / mean));
    } else if (mean < budgetMs * 0.6) {
      quality = Math.min(1, quality * 1.15);
    }
    return quality;
  }

  return {
    record,
    get quality() {
      return quality;
    },
  };
}
