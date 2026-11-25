import { test } from "node:test";
import assert from "node:assert/strict";
import { phaseAt, DAY_START_HOUR, NIGHT_START_HOUR } from "../js/time-of-day.js";

const at = (h, m = 0) => new Date(2026, 10, 25, h, m);

test("day starts at 06:00 local time", () => {
  assert.equal(phaseAt(at(5, 59)), "night");
  assert.equal(phaseAt(at(6, 0)), "day");
});

test("night starts at 18:00 local time", () => {
  assert.equal(phaseAt(at(17, 59)), "day");
  assert.equal(phaseAt(at(18, 0)), "night");
});

test("midnight and noon land where you'd expect", () => {
  assert.equal(phaseAt(at(0, 0)), "night");
  assert.equal(phaseAt(at(12, 0)), "day");
  assert.equal(phaseAt(at(23, 59)), "night");
});

test("the boundaries are the published constants", () => {
  assert.equal(DAY_START_HOUR, 6);
  assert.equal(NIGHT_START_HOUR, 18);
});
