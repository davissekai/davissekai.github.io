/**
 * Defers a section's setup until it's needed: when the visitor scrolls toward
 * it, or once the arrival has settled and the browser is idle, whichever comes
 * first. Building every sky at load would compete with the arrival's opening
 * animation for the main thread.
 */

// Resolves once the arrival has settled (arrival.js announces it), or after a backstop delay.
export const arrivalSettled = new Promise((resolve) => {
  document.addEventListener("arrival:settled", resolve, { once: true });
  setTimeout(resolve, 12000);
});

/**
 * Runs `fn` once, when `el` comes within `margin` of the viewport or when the
 * browser idles after the arrival settles.
 * @param {Element} el
 * @param {() => void} fn
 * @param {string} [margin] IntersectionObserver rootMargin; negative values require real overlap
 */
export function whenNeeded(el, fn, margin = "0px") {
  let done = false;
  const io = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) run();
    },
    { rootMargin: margin },
  );
  /** Runs the setup the first time it's asked for, then stops watching. */
  function run() {
    if (done) return;
    done = true;
    io.disconnect();
    fn();
  }
  io.observe(el);
  arrivalSettled.then(() => {
    if ("requestIdleCallback" in window) requestIdleCallback(run, { timeout: 2000 });
    else setTimeout(run, 200);
  });
}
