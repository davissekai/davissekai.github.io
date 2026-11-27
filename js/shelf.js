import { offsetFromMiddle, coverflowTransform, nearest, wrap } from "./coverflow.js";

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
// One wheel step moves one print; this long is one step, so a flick doesn't race past them all.
const WHEEL_STEP_MS = 380;

/**
 * Watches `root`, the panel, for the archive's shelf. The panel replaces its markup every time
 * the archive opens, so each fresh shelf is set up as it arrives, and its listeners go with it.
 * A click anywhere else in the panel folds an open print index away.
 */
export function wireShelf(root) {
  const body = root.querySelector(".panel-body") ?? root;
  new MutationObserver(() => mountShelf(body)).observe(body, { childList: true });
  root.addEventListener("click", (event) => {
    for (const index of root.querySelectorAll(".shelf-index[open]")) {
      if (!index.contains(event.target)) index.open = false;
    }
  });
}

/**
 * Turns the shelf in `scope` into a coverflow, as on itsdavis.com: the print in the middle faces
 * you and its neighbours turn away. The track stays an ordinary scroller underneath, so touch,
 * trackpads and keyboard all slide it, and every print is still a plain link.
 */
function mountShelf(scope) {
  const shelf = scope.querySelector(".shelf:not([data-mounted])");
  const track = shelf?.querySelector(".shelf-track");
  const prints = track ? [...track.querySelectorAll(".print")] : [];
  const controls = shelf?.querySelector(".shelf-controls");
  if (!prints.length || !controls) return;
  shelf.dataset.mounted = "";
  const open = controls.querySelector(".shelf-open");
  const status = controls.querySelector(".shelf-status");
  let active = -1;

  /** Turns each print by its distance from the middle, and keeps the open button on the middle one. */
  function update() {
    const middle = track.scrollLeft + track.clientWidth / 2;
    const offsets = prints.map((p) => offsetFromMiddle(p.offsetLeft + p.offsetWidth / 2, middle, p.offsetWidth));
    prints.forEach((p, i) => { p.style.transform = coverflowTransform(offsets[i]); });
    select(nearest(offsets));
  }

  function select(i) {
    if (i === active) return;
    active = i;
    const print = prints[i];
    prints.forEach((p, j) => p.classList.toggle("is-centred", j === i));
    open.href = print.href;
    open.textContent = print.dataset.action;
    status.textContent = `${print.querySelector(".print-title").textContent}, ${i + 1} of ${prints.length}`;
  }

  /** Slides print `i` to the middle; steps past either end come round to the other. */
  function goTo(i, smooth = !reduceMotion.matches) {
    const p = prints[wrap(i, prints.length)];
    track.scrollTo({ left: p.offsetLeft + p.offsetWidth / 2 - track.clientWidth / 2, behavior: smooth ? "smooth" : "auto" });
  }

  let frame = 0;
  track.addEventListener("scroll", () => {
    if (!frame) frame = requestAnimationFrame(() => { frame = 0; update(); });
  }, { passive: true });
  new ResizeObserver(update).observe(track);

  // A print off to the side comes to the middle first; only the middle one opens.
  track.addEventListener("click", (event) => {
    const i = prints.indexOf(event.target.closest(".print"));
    if (i !== -1 && i !== active) {
      event.preventDefault();
      goTo(i);
    }
  });
  // Tabbing onto a print brings it to the middle. Mouse focus is left to the click above.
  track.addEventListener("focusin", (event) => {
    const i = prints.indexOf(event.target.closest(".print"));
    if (i !== -1 && i !== active && event.target.matches(":focus-visible")) goTo(i);
  });

  // A plain mouse wheel steps along the shelf; at either end it hands back to the panel.
  // Sideways trackpad swipes already scroll the track, so they're left alone.
  let wheelFree = 0;
  track.addEventListener("wheel", (event) => {
    if (event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
    const next = active + Math.sign(event.deltaY);
    if (next < 0 || next >= prints.length) return;
    event.preventDefault();
    if (event.timeStamp < wheelFree) return;
    wheelFree = event.timeStamp + WHEEL_STEP_MS;
    goTo(next);
  }, { passive: false });

  controls.addEventListener("click", (event) => {
    const button = event.target.closest("[data-step]");
    if (button) goTo(active + Number(button.dataset.step));
  });

  const index = shelf.querySelector(".shelf-index");
  fillThumbnails(index, prints);
  index?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-goto]");
    const i = prints.findIndex((p) => p.dataset.print === button?.dataset.goto);
    if (i === -1) return;
    index.open = false;
    goTo(i);
    prints[i].focus({ preventScroll: true });
  });

  controls.hidden = false;
  goTo(Math.floor(prints.length / 2), false);
  update();
}

/**
 * Gives each index entry a small copy of its print's art. Copied here rather than written twice
 * in the page; the copy takes the print's palette class so its colours match.
 */
function fillThumbnails(index, prints) {
  for (const thumb of index?.querySelectorAll(".index-thumb") ?? []) {
    const print = prints.find((p) => p.dataset.print === thumb.closest("[data-goto]")?.dataset.goto);
    const art = print?.querySelector(".print-art");
    if (!art || thumb.firstChild) continue;
    const palette = [...print.classList].find((c) => c.startsWith("print-"));
    if (palette) thumb.classList.add(palette);
    thumb.append(art.cloneNode(true));
  }
}
