/**
 * Paints the star chart while it's flown into one galaxy. The baked sky is
 * scaled up behind (going soft, like a lens focused on the galaxy), the other
 * galaxies fade out, and the visited galaxy is repainted star by star at the
 * zoomed scale so it stays crisp however close we get.
 */
import { paintStar } from "./sprites.js";

const VOID = "#05040a";
// How much the backdrop darkens once landed, so the galaxy and its story stand forward.
const DIM = 0.45;

/**
 * @param {CanvasRenderingContext2D} ctx the chart canvas, at device scale `dpr`
 * @param {object} o
 * @param {number} o.dpr
 * @param {number} o.w canvas width (CSS px)
 * @param {number} o.fullH canvas height (CSS px), blend zone included
 * @param {number} o.top blend zone height; views are in frame coordinates below it
 * @param {HTMLCanvasElement} o.still baked backdrop: void, nebula, field stars
 * @param {HTMLCanvasElement} o.front backdrop plus every galaxy, as last repainted
 * @param {{home: (t: number) => {x: number, y: number}, rgb: number[], size: number}[]} o.focus the visited galaxy's stars
 * @param {{home: (t: number) => {x: number, y: number}, rgb: number[], size: number}[]} o.live twinkling field stars
 * @param {{k: number, fx: number, fy: number, tx: number, ty: number}} o.view
 * @param {number} o.p flight progress, 0 (chart) to 1 (landed)
 * @param {number} o.t sky time (s)
 * @param {(s: object, t: number) => number} o.alphaAt twinkle brightness
 * @param {number} o.quality adaptive quality, 0.25..1: share of the galaxy's stars to paint
 */
export function paintZoomed(ctx, { dpr, w, fullH, top, still, front, focus, live, view, p, t, alphaAt, quality }) {
  const { k } = view;
  const fx = view.fx;
  const fy = view.fy + top;
  const tx = view.tx;
  const ty = view.ty + top;

  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = VOID;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * (tx - fx * k), dpr * (ty - fy * k));
  ctx.drawImage(still, 0, 0, w, fullH);
  // Cross-fading to the galaxy-free backdrop fades the other galaxies; the visited one is repainted below.
  ctx.globalAlpha = 1 - p;
  ctx.drawImage(front, 0, 0, w, fullH);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalAlpha = DIM * p;
  ctx.fillRect(0, 0, w, fullH);

  ctx.globalCompositeOperation = "lighter";
  // Up close stars should grow, but less than the zoom, or the galaxy turns to confetti.
  const grow = Math.sqrt(k);
  const n = Math.ceil(focus.length * quality);
  for (let i = 0; i < n; i++) {
    const s = focus[i];
    const at = s.home(t);
    const x = (at.x - fx) * k + tx;
    const y = (at.y - fy) * k + ty;
    if (x < -20 || x > w + 20 || y < -20 || y > fullH + 20) continue;
    paintStar(ctx, s, x, y, s.rgb, alphaAt(s, t) * p, 1, grow);
  }
  const fade = 1 - DIM * p;
  for (const s of live) {
    const at = s.home(t);
    paintStar(ctx, s, (at.x - fx) * k + tx, (at.y - fy) * k + ty, s.rgb, alphaAt(s, t) * fade);
  }
  ctx.globalAlpha = 1;
}
