import { test } from "node:test";
import assert from "node:assert/strict";
import { sampleInkedPoints, pickTargets } from "../js/glyph-points.js";

/** Builds an RGBA buffer where the given (x, y) cells are opaque. */
function rgba(width, height, inked) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (const [x, y] of inked) data[(y * width + x) * 4 + 3] = 255;
  return data;
}

test("returns only coordinates where the glyph is inked", () => {
  const data = rgba(4, 4, [[1, 1], [2, 3]]);
  const pts = sampleInkedPoints(data, 4, 4, 1);
  assert.deepEqual(pts, [{ x: 1, y: 1 }, { x: 2, y: 3 }]);
});

test("ignores faint anti-aliased edges below the alpha threshold", () => {
  const data = rgba(2, 1, [[0, 0]]);
  data[(0 * 2 + 1) * 4 + 3] = 40;
  assert.deepEqual(sampleInkedPoints(data, 2, 1, 1), [{ x: 0, y: 0 }]);
});

test("step skips cells so dense glyphs do not explode the star count", () => {
  const all = [];
  for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) all.push([x, y]);
  const pts = sampleInkedPoints(rgba(10, 10, all), 10, 10, 2);
  assert.equal(pts.length, 25);
  assert.ok(pts.every((p) => p.x % 2 === 0 && p.y % 2 === 0));
});

test("blank canvas yields no points", () => {
  assert.deepEqual(sampleInkedPoints(rgba(3, 3, []), 3, 3, 1), []);
});

test("rejects a buffer that does not match the stated size", () => {
  assert.throws(() => sampleInkedPoints(new Uint8ClampedArray(8), 4, 4, 1), RangeError);
});

test("rejects a non-positive step", () => {
  assert.throws(() => sampleInkedPoints(rgba(2, 2, []), 2, 2, 0), RangeError);
});

test("pickTargets returns exactly n points drawn from the pool", () => {
  const pool = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }];
  const out = pickTargets(pool, 7, () => 0.5);
  assert.equal(out.length, 7);
  assert.ok(out.every((p) => pool.includes(p)));
});

test("pickTargets covers every pool point before repeating any", () => {
  const pool = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }];
  const out = pickTargets(pool, 3, Math.random);
  assert.equal(new Set(out).size, 3);
});

test("pickTargets with an empty pool returns nothing rather than crashing", () => {
  assert.deepEqual(pickTargets([], 5, Math.random), []);
});
