/**
 * The star chart's worlds: annotates each galaxy with its project's label and
 * a hairline leader, and opens each project's story. Visiting a world flies
 * the chart into its galaxy (chart.js, on the "world:visit" event) while the
 * story appears beside it in open sky. The story is a native <dialog>, styled
 * boxless, so focus, Esc and screen readers come for free. The content lives
 * in index.html; this measures it, asks annotations.js where labels go, and wires it up.
 */
import { GALAXIES, galaxyShape } from "./galaxies.js";
import { layoutLabels } from "./annotations.js";

// Keeps labels this far from the screen edge (CSS px).
const EDGE = 12;
// Breathing room kept clear around the heading.
const HEAD_PAD = 10;
const SVG_NS = "http://www.w3.org/2000/svg";

const frame = document.getElementById("chart-frame");
const head = frame.querySelector(".chart-head");
const list = document.getElementById("worlds");
const labels = [...list.querySelectorAll(".world-label")];

// One leader line per label, in an overlay sharing the frame's coordinates.
const overlay = document.createElementNS(SVG_NS, "svg");
overlay.classList.add("leaders");
overlay.setAttribute("aria-hidden", "true");
const leaders = new Map(
  labels.map((el) => {
    const line = document.createElementNS(SVG_NS, "line");
    overlay.append(line);
    return [el.dataset.world, line];
  }),
);
frame.prepend(overlay);

let lastSize = null;

/**
 * Lays out every label beside its galaxy, clear of each other and the heading,
 * and draws its leader. Labels are measured live, so this must rerun once the
 * webfont arrives (it changes their widths).
 * @param {number} w chart frame width (CSS px)
 * @param {number} h chart frame height (CSS px)
 */
export function placeLabels(w, h) {
  lastSize = { w, h };
  const f = frame.getBoundingClientRect();
  const r = head.getBoundingClientRect();
  const avoid = [{ x: r.left - f.left - HEAD_PAD, y: r.top - f.top - HEAD_PAD, w: r.width + HEAD_PAD * 2, h: r.height + HEAD_PAD * 2 }];
  const items = labels
    .filter((el) => GALAXIES.some((g) => g.id === el.dataset.world))
    .map((el) => ({ id: el.dataset.world, shape: galaxyShape(el.dataset.world, w, h), w: el.offsetWidth, h: el.offsetHeight }));
  overlay.setAttribute("viewBox", `0 0 ${w} ${h}`);
  for (const p of layoutLabels(items, { w, h, edge: EDGE, avoid })) {
    const el = labels.find((l) => l.dataset.world === p.id);
    el.style.left = `${p.x}px`;
    el.style.top = `${p.y}px`;
    const line = leaders.get(p.id);
    line.toggleAttribute("hidden", !p.leader);
    if (p.leader) for (const k of ["x1", "y1", "x2", "y2"]) line.setAttribute(k, p.leader[k].toFixed(1));
  }
  list.classList.add("is-placed");
}

/**
 * Visits a world: lines the chart up with the screen (the landed galaxy and its
 * story are placed in screen terms), locks scrolling, and flies in.
 * @param {string} id project id, as in data-world
 */
export function openWorld(id) {
  const card = document.getElementById(`world-${id}`);
  if (!card || card.open) return;
  window.scrollBy({ top: frame.getBoundingClientRect().top, behavior: "instant" });
  document.documentElement.classList.add("is-visiting");
  markNear(null);
  card.showModal();
  document.dispatchEvent(new CustomEvent("world:visit", { detail: id }));
}

/**
 * Lights up one world's label and leader (or none), so the galaxy under the
 * cursor and its name read as one.
 * @param {string | null} id
 */
export function markNear(id) {
  for (const el of labels) el.classList.toggle("is-near", el.dataset.world === id);
  for (const [world, line] of leaders) line.classList.toggle("is-near", world === id);
}

for (const el of labels) {
  el.addEventListener("click", () => openWorld(el.dataset.world));
  el.addEventListener("pointerenter", () => markNear(el.dataset.world));
  el.addEventListener("pointerleave", () => markNear(null));
  el.addEventListener("focus", () => markNear(el.dataset.world));
  el.addEventListener("blur", () => markNear(null));
}

// Label widths change once Instrument Serif replaces the fallback font, so place again then.
document.fonts?.ready.then(() => {
  if (lastSize) placeLabels(lastSize.w, lastSize.h);
});

for (const card of document.querySelectorAll("dialog.world")) {
  // A tap anywhere outside the story flies back. The dialog is also the click target for its own
  // padding, so test against its box rather than the event target.
  card.addEventListener("click", (e) => {
    const r = card.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) card.close();
  });
  // However it closes (back link, Esc, tap outside), fly back to the chart.
  card.addEventListener("close", () => {
    document.documentElement.classList.remove("is-visiting");
    document.dispatchEvent(new CustomEvent("world:visit", { detail: null }));
  });
}
