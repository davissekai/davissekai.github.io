import { test } from "node:test";
import assert from "node:assert/strict";
import { progress, easeInOutCubic } from "../js/timeline.js";

test("progress is 0 before a phase starts and 1 after it ends", () => {
  assert.equal(progress(0.5, 1, 2), 0);
  assert.equal(progress(4, 1, 2), 1);
});

test("progress is linear inside the phase", () => {
  assert.equal(progress(2, 1, 2), 0.5);
});

test("zero-duration phase snaps instead of dividing by zero", () => {
  assert.equal(progress(0.99, 1, 0), 0);
  assert.equal(progress(1, 1, 0), 1);
});

test("easeInOutCubic pins endpoints and midpoint, and stays monotonic", () => {
  assert.equal(easeInOutCubic(0), 0);
  assert.equal(easeInOutCubic(1), 1);
  assert.equal(easeInOutCubic(0.5), 0.5);
  let prev = 0;
  for (let i = 1; i <= 100; i++) {
    const v = easeInOutCubic(i / 100);
    assert.ok(v >= prev);
    prev = v;
  }
});
