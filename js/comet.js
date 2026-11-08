/**
 * The comet cursor: on mouse-driven screens the pointer becomes a small bright
 * head trailing a fading blue-white tail, like a comet crossing the Domain.
 * Over anything clickable the head swells, so it still says "you can click
 * this". Touch screens, and visitors who ask for reduced motion, keep their
 * normal cursor. Drawn on one fixed overlay canvas that only animates while
 * there's a tail to fade or a swell to finish.
 */
import { createTrail } from "./trail.js";

const TAIL = "196, 212, 255";
// Seconds a tail point lingers: long enough to read as a comet, short enough to stay out of the way.
const LIFE = 0.32;
const CLICKABLE = "a, button, [role='button'], summary, label";

const fine = window.matchMedia("(pointer: fine)").matches;
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (fine && !reduced) start();

/** Sets up the overlay and listeners; separate so the module is inert where the comet is off. */
function start() {
  const canvas = document.createElement("canvas");
  canvas.className = "comet";
  canvas.setAttribute("aria-hidden", "true");
  document.body.append(canvas);
  document.documentElement.classList.add("has-comet");
  const ctx = canvas.getContext("2d");
  const trail = createTrail(LIFE);
  const head = { x: 0, y: 0, shown: false };
  // How swollen the head is: 0 over open sky, 1 over something clickable; eases between.
  let heat = 0;
  let hot = false;
  let running = false;
  let dpr = 1;

  /** Matches the overlay to the viewport at device resolution. */
  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
    if (!running) paint(performance.now() / 1000);
  }

  /** Draws the tail and head at time t (s); returns whether anything is still changing. */
  function paint(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!head.shown) return false;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    const pts = trail.points(t);
    for (let i = 0; i < pts.length - 1; i++) {
      const k = pts[i].k;
      ctx.strokeStyle = `rgba(${TAIL}, ${0.55 * k * k})`;
      ctx.lineWidth = 0.6 + 3.4 * k;
      ctx.beginPath();
      ctx.moveTo(pts[i].x, pts[i].y);
      ctx.lineTo(pts[i + 1].x, pts[i + 1].y);
      ctx.stroke();
    }
    heat += ((hot ? 1 : 0) - heat) * 0.25;
    const r = 9 + 9 * heat;
    const glow = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, r);
    glow.addColorStop(0, `rgba(${TAIL}, ${0.55 + 0.25 * heat})`);
    glow.addColorStop(1, `rgba(${TAIL}, 0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(head.x, head.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(head.x, head.y, 2.2 + 0.8 * heat, 0, Math.PI * 2);
    ctx.fill();
    return pts.length > 1 || Math.abs((hot ? 1 : 0) - heat) > 0.01;
  }

  /** Runs frames until the tail has faded and the swell has settled, then rests. */
  function frame(now) {
    running = paint(now / 1000);
    if (running) requestAnimationFrame(frame);
  }

  /** Wakes the loop after the pointer moves or changes target. */
  function wake() {
    if (running) return;
    running = true;
    requestAnimationFrame(frame);
  }

  window.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    head.x = e.clientX;
    head.y = e.clientY;
    head.shown = true;
    // Galaxies are drawn on a canvas, which marks them clickable by switching its own cursor to a pointer.
    hot = !!e.target.closest?.(CLICKABLE) || e.target.style?.cursor === "pointer";
    trail.add(e.clientX, e.clientY, e.timeStamp / 1000);
    wake();
  });
  document.documentElement.addEventListener("pointerleave", () => {
    head.shown = false;
    trail.clear();
    wake();
  });
  window.addEventListener("resize", size);
  size();
}
