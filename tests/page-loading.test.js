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
  assert.ok(hashes.length >= 2);
  for (const h of hashes) assert.notEqual(parseHash(h).view, "missing", h);
});

test("about exists as a static section the panel can show", () => {
  assert.match(html, /<section id="about"/);
});

test("there is no archive: no section, and nothing links to it", () => {
  assert.doesNotMatch(html, /id="archive"/);
  assert.doesNotMatch(html, /href="#archive"/);
});

test("notes and about are plain text links under the intro, not illustrated cards", () => {
  const greeting = html.match(/<header class="greeting">([\s\S]*?)<\/header>/)[1];
  const links = greeting.match(/<nav class="notebook" aria-label="Notebook">([\s\S]*?)<\/nav>/);
  assert.ok(links, "notebook links not found under the intro");
  assert.deepEqual([...links[1].matchAll(/<a href="(#\w+)">[^<]+<\/a>/g)].map((m) => m[1]), ["#notes", "#about"]);
  assert.doesNotMatch(html, /class="card[ "]/);
});

test("every gradient, filter and shape the card art paints with exists exactly once", () => {
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const refs = [...html.matchAll(/url\(#([^)]+)\)|<use href="#([^"]+)"/g)].map((m) => m[1] ?? m[2]);
  assert.ok(refs.length > 0, "the card art should paint with shared gradients and filters");
  for (const ref of new Set(refs)) {
    assert.equal(ids.filter((id) => id === ref).length, 1, `#${ref} should be defined exactly once`);
  }
});

test("the shelf's styles are loaded, and the old card styles are gone", () => {
  assert.match(html, /<link rel="stylesheet" href="shelf\.css">/);
  assert.doesNotMatch(html, /cards\.css/);
});

/** The project shelf, which stands on the home page itself rather than behind a link. */
const shelf = html.match(/<main class="home">[\s\S]*?(<section class="shelf"[\s\S]*?<\/section>)[\s\S]*?<\/main>/)?.[1] ?? "";

test("the project shelf sits on the home page, headed like Cinna's", () => {
  assert.match(shelf, /<section class="shelf" aria-labelledby="shelf-title">/);
  assert.match(shelf, /<h2 id="shelf-title">The project shelf<\/h2>/);
  assert.match(shelf, /<p class="shelf-hint">[^<]+<\/p>/);
  assert.match(shelf, /<div class="shelf-board" aria-hidden="true"><\/div>/);
});

test("the shelf holds an illustrated print for Tally and notify-crossx, each linking out", () => {
  const prints = [...shelf.matchAll(/<a class="print print-([\w-]+)"([^>]*)>([\s\S]*?)<\/a>/g)];
  assert.deepEqual(prints.map((m) => m[1]), ["tally", "notify"]);
  for (const [, name, attrs, inner] of prints) {
    assert.match(attrs, new RegExp(`data-print="${name}"`), name);
    assert.match(attrs, /data-action="[^"]+"/, `${name} needs the words for the open button`);
    assert.match(attrs, /aria-label="[^"]+"/, name);
    assert.match(attrs, /href="https:\/\/github\.com\/davissekai\/[\w-]+"/, name);
    assert.match(attrs, /target="_blank" rel="noopener noreferrer"/, name);
    assert.match(inner, /<svg class="print-art"[^>]*aria-hidden="true"/, name);
    assert.match(inner, /<span class="print-type">[^<]+<\/span>/, name);
    assert.match(inner, /<strong class="print-title">[^<]+<\/strong>/, name);
  }
  assert.match(prints[0][3], /<strong class="print-title">Tally<\/strong>/);
});

test("the print index lists every print, each with a thumbnail, title and what it does", () => {
  const onShelf = [...shelf.matchAll(/class="print print-[\w-]+"[^>]*data-print="([\w-]+)"/g)].map((m) => m[1]);
  const entries = [...shelf.matchAll(/<button type="button" data-goto="([\w-]+)">([\s\S]*?)<\/button>/g)];
  assert.equal(onShelf.length, 2);
  assert.deepEqual(entries.map((m) => m[1]), onShelf);
  for (const [, name, inner] of entries) {
    assert.match(inner, /<span class="index-thumb" aria-hidden="true">/, name);
    assert.match(inner, /<strong>[^<]+<\/strong><small>[^<]+<\/small>/, name);
  }
});

test("the shelf has previous, open and next controls, hidden until the script wakes them", () => {
  const controls = shelf.match(/<div class="shelf-controls"([^>]*)>([\s\S]*?)<\/div>/);
  assert.ok(controls, "shelf controls not found");
  assert.match(controls[1], /\shidden/);
  assert.match(controls[2], /<button type="button" data-step="-1" aria-label="Previous print">/);
  assert.match(controls[2], /<a class="shelf-open"/);
  assert.match(controls[2], /<button type="button" data-step="1" aria-label="Next print">/);
  assert.match(controls[2], /class="shelf-status[^"]*"[^>]*aria-live="polite"/);
});
