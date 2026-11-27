import { test } from "node:test";
import assert from "node:assert/strict";
import { parseHash, isSlug, VIEWS } from "../js/router.js";

test("no hash, or a bare #, is the home screen", () => {
  assert.deepEqual(parseHash(""), { view: "home", slug: null });
  assert.deepEqual(parseHash("#"), { view: "home", slug: null });
  assert.deepEqual(parseHash(undefined), { view: "home", slug: null });
});

test("each panel has its own hash", () => {
  for (const view of VIEWS) assert.deepEqual(parseHash(`#${view}`), { view, slug: null });
});

test("the questions section is gone, so #questions is 'missing'", () => {
  assert.ok(!VIEWS.includes("questions"));
  assert.deepEqual(parseHash("#questions"), { view: "missing", slug: null });
});

test("a single note is #notes/<slug>", () => {
  assert.deepEqual(parseHash("#notes/starting-the-masters"), { view: "notes", slug: "starting-the-masters" });
});

test("anything unrecognised is 'missing' rather than an error", () => {
  for (const bad of ["#nope", "#notes/", "#notes/Bad Slug", "#notes/a/b", "#about/x", "#notes/../x", "#notes/-x"]) {
    assert.deepEqual(parseHash(bad), { view: "missing", slug: null }, bad);
  }
});

test("slugs are lowercase words joined by single dashes", () => {
  assert.ok(isSlug("a"));
  assert.ok(isSlug("week-1-reading"));
  assert.ok(!isSlug("A"));
  assert.ok(!isSlug("a--b"));
  assert.ok(!isSlug(""));
  assert.ok(!isSlug(42));
});
