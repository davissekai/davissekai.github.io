import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

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

test("the brush font is fetched for just the characters the page writes in it", () => {
  const link = html.match(/family=Ma\+Shan\+Zheng[^"]*/);
  assert.ok(link, "no Ma Shan Zheng stylesheet");
  const text = decodeURIComponent(new URL(`https://x/?${link[0]}`).searchParams.get("text") ?? "");
  assert.ok(text.length > 0, "Ma Shan Zheng isn't subset with text=");
  const used = new Set(html.match(/[一-鿿]/g));
  for (const ch of used) assert.ok(text.includes(ch), `${ch} is on the page but not in the font subset`);
  // The arrival draws 人皇 from this font too (arrival.js), even before it's in the page text.
  for (const ch of "人皇") assert.ok(text.includes(ch));
});

test("the brush font isn't also requested in full alongside the subset", () => {
  const sheets = [...html.matchAll(/fonts\.googleapis\.com\/css2\?([^"]+)"/g)].map((m) => m[1]);
  const full = sheets.filter((q) => q.includes("Ma+Shan+Zheng") && !q.includes("text="));
  assert.deepEqual(full, []);
});
