import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanNotes, noteListHtml, noteHtml } from "../js/notes.js";

const good = (o = {}) => ({ slug: "a", title: "A", date: "2026-11-25", label: "reading", ...o });

test("notes come out newest first", () => {
  const out = cleanNotes([good({ slug: "old", date: "2026-01-01" }), good({ slug: "new", date: "2026-11-30" })]);
  assert.deepEqual(out.map((n) => n.slug), ["new", "old"]);
});

test("broken entries are skipped, not fatal", () => {
  const out = cleanNotes([
    good(),
    null,
    good({ slug: "Bad Slug" }),
    good({ slug: "b", title: "  " }),
    good({ slug: "c", date: "yesterday" }),
    good({ slug: "d", title: 5 }),
  ]);
  assert.deepEqual(out.map((n) => n.slug), ["a"]);
});

test("a missing label falls back to 'note'", () => {
  assert.equal(cleanNotes([good({ label: undefined })])[0].label, "note");
});

test("a non-array index gives no notes", () => {
  assert.deepEqual(cleanNotes({ notes: [] }), []);
  assert.deepEqual(cleanNotes(null), []);
});

test("the list links each note to its own hash and escapes titles", () => {
  const html = noteListHtml(cleanNotes([good({ slug: "x", title: "<b>hi</b>" })]));
  assert.match(html, /href="#notes\/x"/);
  assert.match(html, /&lt;b&gt;hi&lt;\/b&gt;/);
  assert.match(html, /25 Nov 2026/);
});

test("an empty list says so", () => {
  assert.match(noteListHtml([]), /No notes yet/);
});

test("a single note shows its date, its rendered body and a way back", () => {
  const html = noteHtml(cleanNotes([good()])[0], "Hello *there*");
  assert.match(html, /<time datetime="2026-11-25">25 Nov 2026<\/time>/);
  assert.match(html, /<p>Hello <em>there<\/em><\/p>/);
  assert.match(html, /href="#notes"/);
});

test("when a slug repeats, only its first entry in the file is kept", () => {
  const out = cleanNotes([
    good({ slug: "dup", title: "First", date: "2026-01-01" }),
    good({ slug: "dup", title: "Second", date: "2026-12-01" }),
    good({ slug: "other", date: "2026-06-01" }),
  ]);
  assert.deepEqual(out.map((n) => n.slug), ["other", "dup"]);
  assert.equal(out.find((n) => n.slug === "dup").title, "First");
});
