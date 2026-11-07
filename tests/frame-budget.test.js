import { test } from "node:test";
import assert from "node:assert/strict";
import { createFrameBudget } from "../js/frame-budget.js";

/** Feeds `count` identical frame times into a budget. */
function feed(budget, ms, count) {
  for (let i = 0; i < count; i++) budget.record(ms);
}

test("starts at full quality", () => {
  assert.equal(createFrameBudget().quality, 1);
});

test("a single slow frame among fast ones does not lower quality", () => {
  const budget = createFrameBudget({ budgetMs: 10, window: 20 });
  feed(budget, 4, 19);
  budget.record(80);
  feed(budget, 4, 40);
  assert.equal(budget.quality, 1);
});

test("sustained frames at twice the budget roughly halve quality", () => {
  const budget = createFrameBudget({ budgetMs: 10, window: 20 });
  feed(budget, 20, 20);
  assert.ok(budget.quality <= 0.55 && budget.quality >= 0.45, `got ${budget.quality}`);
});

test("quality never drops below the floor, however slow the device", () => {
  const budget = createFrameBudget({ budgetMs: 10, window: 10, min: 0.3 });
  feed(budget, 500, 200);
  assert.equal(budget.quality, 0.3);
});

test("quality recovers gradually on fast frames and never exceeds full", () => {
  const budget = createFrameBudget({ budgetMs: 10, window: 10, min: 0.2 });
  feed(budget, 100, 50);
  const low = budget.quality;
  feed(budget, 1, 10);
  assert.ok(budget.quality > low, "should recover after a fast window");
  assert.ok(budget.quality < 1, "should not jump straight back to full");
  feed(budget, 1, 1000);
  assert.equal(budget.quality, 1);
});

test("ignores samples that are not real durations", () => {
  const budget = createFrameBudget({ budgetMs: 10, window: 5 });
  for (const bad of [NaN, -5, Infinity, undefined]) feed(budget, bad, 5);
  assert.equal(budget.quality, 1);
});
