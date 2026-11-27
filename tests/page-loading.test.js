import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseHash } from "../js/router.js";
import { DAY_START_HOUR, NIGHT_START_HOUR } from "../js/time-of-day.js";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

/** Modules a module imports statically, as paths like "js/x.js". */
function importsOf(path) {
  const src = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  return [...src.matchAll(/^import [^;]*?from "\.\/([^"]+)";/gm)].map((m) => `js/${m[1]}`);
}

test("every module the page runs is preloaded up front, so none waits on a chain of imports", () => {
  const entries = [...html.matchAll(/<script type="module" src="([^"]+)"/g)].map((m) => m[1]);
  const preloaded = new Set([...html.matchAll(/<link rel="modulepreload" href="([^"]+)"/g)].map((m) => m[1]));
  const seen = new Set();
  const queue = [...entries];
  while (queue.length) {
    const path = queue.pop();
    if (seen.has(path)) continue;
    seen.add(path);
    queue.push(...importsOf(path));
  }
  const imported = [...seen].filter((p) => !entries.includes(p));
  assert.ok(imported.length > 0);
  for (const p of imported) assert.ok(preloaded.has(p), `${p} is imported but not preloaded`);
  for (const p of preloaded) assert.ok(seen.has(p), `${p} is preloaded but never used`);
});

test("the inline day/night script uses the same hours as time-of-day.js", () => {
  const m = html.match(/h>=(\d+)&&h<(\d+)/);
  assert.ok(m, "inline phase script not found in <head>");
  assert.equal(Number(m[1]), DAY_START_HOUR);
  assert.equal(Number(m[2]), NIGHT_START_HOUR);
});

test("the greeting says Greetings", () => {
  assert.match(html, /<h1[^>]*>Greetings\./);
});

test("every in-page link goes somewhere real", () => {
  const hashes = [...html.matchAll(/<a\b[^>]*\shref="(#[^"]*)"/g)].map((m) => m[1]);
  assert.ok(hashes.length >= 4);
  for (const h of hashes) assert.notEqual(parseHash(h).view, "missing", h);
});

test("about and archive exist as static sections the panel can show", () => {
  assert.match(html, /<section id="about"/);
  assert.match(html, /<section id="archive"/);
});

test("each notebook card carries its own illustration, hidden from screen readers", () => {
  const cards = [...html.matchAll(/<a class="card card-(\w+)" href="#(\w+)">([\s\S]*?)<\/a>/g)];
  assert.deepEqual(cards.map((m) => m[1]), ["notes", "questions", "about"]);
  for (const [, name, hash, inner] of cards) {
    assert.equal(name, hash);
    assert.match(inner, /<svg class="card-art"[^>]*aria-hidden="true"/, name);
    assert.match(inner, /<span class="card-title">/, name);
  }
});

test("every gradient, filter and shape the card art paints with exists exactly once", () => {
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const refs = [...html.matchAll(/url\(#([^)]+)\)|<use href="#([^"]+)"/g)].map((m) => m[1] ?? m[2]);
  assert.ok(refs.length > 0, "the card art should paint with shared gradients and filters");
  for (const ref of new Set(refs)) {
    assert.equal(ids.filter((id) => id === ref).length, 1, `#${ref} should be defined exactly once`);
  }
});

test("card and shelf styles are loaded", () => {
  assert.match(html, /<link rel="stylesheet" href="cards\.css">/);
  assert.match(html, /<link rel="stylesheet" href="shelf\.css">/);
});

/** The archive section's markup, which the panel copies in when #archive opens. */
const archive = html.match(/<section id="archive">([\s\S]*?)<\/section>/)[1];

test("the archive is a shelf with an illustrated print for every project", () => {
  const prints = [...archive.matchAll(/<a class="print print-([\w-]+)"[^>]*>([\s\S]*?)<\/a>/g)];
  assert.deepEqual(prints.map((m) => m[1]), ["two-eyes", "atmo", "notify"]);
  for (const [whole, name, inner] of prints) {
    assert.match(whole, /data-action="[^"]+"/, `${name} needs the words for the open button`);
    assert.match(whole, /aria-label="[^"]+"/, name);
    assert.match(inner, /<svg class="print-art"[^>]*aria-hidden="true"/, name);
    assert.match(inner, /<span class="print-type">[^<]+<\/span>/, name);
    assert.match(inner, /<strong class="print-title">[^<]+<\/strong>/, name);
  }
});

test("the print index lists every print on the shelf, each with a thumbnail, title and what it does", () => {
  const onShelf = [...archive.matchAll(/class="print print-[\w-]+"[^>]*data-print="([\w-]+)"/g)].map((m) => m[1]);
  const entries = [...archive.matchAll(/<button type="button" data-goto="([\w-]+)">([\s\S]*?)<\/button>/g)];
  assert.equal(onShelf.length, 3);
  assert.deepEqual(entries.map((m) => m[1]), onShelf);
  for (const [, name, inner] of entries) {
    assert.match(inner, /<span class="index-thumb" aria-hidden="true">/, name);
    assert.match(inner, /<strong>[^<]+<\/strong><small>[^<]+<\/small>/, name);
  }
});

test("the shelf has previous, open and next controls, hidden until the script wakes them", () => {
  const controls = archive.match(/<div class="shelf-controls"([^>]*)>([\s\S]*?)<\/div>/);
  assert.ok(controls, "shelf controls not found");
  assert.match(controls[1], /\shidden/);
  assert.match(controls[2], /<button type="button" data-step="-1" aria-label="Previous print">/);
  assert.match(controls[2], /<a class="shelf-open"/);
  assert.match(controls[2], /<button type="button" data-step="1" aria-label="Next print">/);
  assert.match(controls[2], /class="shelf-status[^"]*"[^>]*aria-live="polite"/);
});

test("nothing in the archive carries an id, since the panel copies it and ids must stay unique", () => {
  assert.doesNotMatch(archive, /\sid="/);
});
