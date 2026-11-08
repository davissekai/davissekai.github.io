import { test } from "node:test";
import assert from "node:assert/strict";
import { pull, WARP_RADIUS, OFF } from "../js/warp.js";

const mouse = { x: 500, y: 300 };

test("stars beyond the warp's reach stay exactly where they are", () => {
  for (const p of [{ x: 500 + WARP_RADIUS + 1, y: 300 }, { x: 0, y: 0 }, { x: 900, y: 700 }]) {
    const before = { ...p };
    assert.deepEqual(pull(p, mouse), before);
  }
});

test("stars inside the warp lean toward the cursor, never past it", () => {
  for (const d of [10, 40, 80, 130]) {
    const p = pull({ x: 500 + d, y: 300 }, mouse);
    assert.ok(p.x < 500 + d && p.x > 500, `star at ${d}px moved to ${p.x}`);
    assert.equal(p.y, 300);
  }
});

test("the pull fades with distance, to nothing at the warp's reach", () => {
  const shift = (d) => 500 + d - pull({ x: 500 + d, y: 300 }, mouse).x;
  assert.ok(shift(WARP_RADIUS - 0.5) < 0.1);
  // Displacement as a share of distance falls off steadily with distance.
  assert.ok(shift(20) / 20 > shift(60) / 60 && shift(60) / 60 > shift(120) / 120);
});

test("a star right under the cursor stays put rather than jumping", () => {
  assert.deepEqual(pull({ x: 500, y: 300 }, mouse), { x: 500, y: 300 });
});

test("with the cursor away (off-canvas), nothing warps", () => {
  assert.deepEqual(pull({ x: 10, y: 10 }, OFF), { x: 10, y: 10 });
});

test("pull keeps a star's other fields, so painted stars keep their colour and brightness", () => {
  const p = pull({ x: 520, y: 300, rgb: [1, 2, 3], a: 0.5 }, mouse);
  assert.deepEqual(p.rgb, [1, 2, 3]);
  assert.equal(p.a, 0.5);
});
