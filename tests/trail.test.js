import { test } from "node:test";
import assert from "node:assert/strict";
import { createTrail } from "../js/trail.js";

test("a fresh trail is empty", () => {
  assert.deepEqual(createTrail(0.4).points(0), []);
});

test("the tail runs from the head (newest, full strength) back to its faded end", () => {
  const trail = createTrail(0.4);
  trail.add(0, 0, 0);
  trail.add(10, 0, 0.1);
  trail.add(20, 0, 0.2);
  const pts = trail.points(0.2);
  assert.deepEqual(pts.map((p) => p.x), [20, 10, 0]);
  assert.equal(pts[0].k, 1);
  assert.ok(pts[1].k < 1 && pts[2].k < pts[1].k && pts[2].k > 0);
});

test("points older than the tail's life fall away, so a still cursor leaves no tail", () => {
  const trail = createTrail(0.4);
  trail.add(0, 0, 0);
  trail.add(5, 5, 0.1);
  assert.equal(trail.points(0.45).length, 1);
  assert.deepEqual(trail.points(1), []);
});

test("the tail never grows past its cap, however fast the cursor moves", () => {
  const trail = createTrail(10, 24);
  for (let i = 0; i < 500; i++) trail.add(i, i, i * 0.001);
  const pts = trail.points(0.5);
  assert.equal(pts.length, 24);
  assert.equal(pts[0].x, 499);
});

test("clearing the trail (cursor left the page) empties it", () => {
  const trail = createTrail(0.4);
  trail.add(1, 1, 0);
  trail.clear();
  assert.deepEqual(trail.points(0), []);
});
