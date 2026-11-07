/**
 * The star chart's worlds: places each project's label under its galaxy and
 * opens the project's card (a native <dialog>, so focus, Esc and screen readers
 * come for free). The content lives in index.html; this only wires it up.
 */
import { labelAnchor } from "./galaxies.js";

// Keeps labels this far from the screen edge (CSS px).
const EDGE = 12;

const list = document.getElementById("worlds");
const labels = [...list.querySelectorAll(".world-label")];

/**
 * Places every label centred under its galaxy, clamped so none runs off-screen.
 * @param {number} w chart canvas width (CSS px)
 * @param {number} h chart frame height (CSS px)
 * @param {number} top height of the blend zone above the frame
 */
export function placeLabels(w, h, top) {
  for (const el of labels) {
    const a = labelAnchor(el.dataset.world, w, h, top);
    const half = el.offsetWidth / 2;
    const x = Math.min(w - EDGE - half, Math.max(EDGE + half, a.x));
    el.style.left = `${x - half}px`;
    el.style.top = `${a.y - top}px`;
  }
  list.classList.add("is-placed");
}

/**
 * Opens a world's card.
 * @param {string} id project id, as in data-world
 */
export function openWorld(id) {
  const card = document.getElementById(`world-${id}`);
  if (card && !card.open) card.showModal();
}

/**
 * Lights up the label of the galaxy under the cursor, so the sky and its names read as one.
 * @param {string | null} id
 */
export function markNear(id) {
  for (const el of labels) el.classList.toggle("is-near", el.dataset.world === id);
}

for (const el of labels) el.addEventListener("click", () => openWorld(el.dataset.world));

// A click on the backdrop closes the card. The dialog itself is also the click target for its own
// padding, so test against its box rather than the event target.
for (const card of document.querySelectorAll("dialog.world")) {
  card.addEventListener("click", (e) => {
    const r = card.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) card.close();
  });
}
