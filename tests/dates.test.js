import { test } from "node:test";
import assert from "node:assert/strict";
import { isIsoDate, formatDate } from "../js/dates.js";

test("only real-looking YYYY-MM-DD dates are accepted", () => {
  assert.ok(isIsoDate("2026-11-25"));
  for (const bad of ["2026-13-01", "2026-00-10", "2026-11-32", "25-11-2026", "2026-1-5", "", null, 20261125]) {
    assert.ok(!isIsoDate(bad), String(bad));
  }
});

test("dates read as day, short month, year", () => {
  assert.equal(formatDate("2026-11-25"), "25 Nov 2026");
  assert.equal(formatDate("2027-01-03"), "3 Jan 2027");
});

test("dates that don't exist on the calendar are rejected", () => {
  assert.ok(!isIsoDate("2026-02-31"));
  assert.ok(!isIsoDate("2026-04-31"));
  assert.ok(!isIsoDate("2026-02-29"));
  assert.ok(isIsoDate("2024-02-29"));
});
