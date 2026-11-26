import { test } from "node:test";
import assert from "node:assert/strict";
import { viewFor, MISSING } from "../js/views.js";

const NOTES = [{ slug: "first", title: "First", date: "2026-11-25", label: "field note" }];
const QUESTIONS = [{ id: "q", text: "Why rivers?", status: "open", added: "2026-11-25" }];

/** Fake I/O so views can be tested without a browser or network. */
function io({ fail = false, fetched = [] } = {}) {
  const files = { "data/notes/index.json": NOTES, "data/questions.json": QUESTIONS, "data/notes/first.md": "Hello." };
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
    staticHtml: (id) => ({ about: "<p>me</p>", archive: "<p>old stuff</p>" })[id] ?? null,
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

test("#questions renders the questions", async () => {
  const v = await viewFor({ view: "questions", slug: null }, io());
  assert.match(v.html, /Why rivers\?/);
});

test("about and archive show their static page content", async () => {
  assert.equal((await viewFor({ view: "about", slug: null }, io())).html, "<p>me</p>");
  const archive = await viewFor({ view: "archive", slug: null }, io());
  assert.equal(archive.label, "archive");
  assert.equal(archive.title, "Archive");
  assert.equal(archive.html, "<p>old stuff</p>");
});

test("a page with no static content is 'nothing here'", async () => {
  const noStatic = { ...io(), staticHtml: () => null };
  assert.deepEqual(await viewFor({ view: "archive", slug: null }, noStatic), MISSING);
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
