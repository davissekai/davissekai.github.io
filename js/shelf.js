/**
 * The project shelf in the archive panel. The print index jumps to a print, and a plain mouse
 * wheel slides the shelf sideways (trackpads and touch already can). Listens on `root`, the panel,
 * because the shelf markup is replaced every time the archive opens.
 */
export function wireShelf(root) {
  root.addEventListener("click", (event) => {
    // A click anywhere else folds an open index away.
    for (const index of root.querySelectorAll(".shelf-index[open]")) {
      if (!index.contains(event.target)) index.open = false;
    }
    const button = event.target.closest("[data-goto]");
    if (!button) return;
    const print = button.closest(".shelf")?.querySelector(`[data-print="${CSS.escape(button.dataset.goto)}"]`);
    if (!print) return;
    button.closest("details").open = false;
    const smooth = matchMedia("(prefers-reduced-motion: no-preference)").matches;
    print.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "nearest", inline: "center" });
    print.focus({ preventScroll: true });
  });

  root.addEventListener("wheel", (event) => {
    const track = event.target.closest(".shelf-track");
    if (!track || event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
    const end = track.scrollWidth - track.clientWidth - 1;
    // At either end of the shelf, hand the wheel back to the panel.
    if ((event.deltaY < 0 && track.scrollLeft <= 0) || (event.deltaY > 0 && track.scrollLeft >= end)) return;
    event.preventDefault();
    // Firefox can report the wheel in lines rather than pixels.
    const step = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 40 : 1;
    track.scrollLeft += event.deltaY * step;
  }, { passive: false });
}
