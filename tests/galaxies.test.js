import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSky } from "../js/galaxies.js";

/** Deterministic PRNG (mulberry32) so sky layouts are reproducible. */
function seeded(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test("every star carries a brightness between 0 and 1", () => {
  const sky = buildSky(2000, 1200, 800, seeded(1));
  for (const s of sky) {
    assert.ok(s.bright > 0 && s.bright <= 1, `bright out of range: ${s.bright}`);
  }
});

test("crowded galaxy cores shine dimmer per star than the arms, so they do not sum to white", () => {
  const w = 1200;
  const h = 800;
  const sky = buildSky(6000, w, h, seeded(7));
  const cx = 0.7 * w;
  const cy = 0.36 * h;
  const byDist = sky
    .map((s) => ({ s, d: Math.hypot(s.home(0).x - cx, s.home(0).y - cy) }))
    .sort((a, b) => a.d - b.d);
  const mean = (xs) => xs.reduce((sum, x) => sum + x.s.bright, 0) / xs.length;
  const inner = byDist.slice(0, 200);
  const outer = byDist.slice(1000, 2000);
  assert.ok(mean(inner) < mean(outer) * 0.7, `inner ${mean(inner)} vs outer ${mean(outer)}`);
});
