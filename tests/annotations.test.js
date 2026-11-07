import { test } from "node:test";
import assert from "node:assert/strict";
import { GALAXIES, galaxyShape } from "../js/galaxies.js";
import { layoutLabels, shapeBox } from "../js/annotations.js";

// Label sizes measured from the page (CSS px): desktop at 1.15rem, phone at 1rem.
const DESKTOP = { "two-eyes": [104, 44], atmo: [92, 44], venturequest: [128, 44], "notify-crossx": [124, 44], "carbon-markets": [204, 44] };
const PHONE = { "two-eyes": [92, 40], atmo: [80, 40], venturequest: [112, 40], "notify-crossx": [108, 40], "carbon-markets": [180, 40] };

// Frame sizes with the heading block each one shows, in frame coordinates.
const FRAMES = [
  { w: 1440, h: 900, head: { x: 101, y: 126, w: 360, h: 62 }, sizes: DESKTOP },
  { w: 1280, h: 680, head: { x: 90, y: 96, w: 360, h: 62 }, sizes: DESKTOP },
  { w: 991, h: 745, head: { x: 69, y: 104, w: 360, h: 62 }, sizes: DESKTOP },
  { w: 768, h: 1024, head: { x: 54, y: 143, w: 360, h: 62 }, sizes: DESKTOP },
  { w: 375, h: 760, head: { x: 16, y: 92, w: 343, h: 74 }, sizes: PHONE },
  { w: 360, h: 640, head: { x: 16, y: 92, w: 328, h: 74 }, sizes: PHONE },
];
const EDGE = 12;

/** Lays out every project label for one frame. */
function layout({ w, h, head, sizes }) {
  const items = GALAXIES.map((g) => ({ id: g.id, shape: galaxyShape(g.id, w, h), w: sizes[g.id][0], h: sizes[g.id][1] }));
  return { items, labels: layoutLabels(items, { w, h, edge: EDGE, avoid: [head] }) };
}

/** Overlap area of two boxes. */
function overlap(a, b) {
  const x = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const y = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return x > 0 && y > 0 ? x * y : 0;
}

/** Shortest distance from a point to a box (0 inside it). */
function distToBox(px, py, b) {
  const dx = Math.max(b.x - px, 0, px - (b.x + b.w));
  const dy = Math.max(b.y - py, 0, py - (b.y + b.h));
  return Math.hypot(dx, dy);
}

const at = (f) => `${f.w}x${f.h}`;

test("every project gets exactly one label, keeping its size", () => {
  for (const f of FRAMES) {
    const { labels } = layout(f);
    assert.deepEqual(labels.map((l) => l.id).sort(), GALAXIES.map((g) => g.id).sort());
    for (const l of labels) assert.deepEqual([l.w, l.h], f.sizes[l.id]);
  }
});

test("labels stay fully on screen, clear of the edge", () => {
  for (const f of FRAMES) {
    for (const l of layout(f).labels) {
      assert.ok(l.x >= EDGE && l.y >= EDGE, `${l.id} off the top/left at ${at(f)}`);
      assert.ok(l.x + l.w <= f.w - EDGE && l.y + l.h <= f.h - EDGE, `${l.id} off the bottom/right at ${at(f)}`);
    }
  }
});

test("no two labels overlap", () => {
  for (const f of FRAMES) {
    const { labels } = layout(f);
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        assert.equal(overlap(labels[i], labels[j]), 0, `${labels[i].id} overlaps ${labels[j].id} at ${at(f)}`);
      }
    }
  }
});

test("no label covers the heading", () => {
  for (const f of FRAMES) {
    for (const l of layout(f).labels) assert.equal(overlap(l, f.head), 0, `${l.id} covers the heading at ${at(f)}`);
  }
});

test("no label covers a galaxy's bright core", () => {
  for (const f of FRAMES) {
    for (const l of layout(f).labels) {
      for (const g of GALAXIES) {
        const s = galaxyShape(g.id, f.w, f.h);
        const core = { x: s.cx - 10, y: s.cy - 10, w: 20, h: 20 };
        assert.equal(overlap(l, core), 0, `${l.id} covers the core of ${g.id} at ${at(f)}`);
      }
    }
  }
});

test("each label sits close to its own galaxy", () => {
  for (const f of FRAMES) {
    for (const l of layout(f).labels) {
      const near = shapeBox(galaxyShape(l.id, f.w, f.h));
      const gapX = Math.max(near.x - (l.x + l.w), 0, l.x - (near.x + near.w));
      const gapY = Math.max(near.y - (l.y + l.h), 0, l.y - (near.y + near.h));
      assert.ok(Math.hypot(gapX, gapY) <= 48, `${l.id} drifted ${Math.round(Math.hypot(gapX, gapY))}px from its galaxy at ${at(f)}`);
    }
  }
});

test("each leader line runs from its galaxy's rim to its label's edge", () => {
  for (const f of FRAMES) {
    for (const l of layout(f).labels) {
      if (!l.leader) continue;
      const s = galaxyShape(l.id, f.w, f.h);
      const { x1, y1, x2, y2 } = l.leader;
      // The start lies on the galaxy's rim ellipse.
      const c = Math.cos(-s.tilt);
      const n = Math.sin(-s.tilt);
      const u = (x1 - s.cx) * c - (y1 - s.cy) * n;
      const v = (x1 - s.cx) * n + (y1 - s.cy) * c;
      assert.ok(Math.abs(Math.hypot(u / s.a, v / s.b) - 1) < 0.01, `${l.id} leader doesn't start on the rim at ${at(f)}`);
      // The end touches the label box, just outside it.
      assert.ok(distToBox(x2, y2, l) <= 6, `${l.id} leader stops short of its label at ${at(f)}`);
      assert.ok(Math.hypot(x2 - x1, y2 - y1) >= 6);
    }
  }
});

test("most labels get a leader line", () => {
  for (const f of FRAMES) {
    const withLeader = layout(f).labels.filter((l) => l.leader).length;
    assert.ok(withLeader >= 4, `only ${withLeader} leaders at ${at(f)}`);
  }
});

test("an impossible frame still gives finite, on-screen positions", () => {
  const items = GALAXIES.map((g) => ({ id: g.id, shape: galaxyShape(g.id, 200, 160), w: 180, h: 44 }));
  for (const l of layoutLabels(items, { w: 200, h: 160, edge: EDGE })) {
    assert.ok(Number.isFinite(l.x) && Number.isFinite(l.y));
    assert.ok(l.x >= EDGE && l.y >= EDGE && l.y + l.h <= 160 - EDGE);
  }
});

test("no galaxies means no labels", () => {
  assert.deepEqual(layoutLabels([], { w: 800, h: 600 }), []);
});
