import { test } from "node:test";
import assert from "node:assert/strict";
import { viewFor, MISSING } from "../js/views.js";

const NOTES = [{ slug: "first", title: "First", date: "2026-11-25", label: "field note" }];

/** Fake I/O so views can be tested without a browser or network. */
function io({ fail = false, fetched = [] } = {}) {
  const files = { "data/notes/index.json": NOTES, "data/notes/first.md": "Hello." };
  return {
    fetchJson: async (url) => {
      if (fail) throw new Error("offline");
      return files[url];
    },
    fetchText: async (url) => {
      fetched.push(url);
      if (fail) throw new Error("offline");
      return files[url];
    },
    staticHtml: (id) => ({ about: "<p>me</p>" })[id] ?? null,
  };
}

test("#notes lists the notes", async () => {
  const v = await viewFor({ view: "notes", slug: null }, io());
  assert.equal(v.title, "Notes");
  assert.match(v.html, /href="#notes\/first"/);
});

test("#notes/<slug> shows that note, titled by the note", async () => {
  const v = await viewFor({ view: "notes", slug: "first" }, io());
  assert.equal(v.title, "First");
  assert.equal(v.label, "field note");
  assert.match(v.html, /<p>Hello\.<\/p>/);
});

test("a slug that isn't in the index is 'nothing here'", async () => {
  assert.deepEqual(await viewFor({ view: "notes", slug: "nope" }, io()), MISSING);
});

test("about shows its static page content", async () => {
  const about = await viewFor({ view: "about", slug: null }, io());
  assert.equal(about.title, "About");
  assert.equal(about.html, "<p>me</p>");
});

test("a page with no static content is 'nothing here'", async () => {
  const noStatic = { ...io(), staticHtml: () => null };
  assert.deepEqual(await viewFor({ view: "about", slug: null }, noStatic), MISSING);
});

test("a slug missing from the index is never fetched", async () => {
  const fetched = [];
  await viewFor({ view: "notes", slug: "nope" }, io({ fetched }));
  assert.deepEqual(fetched, []);
});

test("unknown routes are 'nothing here'", async () => {
  assert.deepEqual(await viewFor({ view: "missing", slug: null }, io()), MISSING);
});

test("a failed load offers a retry for the same hash", async () => {
  const v = await viewFor({ view: "notes", slug: "first" }, io({ fail: true }));
  assert.match(v.html, /Couldn't load this right now/);
  assert.match(v.html, /href="#notes\/first" data-retry/);
});

test("the 'Back to the start' link closes the panel instead of pushing history", () => {
  assert.match(MISSING.html, /<a href="#" data-close>/);
});
