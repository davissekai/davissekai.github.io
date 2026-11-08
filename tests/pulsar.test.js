import { test } from "node:test";
import assert from "node:assert/strict";
import { PERIOD, LIFE, ringsAt, beat, pulsarPlace, fieldStars, rippleAt, RIPPLE_MAX } from "../js/pulsar.js";

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

test("a new ring leaves the pulsar every period, so several are always in flight", () => {
  for (const t of [0.01, 1.7, PERIOD * 3.5, 1000.3]) {
    const rings = ringsAt(t);
    assert.equal(rings.length, Math.round(LIFE / PERIOD));
    for (const r of rings) assert.ok(r.progress >= 0 && r.progress < 1);
    // Neighbouring rings are exactly one period apart.
    for (let i = 1; i < rings.length; i++) assert.ok(Math.abs(rings[i].progress - rings[i - 1].progress - PERIOD / LIFE) < 1e-9);
  }
});

test("rings fade as they spread, so the newest is always the brightest", () => {
  const rings = ringsAt(12.3);
  for (let i = 1; i < rings.length; i++) assert.ok(rings[i].alpha < rings[i - 1].alpha);
  for (const r of rings) assert.ok(r.alpha >= 0 && r.alpha <= 1);
});

test("a ring reaching the end of its life has faded to nothing, so rings never pop out", () => {
  const nearEnd = ringsAt(LIFE - 1e-6).at(-1);
  assert.ok(nearEnd.alpha < 0.01);
});

test("before time starts there are no rings", () => {
  assert.deepEqual(ringsAt(-1), []);
});

test("the pulsar flares on each beat and dims well before the next", () => {
  assert.ok(Math.abs(beat(0) - 1) < 1e-9);
  assert.ok(Math.abs(beat(PERIOD * 4) - 1) < 1e-9);
  assert.ok(beat(PERIOD * 0.8) < 0.2);
  for (let t = 0; t < 20; t += 0.13) assert.ok(beat(t) >= 0 && beat(t) <= 1);
});

test("on wide screens the pulsar sits right of the text; on phones, above it", () => {
  for (const [w, h] of [[1440, 900], [1200, 912], [800, 700]]) {
    const p = pulsarPlace(w, h);
    assert.ok(p.x > 0.58 * w && p.x < w && p.y > 0 && p.y < h);
    assert.ok(p.reach > 0 && p.x + p.reach <= w * 1.2);
  }
  for (const [w, h] of [[375, 812], [360, 640]]) {
    const p = pulsarPlace(w, h);
    assert.ok(Math.abs(p.x - w / 2) < 1 && p.y < 0.42 * h && p.y > 0.1 * h);
  }
});

test("background stars fill the screen as pinpoints; only the few spiked ones carry a halo", () => {
  const stars = fieldStars(900, 1200, 800, seeded(3));
  assert.equal(stars.length, 900);
  for (const s of stars) {
    assert.ok(s.x >= 0 && s.x <= 1200 && s.y >= 0 && s.y <= 800);
    assert.ok(s.bright > 0 && s.bright <= 1);
    if (!s.spike) assert.ok(s.size <= 1.3);
  }
  const spikes = stars.filter((s) => s.spike).length;
  assert.ok(spikes > 0 && spikes <= 6);
});

test("far from every wavefront, space is still: stars don't move", () => {
  const reach = 400;
  // Just after a beat the newest front sits by the pulsar; a star midway between fronts stays put.
  const t = PERIOD * 10 + 0.01;
  const fronts = ringsAt(t).map((r) => 6 + r.progress * reach);
  const between = (fronts[0] + fronts[1]) / 2;
  assert.ok(Math.abs(rippleAt(between, t, reach).shift) < 0.05);
  assert.ok(Math.abs(rippleAt(reach * 3, t, reach).shift) < 0.05);
});

test("a passing wavefront pushes stars outward just ahead of it and draws them back just behind", () => {
  const reach = 400;
  const t = PERIOD * 10 + 0.6;
  const front = 6 + ringsAt(t)[0].progress * reach;
  assert.ok(rippleAt(front + 6, t, reach).shift > 0.5, "ahead of the front: pushed out");
  assert.ok(rippleAt(front - 6, t, reach).shift < -0.5, "behind the front: pulled back in");
});

test("ripples weaken as they spread, and never shove a star further than RIPPLE_MAX", () => {
  const reach = 400;
  const t = PERIOD * 10 + 0.4;
  const rings = ringsAt(t);
  const peak = (r) => {
    const front = 6 + r.progress * reach;
    let m = 0;
    for (let d = front - 30; d < front + 30; d += 0.5) m = Math.max(m, Math.abs(rippleAt(d, t, reach).shift));
    return m;
  };
  assert.ok(peak(rings[0]) > peak(rings[1]) && peak(rings[1]) > peak(rings[2]));
  for (let d = 0; d < reach * 1.5; d += 1.3) assert.ok(Math.abs(rippleAt(d, t, reach).shift) <= RIPPLE_MAX + 1e-9);
});

test("stars riding a wavefront brighten a little, like light focused by the bend", () => {
  const reach = 400;
  const t = PERIOD * 10 + 0.6;
  const front = 6 + ringsAt(t)[0].progress * reach;
  assert.ok(rippleAt(front, t, reach).glow > 1.1);
  assert.ok(Math.abs(rippleAt(reach * 3, t, reach).glow - 1) < 0.01);
});

test("rings worked out once per frame give the same ripple as working them out per star", () => {
  const t = PERIOD * 7 + 1.1;
  const rings = ringsAt(t);
  for (const d of [3, 50, 140, 260, 390]) assert.deepEqual(rippleAt(d, t, 400, rings), rippleAt(d, t, 400));
});
