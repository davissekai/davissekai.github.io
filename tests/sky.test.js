import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSky, bandDistance } from "../js/sky.js";

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

const W = 1200;
const H = 800;

test("builds exactly the requested number of stars, all inside the viewport", () => {
  const sky = buildSky(3000, W, H, seeded(1));
  assert.equal(sky.length, 3000);
  for (const s of sky) {
    const { x, y } = s.home(0);
    assert.ok(x >= 0 && x <= W && y >= 0 && y <= H, `star off-screen at (${x}, ${y})`);
  }
});

test("every star carries a brightness between 0 and 1", () => {
  for (const s of buildSky(2000, W, H, seeded(2))) {
    assert.ok(s.bright > 0 && s.bright <= 1, `bright out of range: ${s.bright}`);
  }
});

test("stars crowd along the lane, like a Milky Way band", () => {
  const sky = buildSky(6000, W, H, seeded(3));
  const inLane = sky.filter((s) => Math.abs(bandDistance(s.home(0).x, s.home(0).y, W, H)) < 0.1).length;
  // A uniform scatter would put roughly a fifth of the stars in this strip.
  assert.ok(inLane / sky.length > 0.35, `only ${inLane} of ${sky.length} in the lane`);
});

test("only a handful of stars are spiked glints, and they are the bright ones", () => {
  const sky = buildSky(6000, W, H, seeded(4));
  const spiked = sky.filter((s) => s.spike);
  assert.ok(spiked.length >= 6 && spiked.length <= 24, `${spiked.length} spiked stars`);
  for (const s of spiked) assert.ok(s.size >= 2 && s.bright === 1);
});

test("an empty sky is allowed", () => {
  assert.deepEqual(buildSky(0, W, H, seeded(5)), []);
});

test("stars shine blue-white or faintly pink, never gold", () => {
  for (const s of buildSky(3000, W, H, seeded(9))) {
    const [, g, b] = s.rgb;
    assert.ok(b >= g, `gold-ish star ${s.rgb}`);
  }
});

test("ordinary stars are crisp pinpoints; only the spiked glints are big enough to carry a halo", () => {
  // paintStar adds a soft halo to any star over 1.3px; on the hero those read as blur.
  for (const s of buildSky(3000, W, H, seeded(10))) {
    if (!s.spike) assert.ok(s.size <= 1.3, `blurry star of size ${s.size}`);
  }
});
