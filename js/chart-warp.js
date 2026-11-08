/**
 * The cursor's warp on the star chart. Unlike the other skies, the chart's
 * stars include galaxies that keep turning, so they can't be bucketed once;
 * instead the warp checks which galaxies it touches and scans only those.
 */
import { GALAXIES } from "./galaxies.js";
import { paintStar } from "./sprites.js";
import { createGrid } from "./star-layers.js";
import { pull, WARP_RADIUS } from "./warp.js";

/**
 * Prepares the warp for one chart layout.
 * @param {{galaxy: object[], baked: object[], w: number, h: number, top: number}} sky
 *   galaxy: the turning galaxy stars; baked: still field stars baked into the backdrop
 * @returns {{paint: (ctx: CanvasRenderingContext2D, t: number, mouse: {x: number, y: number}, alphaAt: (s: object, t: number) => number) => void}}
 */
export function createChartWarp({ galaxy, baked, w, h, top }) {
  const grid = createGrid(baked, 64);
  const groups = GALAXIES.map((g) => ({
    cx: g.x * w,
    cy: top + g.y * h,
    R: g.r * Math.min(w, h),
    stars: galaxy.filter((s) => s.galaxy === g.id),
  }));

  /** Paints every star within the warp, pulled toward the cursor: field stars, then any galaxy it touches. */
  function paint(ctx, t, mouse, alphaAt) {
    const reach = WARP_RADIUS + 10;
    for (const s of grid.near(mouse.x, mouse.y, reach)) {
      const p = pull(s.home(t), mouse);
      paintStar(ctx, s, p.x, p.y, s.rgb, 0.675 * s.bright);
    }
    for (const g of groups) {
      if (Math.hypot(mouse.x - g.cx, mouse.y - g.cy) > g.R + reach) continue;
      for (const s of g.stars) {
        const p = s.home(t);
        if (Math.abs(p.x - mouse.x) > reach || Math.abs(p.y - mouse.y) > reach) continue;
        pull(p, mouse);
        paintStar(ctx, s, p.x, p.y, s.rgb, alphaAt(s, t));
      }
    }
  }

  return { paint };
}
