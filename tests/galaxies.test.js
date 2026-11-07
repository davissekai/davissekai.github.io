import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSky, GALAXIES, galaxyAt, galaxyShape, distantGalaxies } from "../js/galaxies.js";

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

const PROJECTS = ["two-eyes", "atmo", "venturequest", "notify-crossx", "carbon-markets"];
// Desktop, laptop, and phone-portrait frames; `top` is the blend zone above the frame.
const FRAMES = [
  { w: 1440, h: 900, top: 300 },
  { w: 991, h: 745, top: 260 },
  { w: 375, h: 760, top: 280 },
];

test("there is exactly one galaxy per project", () => {
  assert.deepEqual(GALAXIES.map((g) => g.id).sort(), [...PROJECTS].sort());
});

test("every galaxy star is tagged with its project; field stars carry no tag", () => {
  const sky = buildSky(4000, 1200, 800, seeded(1));
  const tags = new Set(sky.map((s) => s.galaxy));
  for (const id of PROJECTS) assert.ok(tags.has(id), `no stars for ${id}`);
  for (const s of sky.filter((s) => s.still)) assert.equal(s.galaxy, undefined);
});

test("every star carries a brightness between 0 and 1", () => {
  for (const s of buildSky(2000, 1200, 800, seeded(2))) {
    assert.ok(s.bright > 0 && s.bright <= 1, `bright out of range: ${s.bright}`);
  }
});

test("galaxies stay inside their frame, never in the blend zone above it", () => {
  for (const { w, h, top } of FRAMES) {
    for (const s of buildSky(6000, w, h, seeded(3), top).filter((s) => s.galaxy)) {
      for (const t of [0, 300]) {
        const p = s.home(t);
        assert.ok(p.y >= top && p.y <= top + h, `${s.galaxy} star at y=${p.y} outside ${top}..${top + h} (${w}x${h})`);
      }
    }
  }
});

test("galaxies turn slowly: no star drifts more than 6px in a second", () => {
  for (const s of buildSky(6000, 1200, 800, seeded(4))) {
    const a = s.home(10);
    const b = s.home(11);
    assert.ok(Math.hypot(b.x - a.x, b.y - a.y) < 6);
  }
});

test("crowded galaxy cores shine dimmer per star than the arms, so they do not sum to white", () => {
  const w = 1200;
  const h = 800;
  const g = GALAXIES.find((g) => g.id === "two-eyes");
  const stars = buildSky(6000, w, h, seeded(5)).filter((s) => s.galaxy === "two-eyes");
  const byDist = stars
    .map((s) => ({ s, d: Math.hypot(s.home(0).x - g.x * w, s.home(0).y - g.y * h) }))
    .sort((a, b) => a.d - b.d);
  const mean = (xs) => xs.reduce((sum, x) => sum + x.s.bright, 0) / xs.length;
  assert.ok(mean(byDist.slice(0, 150)) < mean(byDist.slice(-800)) * 0.7);
});

test("field stars are marked still and never move; galaxy stars are not still", () => {
  const sky = buildSky(3000, 1200, 800, seeded(6));
  const still = sky.filter((s) => s.still);
  assert.ok(still.length > 0 && still.length < sky.length);
  for (const s of still) assert.deepEqual(s.home(0), s.home(500));
  const moving = sky.filter((s) => !s.still);
  assert.ok(moving.every((s) => s.home(0).x !== s.home(500).x || s.home(0).y !== s.home(500).y));
});

test("pointing at a galaxy's centre finds that galaxy", () => {
  for (const { w, h, top } of FRAMES) {
    for (const g of GALAXIES) assert.equal(galaxyAt(g.x * w, top + g.y * h, w, h, top), g.id);
  }
});

test("empty sky and the blend zone hit no galaxy", () => {
  const { w, h, top } = FRAMES[0];
  assert.equal(galaxyAt(4, top + 4, w, h, top), null);
  assert.equal(galaxyAt(w / 2, top / 2, w, h, top), null);
  assert.equal(galaxyAt(-500, -500, w, h, top), null);
});

test("a galaxy's rim shape is centred on it, inside the frame, wider than it is tall", () => {
  for (const { w, h } of FRAMES) {
    for (const g of GALAXIES) {
      const s = galaxyShape(g.id, w, h);
      assert.ok(Math.abs(s.cx - g.x * w) < 1e-9 && Math.abs(s.cy - g.y * h) < 1e-9);
      assert.ok(s.a > 0 && s.b > 0 && s.b <= s.a, `${g.id} rim axes ${s.a}/${s.b}`);
      assert.equal(s.tilt, g.tilt);
    }
  }
});

test("asking for a galaxy that doesn't exist fails loudly", () => {
  assert.throws(() => galaxyShape("nope", 800, 600), /nope/);
});

test("distant galaxies are small faint smudges spread across the whole canvas", () => {
  const w = 1200;
  const h = 800;
  const top = 250;
  const smudges = distantGalaxies(80, w, h, top, seeded(7));
  assert.equal(smudges.length, 80);
  for (const d of smudges) {
    assert.ok(d.x >= 0 && d.x <= w && d.y >= 0 && d.y <= top + h);
    assert.ok(d.rx > 0 && d.rx <= 6 && d.ry > 0 && d.ry <= d.rx);
    assert.ok(d.alpha > 0 && d.alpha <= 0.6);
  }
});
