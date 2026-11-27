import { offsetFromMiddle, coverflowTransform, nearest, step } from "./coverflow.js";

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

/**
 * Brings the home page's project shelf to life: the print in focus faces you and the others turn
 * away. With a mouse, focus follows the pointer, so whichever print it's over is the one in focus
 * and a click opens it. On phones, where the prints don't fit side by side, the shelf scrolls and
 * the print in the middle is in focus. Tab and the ←/→ buttons move focus too, stopping at either
 * end. Every print stays a plain link, so with no script the shelf is just a row of links.
 */
export function mountShelf(shelf) {
  const track = shelf?.querySelector(".shelf-track");
  const prints = track ? [...track.querySelectorAll(".print")] : [];
  const controls = shelf?.querySelector(".shelf-controls");
  if (prints.length < 2 || !controls) return;
  const open = controls.querySelector(".shelf-open");
  const status = controls.querySelector(".shelf-status");
  const back = controls.querySelector('[data-step="-1"]');
  const forward = controls.querySelector('[data-step="1"]');
  const index = shelf.querySelector(".shelf-index");
  fillThumbnails(index, prints);
  let focused = -1;

  /** Puts print `i` in focus: it faces you, the rest turn away from it, and the open button points at it. */
  function select(i) {
    if (i === focused || i < 0) return;
    focused = i;
    prints.forEach((p, j) => {
      p.style.transform = coverflowTransform(i - j);
      p.classList.toggle("is-focused", j === i);
    });
    open.href = prints[i].href;
    open.textContent = prints[i].dataset.action;
    status.textContent = `${prints[i].querySelector(".print-title").textContent}, ${i + 1} of ${prints.length}`;
    back.disabled = i === 0;
    forward.disabled = i === prints.length - 1;
  }

  /** Whether the prints overflow the shelf, so it has to scroll to show them (phones). */
  const scrolls = () => track.scrollWidth > track.clientWidth + 1;

  // While the shelf slides itself to a print, the scroll mustn't hand focus back to whichever
  // print it passes. Cleared when the slide ends, or after a while where scrollend isn't supported.
  let steering = 0;

  /** On a shelf that scrolls, slides print `i` to the middle. Where they all fit, nothing moves. */
  function centre(i, smooth = !reduceMotion.matches) {
    if (!scrolls()) return;
    const p = prints[i];
    clearTimeout(steering);
    steering = setTimeout(followScroll, 900);
    track.scrollTo({ left: p.offsetLeft + p.offsetWidth / 2 - track.clientWidth / 2, behavior: smooth ? "smooth" : "auto" });
  }

  /** Puts the print nearest the middle of a scrolling shelf in focus. */
  function followScroll() {
    clearTimeout(steering);
    steering = 0;
    if (!scrolls()) return;
    const middle = track.scrollLeft + track.clientWidth / 2;
    select(nearest(prints.map((p) => offsetFromMiddle(p.offsetLeft + p.offsetWidth / 2, middle, p.offsetWidth))));
  }

  // The mouse (or a pen) puts whichever print it's over in focus. Touch is left to the scroll.
  track.addEventListener("pointerover", (event) => {
    if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
    select(prints.indexOf(event.target.closest(".print")));
  });

  // On a scrolling shelf (phones), the print nearest the middle is in focus as you swipe.
  let frame = 0;
  track.addEventListener("scroll", () => {
    if (frame || steering) return;
    frame = requestAnimationFrame(() => { frame = 0; if (!steering) followScroll(); });
  }, { passive: true });
  track.addEventListener("scrollend", () => { if (steering) followScroll(); });
  new ResizeObserver(() => centre(focused, false)).observe(track);

  // A tap on a print that isn't in focus brings it into focus first; the next tap opens it.
  track.addEventListener("click", (event) => {
    const i = prints.indexOf(event.target.closest(".print"));
    if (i === -1 || i === focused) return;
    event.preventDefault();
    select(i);
    centre(i);
  });
  // Tabbing onto a print puts it in focus. Focus from a tap or click is left to the handlers above,
  // or a tap on a side print would open it straight away.
  track.addEventListener("focusin", (event) => {
    const i = prints.indexOf(event.target.closest(".print"));
    if (i === -1 || !event.target.matches(":focus-visible")) return;
    select(i);
    centre(i);
  });

  controls.addEventListener("click", (event) => {
    const button = event.target.closest("[data-step]");
    if (!button) return;
    const i = step(focused, Number(button.dataset.step), prints.length);
    select(i);
    centre(i);
  });

  index?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-goto]");
    const i = prints.findIndex((p) => p.dataset.print === button?.dataset.goto);
    if (i === -1) return;
    index.open = false;
    select(i);
    centre(i);
    prints[i].focus({ preventScroll: true });
  });
  document.addEventListener("click", (event) => {
    if (index?.open && !index.contains(event.target)) index.open = false;
  });

  controls.hidden = false;
  shelf.dataset.mounted = "";
  select(0);
  centre(0, false);
}

/**
 * Gives each index entry a small copy of its print's art, rather than writing it twice in the
 * page; the copy takes the print's palette class so its colours match.
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
