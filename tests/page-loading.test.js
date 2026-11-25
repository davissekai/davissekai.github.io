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
  const hashes = [...html.matchAll(/href="(#[^"]*)"/g)].map((m) => m[1]);
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

test("card styles are loaded", () => {
  assert.match(html, /<link rel="stylesheet" href="cards\.css">/);
});
