import { test } from "node:test";
import assert from "node:assert/strict";
import { GALAXIES, galaxyShape } from "../js/galaxies.js";
import { shapeBox } from "../js/annotations.js";
import { focusView, viewAt, toScreen, ease, galaxyRegion, createFlight, REACH } from "../js/visit.js";

const DESKTOP = [
  [1440, 900],
  [1280, 680],
  [991, 745],
  [768, 1024],
];
const PHONE = [
  [375, 760],
  [360, 640],
  [412, 860],
];
const close = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

/** The whole visited galaxy (out to its faintest arms) on screen once the zoom lands. */
function landedBox(id, w, h) {
  const shape = galaxyShape(id, w, h);
  const v = viewAt(focusView(shape, w, h), 1);
  const b = shapeBox(shape);
  const grow = REACH - 1;
  const full = { x: b.x - (b.w * grow) / 2, y: b.y - (b.h * grow) / 2, w: b.w * REACH, h: b.h * REACH };
  const a = toScreen(v, full.x, full.y);
  const z = toScreen(v, full.x + full.w, full.y + full.h);
  return { x: a.x, y: a.y, w: z.x - a.x, h: z.y - a.y };
}

test("before the zoom starts, the view leaves the sky exactly where it was", () => {
  for (const g of GALAXIES) {
    const v = viewAt(focusView(galaxyShape(g.id, 1440, 900), 1440, 900), 0);
    for (const [x, y] of [[0, 0], [700, 300], [1440, 900]]) {
      const p = toScreen(v, x, y);
      assert.ok(close(p.x, x) && close(p.y, y));
    }
  }
});

test("once landed, the visited galaxy sits at the centre of its region", () => {
  for (const [w, h] of [...DESKTOP, ...PHONE]) {
    const region = galaxyRegion(w, h);
    for (const g of GALAXIES) {
      const shape = galaxyShape(g.id, w, h);
      const p = toScreen(viewAt(focusView(shape, w, h), 1), shape.cx, shape.cy);
      assert.ok(close(p.x, region.cx) && close(p.y, region.cy), `${g.id} off-centre at ${w}x${h}`);
    }
  }
});

test("the galaxy grows to fill its region, never shrinks, and never zooms absurdly far", () => {
  for (const [w, h] of [...DESKTOP, ...PHONE]) {
    for (const g of GALAXIES) {
      const { k } = focusView(galaxyShape(g.id, w, h), w, h);
      assert.ok(k >= 1 && k <= 4, `${g.id} zoom ${k} at ${w}x${h}`);
    }
  }
});

test("the landed galaxy fits inside its region, so it never runs under the text", () => {
  for (const [w, h] of [...DESKTOP, ...PHONE]) {
    const r = galaxyRegion(w, h);
    for (const g of GALAXIES) {
      const { k } = focusView(galaxyShape(g.id, w, h), w, h);
      if (k === 1) continue; // Already bigger than its region; zooming can't shrink it.
      const b = landedBox(g.id, w, h);
      assert.ok(b.x >= r.cx - r.w / 2 - 1 && b.x + b.w <= r.cx + r.w / 2 + 1, `${g.id} too wide at ${w}x${h}`);
      assert.ok(b.y >= r.cy - r.h / 2 - 1 && b.y + b.h <= r.cy + r.h / 2 + 1, `${g.id} too tall at ${w}x${h}`);
    }
  }
});

test("on wide screens the galaxy takes the left side, leaving the right for the text", () => {
  for (const [w, h] of DESKTOP) {
    const r = galaxyRegion(w, h);
    assert.ok(r.cx + r.w / 2 <= 0.6 * w);
  }
});

test("on phones the galaxy takes the top, leaving the lower half for the text", () => {
  for (const [w, h] of PHONE) {
    const r = galaxyRegion(w, h);
    assert.ok(r.cy + r.h / 2 <= 0.46 * h);
    assert.ok(r.cy - r.h / 2 >= 0);
  }
});

test("halfway, the zoom is partway: bigger than before, smaller than landed", () => {
  const shape = galaxyShape("atmo", 1440, 900);
  const v = focusView(shape, 1440, 900);
  const mid = viewAt(v, 0.5).k;
  assert.ok(mid > 1 && mid < v.k);
});

test("easing starts at rest, ends at rest, and never overshoots", () => {
  assert.equal(ease(0), 0);
  assert.equal(ease(1), 1);
  for (let p = 0; p <= 1; p += 0.05) assert.ok(ease(p) >= 0 && ease(p) <= 1);
  assert.equal(ease(-1), 0);
  assert.equal(ease(2), 1);
});

test("a flight starts on the chart and lands after its duration", () => {
  const f = createFlight(1000);
  assert.equal(f.at(0), 0);
  f.go(1, 100);
  assert.equal(f.at(100), 0);
  const mid = f.at(600);
  assert.ok(mid > 0 && mid < 1);
  assert.equal(f.at(1100), 1);
  assert.equal(f.at(5000), 1);
  assert.equal(f.target, 1);
});

test("turning back mid-flight reverses from where it is, without a jump", () => {
  const f = createFlight(1000);
  f.go(1, 0);
  const here = f.at(400);
  f.go(0, 400);
  assert.ok(close(f.at(400), here));
  assert.ok(f.at(700) < here);
  assert.equal(f.at(1400), 0);
});

test("a zero-length flight (reduced motion) arrives at once", () => {
  const f = createFlight(0);
  f.go(1, 50);
  assert.equal(f.at(50), 1);
  f.go(0, 60);
  assert.equal(f.at(60), 0);
});
