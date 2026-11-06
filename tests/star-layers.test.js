import { test } from "node:test";
import assert from "node:assert/strict";
import { splitLive, createGrid } from "../js/star-layers.js";

/** Deterministic PRNG (mulberry32) so layouts are reproducible. */
function seeded(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A static star at (x, y), shaped like the sky modules' stars. */
function star(x, y, spike = false) {
  return { home: () => ({ x, y }), spike };
}

/** `n` stars scattered over a w×h box. */
function field(n, w, h, random) {
  return Array.from({ length: n }, (_, i) => star(random() * w, random() * h, i < 5));
}

test("every star lands in exactly one layer", () => {
  const stars = field(500, 800, 600, seeded(1));
  const { live, baked } = splitLive(stars, 60, seeded(2));
  assert.equal(live.length + baked.length, stars.length);
  assert.equal(new Set([...live, ...baked]).size, stars.length);
});

test("spiked stars are always live, even past the live count", () => {
  const stars = field(100, 800, 600, seeded(3));
  const { live } = splitLive(stars, 2, seeded(4));
  assert.equal(live.filter((s) => s.spike).length, 5);
  assert.equal(live.length, 5);
});

test("fills the live layer up to the requested count", () => {
  const stars = field(500, 800, 600, seeded(5));
  assert.equal(splitLive(stars, 80, seeded(6)).live.length, 80);
});

test("asking for more live stars than exist makes them all live", () => {
  const stars = field(30, 800, 600, seeded(7));
  const { live, baked } = splitLive(stars, 1000, seeded(8));
  assert.equal(live.length, 30);
  assert.equal(baked.length, 0);
});

test("grid finds exactly the stars a brute-force distance check finds", () => {
  const random = seeded(9);
  const stars = field(2000, 1000, 700, random);
  const grid = createGrid(stars, 64);
  for (const [x, y, r] of [[500, 350, 150], [0, 0, 100], [1000, 700, 40], [-50, 300, 80], [333, 12, 0.5]]) {
    const expected = stars.filter((s) => Math.hypot(s.home(0).x - x, s.home(0).y - y) <= r);
    const got = grid.near(x, y, r);
    assert.equal(got.length, expected.length, `at (${x}, ${y}) r=${r}`);
    assert.deepEqual(new Set(got), new Set(expected));
  }
});

test("grid returns nothing for a point far off the sky", () => {
  const grid = createGrid(field(300, 800, 600, seeded(10)), 64);
  assert.deepEqual(grid.near(-5000, -5000, 100), []);
});
