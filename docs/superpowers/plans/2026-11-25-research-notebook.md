# Research Notebook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the space-themed site with a calm, single-screen research notebook: a nature photo backdrop that follows the visitor's time of day, a "Greetings." home, and pop-up panels for notes, questions, about and archive.

**Architecture:** Static site on GitHub Pages. Logic lives in small pure ES modules (time of day, routing, markdown, notes, questions, scenes, views) that are unit-tested with `node --test`. Three thin DOM modules (`backdrop.js`, `panel.js`, `main.js`) wire them to the page. The URL hash is the single source of truth for which panel is open. Content is plain files in `data/`.

**Tech Stack:** HTML, CSS, vanilla ES modules, the native `<dialog>` element, `node:test`. No dependencies. Fonts are Bricolage Grotesque and JetBrains Mono from Google Fonts.

**Spec:** `docs/superpowers/specs/2026-11-25-research-notebook-design.md`

**Branch:** `redesign/research-notebook` (already created). Never commit to `main`.

**Local server:** `.claude/launch.json` defines `static` (python http.server on 127.0.0.1:8765).

---

## File map

| File | Responsibility |
|---|---|
| `scripts/verify.sh` | Runs the tests and the no-debug-code check |
| `js/time-of-day.js` | `phaseAt(date)` → `"day"` \| `"night"` |
| `js/router.js` | `parseHash(hash)` → `{ view, slug }`; `isSlug` |
| `js/dates.js` | `isIsoDate`, `formatDate` |
| `js/markdown.js` | `escapeHtml`, `renderMarkdown` (small, escaping subset) |
| `js/notes.js` | `cleanNotes`, `noteListHtml`, `noteHtml` |
| `js/questions.js` | `cleanQuestions`, `questionsHtml` |
| `js/scenes.js` | `SCENES`, `sceneFor`, `allScenes` |
| `js/views.js` | `viewFor(route, io)` → panel content `{ label, title, html }` |
| `js/backdrop.js` | DOM: crossfades between two photo layers |
| `js/panel.js` | DOM: wraps the `<dialog>` |
| `js/main.js` | DOM: routing, history, phase ticks, preloading |
| `index.html` | Shell, home screen, static about/archive, dialog |
| `styles.css` | All styles, day/night colour tokens |
| `data/notes/index.json`, `data/notes/*.md`, `data/questions.json` | Content |
| `img/scenes/*.webp`, `img/scenes/SOURCES.md` | Photos and where they came from |

Deleted in Task 9: every old `js/*.js` module except the new ones above, and every old `tests/*.test.js` except `page-loading.test.js` (which is rewritten).

---

### Task 1: Verification script

**Files:**
- Create: `scripts/verify.sh`

- [ ] **Step 1: Write the script**

```bash
#!/usr/bin/env bash
# Runs every check the site has, so "is it done?" has one answer.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "→ unit tests"
npm test --silent

echo "→ no debug code in shipped JS"
if grep -rnE "console\.(log|debug)|debugger" js/; then
  echo "debug code found in js/" >&2
  exit 1
fi

echo "✓ all checks passed"
```

- [ ] **Step 2: Run it**

Run: `bash scripts/verify.sh`
Expected: the existing tests pass and the script ends with `✓ all checks passed`.

- [ ] **Step 3: Commit**

```bash
git add scripts/verify.sh
git commit -m "chore: add verify script for tests and debug-code check"
```

---

### Task 2: Time of day

**Files:**
- Create: `js/time-of-day.js`
- Test: `tests/time-of-day.test.js`

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run the test and check it fails**

Run: `node --test tests/time-of-day.test.js`
Expected: FAIL, cannot find module `../js/time-of-day.js`.

- [ ] **Step 3: Implement**

```js
/** Local hour the day scene starts. Shared with the inline script in index.html (a page test keeps them equal). */
export const DAY_START_HOUR = 6;
/** Local hour the night scene starts. */
export const NIGHT_START_HOUR = 18;

/**
 * Which half of the day a moment falls in, by the visitor's own clock,
 * so the scene behind the page matches what's outside their window.
 */
export function phaseAt(date) {
  const h = date.getHours();
  return h >= DAY_START_HOUR && h < NIGHT_START_HOUR ? "day" : "night";
}
```

- [ ] **Step 4: Run the test and check it passes**

Run: `node --test tests/time-of-day.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add js/time-of-day.js tests/time-of-day.test.js
git commit -m "feat: decide day or night from the visitor's local clock"
```

---

### Task 3: Router

**Files:**
- Create: `js/router.js`
- Test: `tests/router.test.js`

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run the test and check it fails**

Run: `node --test tests/router.test.js`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```js
/** Panels that can be opened from the URL. */
export const VIEWS = ["notes", "questions", "about", "archive"];

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Whether a string is a safe note slug. It is used in file paths and URLs, so the shape is strict. */
export function isSlug(value) {
  return typeof value === "string" && SLUG.test(value);
}

/**
 * Turns a location hash into what the page should show.
 * Unknown hashes become "missing" instead of throwing, so a bad link never breaks the page.
 */
export function parseHash(hash) {
  const raw = String(hash ?? "").replace(/^#/, "");
  if (raw === "") return { view: "home", slug: null };
  const [view, slug, ...rest] = raw.split("/");
  if (!VIEWS.includes(view) || rest.length > 0) return { view: "missing", slug: null };
  if (slug === undefined) return { view, slug: null };
  if (view !== "notes" || !isSlug(slug)) return { view: "missing", slug: null };
  return { view, slug };
}
```

- [ ] **Step 4: Run the test and check it passes**

Run: `node --test tests/router.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add js/router.js tests/router.test.js
git commit -m "feat: parse the URL hash into a panel route"
```

---

### Task 4: Dates and Markdown

**Files:**
- Create: `js/dates.js`, `js/markdown.js`
- Test: `tests/dates.test.js`, `tests/markdown.test.js`

- [ ] **Step 1: Write the failing tests**

`tests/dates.test.js`:

```js
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
```

`tests/markdown.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderMarkdown, escapeHtml } from "../js/markdown.js";

test("paragraphs are split on blank lines and joined within", () => {
  assert.equal(renderMarkdown("one\ntwo\n\nthree"), "<p>one two</p>\n<p>three</p>");
});

test("## and ### become headings", () => {
  assert.equal(renderMarkdown("## Big\n\n### Small"), "<h2>Big</h2>\n<h3>Small</h3>");
});

test("dash lists and numbered lists", () => {
  assert.equal(renderMarkdown("- a\n- b"), "<ul><li>a</li><li>b</li></ul>");
  assert.equal(renderMarkdown("1. a\n2. b"), "<ol><li>a</li><li>b</li></ol>");
});

test("emphasis, strong, inline code", () => {
  assert.equal(renderMarkdown("*a* **b** `c*d*`"), "<p><em>a</em> <strong>b</strong> <code>c*d*</code></p>");
});

test("links: external ones open in a new tab, internal ones don't", () => {
  assert.equal(
    renderMarkdown("[x](https://e.com/a?b=1&c=2)"),
    '<p><a href="https://e.com/a?b=1&amp;c=2" rel="noopener" target="_blank">x</a></p>',
  );
  assert.equal(renderMarkdown("[q](#questions)"), '<p><a href="#questions">q</a></p>');
});

test("raw HTML is shown as text, never run", () => {
  assert.equal(renderMarkdown("<script>alert(1)</script>"), "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>");
  assert.equal(renderMarkdown('`<img src=x onerror="y">`'), "<p><code>&lt;img src=x onerror=&quot;y&quot;&gt;</code></p>");
});

test("javascript: and data: links lose their href", () => {
  assert.equal(renderMarkdown("[x](javascript:alert)"), "<p>x</p>");
  assert.equal(renderMarkdown("[x](JavaScript:void)"), "<p>x</p>");
  assert.equal(renderMarkdown("[x](data:text/html,hi)"), "<p>x</p>");
});

test("empty or missing input renders nothing", () => {
  assert.equal(renderMarkdown(""), "");
  assert.equal(renderMarkdown(undefined), "");
  assert.equal(renderMarkdown("\r\n\r\n"), "");
});

test("escapeHtml covers the five characters that matter", () => {
  assert.equal(escapeHtml(`<a href="x" title='y'>&</a>`), "&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;");
});
```

- [ ] **Step 2: Run the tests and check they fail**

Run: `node --test tests/dates.test.js tests/markdown.test.js`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement `js/dates.js`**

```js
const ISO = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Whether a content file's date is a usable YYYY-MM-DD, so one typo can't break sorting or display. */
export function isIsoDate(value) {
  return typeof value === "string" && ISO.test(value);
}

/** "2026-11-25" → "25 Nov 2026". Written by hand so it reads the same in every locale. */
export function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}
```

- [ ] **Step 4: Implement `js/markdown.js`**

```js
const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const SAFE_URL = /^(https?:\/\/|mailto:|#|\/)/i;

/** Makes text safe to drop into HTML, including attribute values. */
export function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ESC[c]);
}

/**
 * Renders the small Markdown subset notes are written in: paragraphs, ##/### headings,
 * lists, links, emphasis and inline code. Everything is escaped first, so a note can never inject markup.
 */
export function renderMarkdown(source) {
  return String(source ?? "")
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map(renderBlock)
    .join("\n");
}

/** One blank-line-separated block → one HTML element. */
function renderBlock(block) {
  const lines = block.split("\n").map((l) => l.trim());
  const heading = lines.length === 1 && lines[0].match(/^(#{2,3}) (.+)$/);
  if (heading) {
    const level = heading[1].length;
    return `<h${level}>${renderInline(heading[2])}</h${level}>`;
  }
  if (lines.every((l) => /^[-*] /.test(l))) {
    return `<ul>${lines.map((l) => `<li>${renderInline(l.slice(2))}</li>`).join("")}</ul>`;
  }
  if (lines.every((l) => /^\d+\. /.test(l))) {
    return `<ol>${lines.map((l) => `<li>${renderInline(l.replace(/^\d+\. /, ""))}</li>`).join("")}</ol>`;
  }
  return `<p>${renderInline(lines.join(" "))}</p>`;
}

/** Inline formatting. Code spans are cut out first so their contents stay literal. */
function renderInline(text) {
  return text
    .split(/(`[^`]*`)/)
    .map((part, i) => (i % 2 === 1 ? `<code>${escapeHtml(part.slice(1, -1))}</code>` : renderEmphasis(renderLinks(escapeHtml(part)))))
    .join("");
}

/** [text](url). Unsafe schemes keep the text and drop the link. */
function renderLinks(escaped) {
  return escaped.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => {
    if (!SAFE_URL.test(url)) return label;
    const external = /^https?:/i.test(url) ? ' rel="noopener" target="_blank"' : "";
    return `<a href="${url}"${external}>${label}</a>`;
  });
}

/** **strong** before *em*, so the double asterisks aren't read as two single ones. */
function renderEmphasis(html) {
  return html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\*([^*]+)\*/g, "<em>$1</em>");
}
```

- [ ] **Step 5: Run the tests and check they pass**

Run: `node --test tests/dates.test.js tests/markdown.test.js`
Expected: PASS (11 tests).

- [ ] **Step 6: Commit**

```bash
git add js/dates.js js/markdown.js tests/dates.test.js tests/markdown.test.js
git commit -m "feat: escaping markdown renderer and date helpers for notes"
```

---

### Task 5: Notes

**Files:**
- Create: `js/notes.js`
- Test: `tests/notes.test.js`

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run the test and check it fails**

Run: `node --test tests/notes.test.js`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```js
import { escapeHtml, renderMarkdown } from "./markdown.js";
import { isIsoDate, formatDate } from "./dates.js";
import { isSlug } from "./router.js";

/**
 * Validates and sorts data/notes/index.json. Entries with a bad slug, title or date are dropped
 * so one typo in a hand-edited file hides one note, not the whole list.
 */
export function cleanNotes(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((n) => n && isSlug(n.slug) && typeof n.title === "string" && n.title.trim() !== "" && isIsoDate(n.date))
    .map((n) => ({
      slug: n.slug,
      title: n.title.trim(),
      date: n.date,
      label: typeof n.label === "string" && n.label.trim() !== "" ? n.label.trim() : "note",
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** The notes panel: one row per note, each linking to #notes/<slug>. */
export function noteListHtml(notes) {
  if (notes.length === 0) return `<p class="empty">No notes yet. Soon.</p>`;
  const rows = notes.map(
    (n) =>
      `<li><a href="#notes/${n.slug}"><span class="label">${escapeHtml(n.label)}</span>` +
      `<span class="title">${escapeHtml(n.title)}</span>` +
      `<time datetime="${n.date}">${formatDate(n.date)}</time></a></li>`,
  );
  return `<ol class="entries">${rows.join("")}</ol>`;
}

/** One note's body. The title goes in the panel heading, so it isn't repeated here. */
export function noteHtml(note, body) {
  return (
    `<p class="meta"><time datetime="${note.date}">${formatDate(note.date)}</time></p>` +
    `<div class="prose">${renderMarkdown(body)}</div>` +
    `<p><a class="back" href="#notes">← all notes</a></p>`
  );
}
```

- [ ] **Step 4: Run the test and check it passes**

Run: `node --test tests/notes.test.js`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add js/notes.js tests/notes.test.js
git commit -m "feat: validate, sort and render notes"
```

---

### Task 6: Questions

**Files:**
- Create: `js/questions.js`
- Test: `tests/questions.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanQuestions, questionsHtml } from "../js/questions.js";

const q = (o = {}) => ({ id: "q1", text: "Why?", status: "open", added: "2026-11-25", ...o });

test("chasing comes first, then open, then dropped; newest first within each", () => {
  const out = cleanQuestions([
    q({ id: "d", status: "dropped" }),
    q({ id: "o-old", added: "2026-01-01" }),
    q({ id: "c", status: "chasing" }),
    q({ id: "o-new", added: "2026-11-30" }),
  ]);
  assert.deepEqual(out.map((x) => x.id), ["c", "o-new", "o-old", "d"]);
});

test("unknown statuses, empty text and bad dates are skipped", () => {
  const out = cleanQuestions([q(), q({ id: "b", status: "solved" }), q({ id: "c", text: "" }), q({ id: "d", added: "soon" }), null]);
  assert.deepEqual(out.map((x) => x.id), ["q1"]);
});

test("the note is optional and must be text", () => {
  assert.equal(cleanQuestions([q({ note: 3 })])[0].note, null);
  assert.equal(cleanQuestions([q({ note: "maybe" })])[0].note, "maybe");
});

test("each question shows its status and escapes its text", () => {
  const html = questionsHtml(cleanQuestions([q({ text: "<i>x</i>", status: "chasing", note: "a & b" })]));
  assert.match(html, /class="status status-chasing">chasing</);
  assert.match(html, /&lt;i&gt;x&lt;\/i&gt;/);
  assert.match(html, /a &amp; b/);
});

test("no questions says so", () => {
  assert.match(questionsHtml([]), /No questions yet/);
});
```

- [ ] **Step 2: Run the test and check it fails**

Run: `node --test tests/questions.test.js`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```js
import { escapeHtml } from "./markdown.js";
import { isIsoDate } from "./dates.js";

/** Display order: what's being worked on now, then what's waiting, then what was let go. */
const STATUSES = ["chasing", "open", "dropped"];

/** Validates and orders data/questions.json. Bad entries are dropped rather than breaking the panel. */
export function cleanQuestions(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (q) =>
        q && typeof q.id === "string" && typeof q.text === "string" && q.text.trim() !== "" &&
        STATUSES.includes(q.status) && isIsoDate(q.added),
    )
    .map((q) => ({
      id: q.id,
      text: q.text.trim(),
      status: q.status,
      added: q.added,
      note: typeof q.note === "string" && q.note.trim() !== "" ? q.note.trim() : null,
    }))
    .sort((a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || b.added.localeCompare(a.added));
}

/** The questions panel: status tag, the question, and an optional aside. */
export function questionsHtml(questions) {
  if (questions.length === 0) return `<p class="empty">No questions yet.</p>`;
  const rows = questions.map(
    (q) =>
      `<li class="is-${q.status}"><span class="status status-${q.status}">${q.status}</span>` +
      `<p>${escapeHtml(q.text)}</p>` +
      (q.note ? `<p class="aside">${escapeHtml(q.note)}</p>` : "") +
      `</li>`,
  );
  return `<ol class="questions">${rows.join("")}</ol>`;
}
```

- [ ] **Step 4: Run the test and check it passes**

Run: `node --test tests/questions.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add js/questions.js tests/questions.test.js
git commit -m "feat: validate, order and render research questions"
```

---

### Task 7: Scenes

**Files:**
- Create: `js/scenes.js`
- Test: `tests/scenes.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { SCENES, sceneFor, allScenes } from "../js/scenes.js";

test("home, notes, questions and about each have a day and a night photo", () => {
  for (const view of ["home", "notes", "questions", "about"]) {
    assert.match(SCENES[view].day, /^img\/scenes\/[a-z]+-day\.webp$/, view);
    assert.match(SCENES[view].night, /^img\/scenes\/[a-z]+-night\.webp$/, view);
  }
});

test("views without their own scene borrow home's", () => {
  assert.equal(sceneFor("archive", "day"), SCENES.home.day);
  assert.equal(sceneFor("missing", "night"), SCENES.home.night);
});

test("a view's scene follows the phase", () => {
  assert.equal(sceneFor("notes", "night"), SCENES.notes.night);
});

test("every photo is listed exactly once for preloading", () => {
  const all = allScenes();
  assert.equal(all.length, 8);
  assert.equal(new Set(all).size, 8);
});
```

- [ ] **Step 2: Run the test and check it fails**

Run: `node --test tests/scenes.test.js`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```js
/** Which photo sits behind each view, by day and by night. Swap a photo by overwriting its file. */
export const SCENES = {
  home: { day: "img/scenes/home-day.webp", night: "img/scenes/home-night.webp" },
  notes: { day: "img/scenes/notes-day.webp", night: "img/scenes/notes-night.webp" },
  questions: { day: "img/scenes/questions-day.webp", night: "img/scenes/questions-night.webp" },
  about: { day: "img/scenes/about-day.webp", night: "img/scenes/about-night.webp" },
};

/** The photo for a view at a phase. Archive and "missing" share home's sky, so every route has a scene. */
export function sceneFor(view, phase) {
  return (SCENES[view] ?? SCENES.home)[phase];
}

/** Every photo, for quiet preloading once the page is idle. */
export function allScenes() {
  return Object.values(SCENES).flatMap((s) => [s.day, s.night]);
}
```

- [ ] **Step 4: Run the test and check it passes**

Run: `node --test tests/scenes.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add js/scenes.js tests/scenes.test.js
git commit -m "feat: map each view and time of day to a scene photo"
```

---

### Task 8: Views (panel content per route)

**Files:**
- Create: `js/views.js`
- Test: `tests/views.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { viewFor, MISSING } from "../js/views.js";

const NOTES = [{ slug: "first", title: "First", date: "2026-11-25", label: "field note" }];
const QUESTIONS = [{ id: "q", text: "Why rivers?", status: "open", added: "2026-11-25" }];

/** Fake I/O so views can be tested without a browser or network. */
function io({ fail = false } = {}) {
  const files = { "data/notes/index.json": NOTES, "data/questions.json": QUESTIONS, "data/notes/first.md": "Hello." };
  return {
    fetchJson: async (url) => {
      if (fail) throw new Error("offline");
      return files[url];
    },
    fetchText: async (url) => {
      if (fail) throw new Error("offline");
      return files[url];
    },
    staticHtml: (id) => (id === "about" ? "<p>me</p>" : null),
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

test("about and archive come from static page content", async () => {
  assert.equal((await viewFor({ view: "about", slug: null }, io())).html, "<p>me</p>");
  assert.deepEqual(await viewFor({ view: "archive", slug: null }, io()), MISSING);
});

test("unknown routes are 'nothing here'", async () => {
  assert.deepEqual(await viewFor({ view: "missing", slug: null }, io()), MISSING);
});

test("a failed load offers a retry for the same hash", async () => {
  const v = await viewFor({ view: "notes", slug: "first" }, io({ fail: true }));
  assert.match(v.html, /Couldn't load this right now/);
  assert.match(v.html, /href="#notes\/first" data-retry/);
});
```

- [ ] **Step 2: Run the test and check it fails**

Run: `node --test tests/views.test.js`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```js
import { cleanNotes, noteListHtml, noteHtml } from "./notes.js";
import { cleanQuestions, questionsHtml } from "./questions.js";

const TITLES = { notes: "Notes", questions: "Open questions", about: "About", archive: "Archive" };

/** Shown for any route that doesn't lead anywhere. */
export const MISSING = {
  label: "lost",
  title: "Nothing here",
  html: `<p>That page doesn't exist. <a href="#">Back to the start</a></p>`,
};

/**
 * Builds the panel content ({ label, title, html }) for a route. I/O comes in through `io`
 * so this runs the same in the browser and in tests, and a failed fetch becomes a retry
 * message instead of an exception.
 */
export async function viewFor(route, io) {
  try {
    switch (route.view) {
      case "notes":
        return route.slug ? await noteView(route.slug, io) : await notesView(io);
      case "questions": {
        const questions = cleanQuestions(await io.fetchJson("data/questions.json"));
        return { label: "questions", title: TITLES.questions, html: questionsHtml(questions) };
      }
      case "about":
      case "archive": {
        const html = io.staticHtml(route.view);
        return html === null ? MISSING : { label: route.view, title: TITLES[route.view], html };
      }
      default:
        return MISSING;
    }
  } catch {
    return failed(route);
  }
}

/** The list of all notes. */
async function notesView(io) {
  const notes = cleanNotes(await io.fetchJson("data/notes/index.json"));
  return { label: "notes", title: TITLES.notes, html: noteListHtml(notes) };
}

/** One note. The index is checked first, so only listed slugs are ever fetched. */
async function noteView(slug, io) {
  const note = cleanNotes(await io.fetchJson("data/notes/index.json")).find((n) => n.slug === slug);
  if (!note) return MISSING;
  const body = await io.fetchText(`data/notes/${slug}.md`);
  return { label: note.label, title: note.title, html: noteHtml(note, body) };
}

/** Retry message. The slug was validated by the router, so it is safe in an href. */
function failed(route) {
  const hash = route.slug ? `#${route.view}/${route.slug}` : `#${route.view}`;
  return {
    label: route.view,
    title: "Couldn't load this",
    html: `<p>Couldn't load this right now. <a href="${hash}" data-retry>Try again</a></p>`,
  };
}
```

- [ ] **Step 4: Run the test and check it passes**

Run: `node --test tests/views.test.js`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add js/views.js tests/views.test.js
git commit -m "feat: build panel content for every route, with retry on failure"
```

---

### Task 9: Page shell, DOM wiring, and retiring the space theme

**Files:**
- Create: `js/backdrop.js`, `js/panel.js`, `js/main.js`
- Replace: `index.html`, `styles.css`, `tests/page-loading.test.js`
- Delete: every other file in `js/` and `tests/` (the space theme)

- [ ] **Step 1: Delete the space theme**

```bash
cd js && git rm -q annotations.js arrival.js chart-warp.js chart.js comet.js frame-budget.js galaxies.js galaxy-stars.js glyph-points.js nav.js nebula-worker.js nebula.js pulsar.js sky.js sprites.js star-layers.js timeline.js trail.js transmission.js visit.js warp.js when-needed.js worlds.js zoomed-sky.js && cd ..
cd tests && git rm -q annotations.test.js frame-budget.test.js galaxies.test.js glyph-points.test.js nebula.test.js pulsar.test.js sky.test.js star-layers.test.js timeline.test.js trail.test.js visit.test.js warp.test.js && cd ..
```

Then `ls js tests`. Expected: only the new modules and tests from Tasks 2–8, plus `page-loading.test.js`.

- [ ] **Step 2: Rewrite the page test (failing)**

`tests/page-loading.test.js`:

```js
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
```

Run: `node --test tests/page-loading.test.js`
Expected: FAIL (the old index.html has no `Greetings.`, no inline phase script, and its preloads point at deleted files).

- [ ] **Step 3: Write `js/backdrop.js`**

```js
/**
 * Crossfades the full-screen photo behind the page. Two stacked layers take turns being in front:
 * the next photo is loaded off-screen first, so a fade never reveals a blank frame. A photo that
 * fails to load leaves the current one (or the CSS sky gradient) in place.
 */
export function createBackdrop(root) {
  const layers = [...root.querySelectorAll(".scene")];
  let front = 0;
  let shown = null;
  let wanted = null;

  return {
    /** Fade to `src`. If several calls race, only the latest one wins. */
    show(src) {
      if (src === wanted) return;
      wanted = src;
      const img = new Image();
      img.onload = () => {
        if (wanted !== src) return;
        const back = layers[1 - front];
        back.style.backgroundImage = `url("${src}")`;
        back.classList.add("is-shown");
        layers[front].classList.remove("is-shown");
        front = 1 - front;
        shown = src;
      };
      img.onerror = () => {
        if (wanted === src) wanted = shown;
      };
      img.src = src;
    },
    /** Warm the browser cache so later scene changes are instant. */
    preload(srcs) {
      for (const src of srcs) new Image().src = src;
    },
  };
}
```

- [ ] **Step 4: Write `js/panel.js`**

```js
/**
 * Wraps the page's single <dialog>. It never closes itself: Esc, the close button and a click
 * outside all call `onDismiss`, and main.js decides what that means for the URL. That keeps the
 * hash the one source of truth. The native modal handles the focus trap and returns focus to the card.
 */
export function createPanel(dialog, { onDismiss }) {
  const label = dialog.querySelector(".panel-label");
  const title = dialog.querySelector(".panel-title");
  const body = dialog.querySelector(".panel-body");
  let meantToBeOpen = false;

  // Chrome may close a modal on a repeated Esc even when "cancel" is prevented.
  // If it closes without hide() asking, treat that as a dismiss so the URL catches up.
  dialog.addEventListener("close", () => {
    if (meantToBeOpen) {
      meantToBeOpen = false;
      onDismiss();
    }
  });
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    onDismiss();
  });
  // The dialog element has no padding, so a click that lands on it (not its contents) is on the backdrop.
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) onDismiss();
  });
  dialog.querySelector(".panel-close").addEventListener("click", onDismiss);

  return {
    show(content) {
      label.textContent = content.label;
      title.textContent = content.title;
      body.innerHTML = content.html;
      body.scrollTop = 0;
      meantToBeOpen = true;
      if (!dialog.open) dialog.showModal();
    },
    hide() {
      meantToBeOpen = false;
      if (dialog.open) dialog.close();
    },
  };
}
```

- [ ] **Step 5: Write `js/main.js`**

```js
import { parseHash } from "./router.js";
import { phaseAt } from "./time-of-day.js";
import { sceneFor, allScenes } from "./scenes.js";
import { viewFor } from "./views.js";
import { createBackdrop } from "./backdrop.js";
import { createPanel } from "./panel.js";

const root = document.documentElement;
const backdrop = createBackdrop(document.querySelector(".backdrop"));
const panel = createPanel(document.getElementById("panel"), { onDismiss: dismiss });

/** Real network I/O for views.js. A non-2xx response counts as a failure, so views show the retry. */
const io = {
  fetchJson: (url) => fetchOk(url).then((r) => r.json()),
  fetchText: (url) => fetchOk(url).then((r) => r.text()),
  staticHtml: (id) => document.getElementById(id)?.innerHTML ?? null,
};

let phase = phaseAt(new Date());
let route = parseHash(location.hash);
let renderToken = 0;
let closing = false;

/** fetch that rejects on HTTP errors, not just on network errors. */
async function fetchOk(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response;
}

/** Brings the scene and the panel in line with the current route and phase. */
async function render() {
  const token = ++renderToken;
  root.dataset.phase = phase;
  backdrop.show(sceneFor(route.view, phase));
  if (route.view === "home") {
    panel.hide();
    return;
  }
  const content = await viewFor(route, io);
  // A newer navigation started while this one was loading; let it win.
  if (token !== renderToken) return;
  panel.show(content);
}

/** Reads the URL and renders it. Runs on load, on back and forward, and after in-page links. */
function go() {
  route = parseHash(location.hash);
  render();
}

/**
 * Closes the panel. If panels were opened from inside the site, step back through that history,
 * so the back button stays honest. If the visitor landed on a deep link, replace it with home instead.
 */
function dismiss() {
  const depth = history.state?.depth ?? 0;
  if (depth > 0) {
    closing = true;
    history.go(-depth);
  } else {
    closeHere();
  }
}

/** Swaps the current entry for home, used when there's no in-site history to step back through. */
function closeHere() {
  history.replaceState(null, "", location.pathname + location.search);
  go();
}

// In-page links push history with a depth counter, which dismiss() uses to unwind.
document.addEventListener("click", (event) => {
  const link = event.target.closest('a[href^="#"]');
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
  event.preventDefault();
  if (link.hasAttribute("data-retry")) {
    render();
    return;
  }
  const href = link.getAttribute("href");
  const next = parseHash(href);
  const depth = next.view === "home" ? 0 : (history.state?.depth ?? 0) + 1;
  history.pushState({ depth }, "", next.view === "home" ? location.pathname + location.search : href);
  go();
});

// After dismiss() steps back, the entry it lands on may itself be a deep link (e.g. the visitor
// arrived on #notes, then opened a note). In that case finish closing by replacing it with home.
window.addEventListener("popstate", () => {
  if (closing) {
    closing = false;
    if (parseHash(location.hash).view !== "home") {
      closeHere();
      return;
    }
  }
  go();
});

/** Re-checks the clock, and crossfades the scene if day just turned to night or back. */
function checkPhase() {
  const next = phaseAt(new Date());
  if (next !== phase) {
    phase = next;
    render();
  }
}
setInterval(checkPhase, 60_000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) checkPhase();
});

const whenIdle = window.requestIdleCallback ?? ((fn) => setTimeout(fn, 2000));
window.addEventListener("load", () => whenIdle(() => backdrop.preload(allScenes())), { once: true });

go();
```

Note: `render()` on a phase change while a panel is open re-renders the same content, which also picks up the night colours. That is intended.

- [ ] **Step 6: Write `index.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Davis Dey · research notebook</title>
  <meta name="description" content="Davis Dey's research notebook: notes, open questions, and the work so far.">
  <!-- Mirrors phaseAt() in js/time-of-day.js (a test keeps the hours equal) so night visitors never see a day flash before the modules load. -->
  <script>(function(h){var d=document.documentElement;d.classList.add("js");d.dataset.phase=h>=6&&h<18?"day":"night";})(new Date().getHours());</script>
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
  <link rel="modulepreload" href="js/router.js">
  <link rel="modulepreload" href="js/time-of-day.js">
  <link rel="modulepreload" href="js/scenes.js">
  <link rel="modulepreload" href="js/views.js">
  <link rel="modulepreload" href="js/notes.js">
  <link rel="modulepreload" href="js/questions.js">
  <link rel="modulepreload" href="js/markdown.js">
  <link rel="modulepreload" href="js/dates.js">
  <link rel="modulepreload" href="js/backdrop.js">
  <link rel="modulepreload" href="js/panel.js">
  <script type="module" src="js/main.js"></script>
</head>
<body>
  <div class="backdrop" aria-hidden="true">
    <div class="scene"></div>
    <div class="scene"></div>
    <div class="veil"></div>
  </div>

  <main class="home">
    <header class="greeting">
      <h1>Greetings. <span>I'm Davis.</span></h1>
      <p class="intro">I've just started a master's and I'm still working out what to research. This notebook is where I do that thinking in the open.</p>
    </header>

    <div class="dock">
      <nav class="cards" aria-label="Notebook">
        <a class="card" href="#notes"><span class="label">notes</span><span class="card-title">What I'm reading and thinking</span></a>
        <a class="card" href="#questions"><span class="label">questions</span><span class="card-title">What I'm circling</span></a>
        <a class="card" href="#about"><span class="label">about</span><span class="card-title">Who I am</span></a>
      </nav>
      <footer class="corner">
        <a href="#archive">archive</a>
        <a href="mailto:davisdey001@gmail.com" aria-label="Email Davis"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><rect x="3" y="5.5" width="18" height="13" rx="1.5"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/></svg></a>
        <a href="https://github.com/davissekai" target="_blank" rel="noopener noreferrer" aria-label="Davis on GitHub"><svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.58.23 2.75.11 3.04.74.8 1.18 1.83 1.18 3.08 0 4.41-2.69 5.38-5.26 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z"/></svg></a>
        <a href="https://x.com/Davis_P1" target="_blank" rel="noopener noreferrer" aria-label="Davis on X"><svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.4l-5.8-7.59-6.64 7.59H.47l8.6-9.83L0 1.15h7.6l5.24 6.93Zm-1.29 19.5h2.04L6.49 3.24H4.3Z"/></svg></a>
      </footer>
    </div>
  </main>

  <!-- Source for the About and Archive panels. Hidden when JS runs; readable as a plain page when it doesn't. -->
  <div class="nojs-only">
    <section id="about">
      <p>I'm Davis Dey. I build at the meeting point of climate and AI: rivers watched from orbit, carbon markets that let small players in, and tools for people who usually get left out of both.</p>
      <p>I've just started a master's. I don't have a research topic yet, and that's the point of this notebook: the reading, the half-formed questions, and the narrowing-down, done where anyone can watch.</p>
      <p>Have a question you think I should chase? <a href="mailto:davisdey001@gmail.com">Write to me</a>, or find me on <a href="https://x.com/Davis_P1" target="_blank" rel="noopener noreferrer">X</a> and <a href="https://github.com/davissekai" target="_blank" rel="noopener noreferrer">GitHub</a>.</p>
    </section>
    <section id="archive">
      <ol class="entries">
        <li><a href="https://two-eyes-vert.vercel.app" target="_blank" rel="noopener noreferrer"><span class="label">remote sensing</span><span class="title">Two Eyes</span><span class="aside">A phone video of a muddy river, matched to the mining scar upstream in Sentinel-2.</span></a></li>
        <li><a href="https://atmo-v2.vercel.app" target="_blank" rel="noopener noreferrer"><span class="label">climate ai</span><span class="title">Atmo</span><span class="aside">Ask the climate anything: Article 6, loss and damage, adaptation finance, answered plainly.</span></a></li>
        <li><a href="https://mvp-six-vert.vercel.app/" target="_blank" rel="noopener noreferrer"><span class="label">climate game</span><span class="title">VentureQuest</span><span class="aside">Run a climate startup and live with every trade-off.</span></a></li>
        <li><a href="https://github.com/davissekai/opencode-notify-crossx" target="_blank" rel="noopener noreferrer"><span class="label">developer tool</span><span class="title">notify-crossx</span><span class="aside">Pings your desktop when your AI coding agent is done or needs you.</span></a></li>
        <li><span class="row"><span class="label">research in progress</span><span class="title">Carbon Markets for SMEs</span><span class="aside">What it would take for small Ghanaian businesses to enter carbon markets on their own terms.</span></span></li>
      </ol>
    </section>
  </div>

  <dialog id="panel" class="panel" aria-labelledby="panel-title">
    <div class="panel-inner">
      <header class="panel-head">
        <span class="panel-label label"></span>
        <h2 id="panel-title" class="panel-title"></h2>
        <button class="panel-close" type="button" aria-label="Close">×</button>
      </header>
      <div class="panel-body"></div>
    </div>
  </dialog>
</body>
</html>
```

- [ ] **Step 7: Write `styles.css`**

```css
*, *::before, *::after { box-sizing: border-box; }

/* Day tokens. Night overrides them below; the phase is set on <html> before first paint. */
:root {
  --font: "Bricolage Grotesque", system-ui, sans-serif;
  --mono: "JetBrains Mono", ui-monospace, monospace;
  --paper: rgba(255, 253, 247, 0.86);
  --ink: #1c2731;
  --muted: #5b6b76;
  --line: rgba(28, 39, 49, 0.12);
  --veil: linear-gradient(180deg, rgba(10, 25, 40, 0) 40%, rgba(10, 25, 40, 0.35));
  --sky: linear-gradient(180deg, #3f8fdc, #b9dbf6);
  --open: #2f6f4f;
  --chasing: #a85a14;
  --dropped: #7a7f85;
  --focus: #ffd166;
  color-scheme: light;
}
:root[data-phase="night"] {
  --paper: rgba(16, 22, 32, 0.84);
  --ink: #e8edf2;
  --muted: #9ba9b5;
  --line: rgba(232, 237, 242, 0.14);
  --veil: linear-gradient(180deg, rgba(3, 8, 18, 0.35), rgba(3, 8, 18, 0.6));
  --sky: linear-gradient(180deg, #040a18, #16233d);
  --open: #7fd1a4;
  --chasing: #f0a868;
  --dropped: #8d949b;
  color-scheme: dark;
}

html, body { margin: 0; height: 100%; }
body { font-family: var(--font); color: var(--ink); background: var(--sky) fixed; }
.js body { overflow: hidden; }

/* Backdrop: two photo layers that take turns, a veil for legibility, and the sky gradient as fallback. */
.backdrop { position: fixed; inset: 0; z-index: -1; background: var(--sky); }
.scene { position: absolute; inset: 0; background: center / cover no-repeat; opacity: 0; transition: opacity 1.2s ease; }
.scene.is-shown { opacity: 1; }
.veil { position: absolute; inset: 0; background: var(--veil); }

/* Home: one screen. The greeting sits at the top, the cards and links at the bottom. */
.home {
  height: 100dvh;
  display: grid;
  grid-template-rows: 1fr auto;
  gap: 2rem;
  padding: clamp(1.25rem, 4vw, 3.5rem);
}
.greeting { align-self: start; max-width: 42rem; color: #fff; text-shadow: 0 1px 18px rgba(0, 0, 0, 0.35); }
.greeting h1 { margin: 0 0 1rem; font-size: clamp(2.6rem, 7vw, 5.5rem); font-weight: 700; line-height: 0.98; letter-spacing: -0.02em; }
.greeting h1 span { display: block; }
.intro { margin: 0; max-width: 30rem; font-size: clamp(1rem, 1.6vw, 1.2rem); line-height: 1.5; }

.dock { display: flex; flex-wrap: wrap; align-items: end; justify-content: space-between; gap: 1.5rem; }
.cards { display: flex; flex-wrap: wrap; gap: 1rem; }
.card {
  display: flex; flex-direction: column; gap: 0.6rem;
  width: 13.5rem; padding: 1rem 1.1rem 1.2rem;
  background: var(--paper); color: var(--ink); text-decoration: none;
  border-radius: 14px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(10px);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.card:hover, .card:focus-visible { transform: translateY(-4px) rotate(-0.6deg); box-shadow: 0 16px 40px rgba(0, 0, 0, 0.24); }
.card-title { font-size: 1.15rem; font-weight: 600; line-height: 1.2; }
.label { font-family: var(--mono); font-size: 0.72rem; color: var(--muted); }

.corner { display: flex; align-items: center; gap: 1rem; font-family: var(--mono); font-size: 0.8rem; }
.corner a { color: #fff; text-shadow: 0 1px 8px rgba(0, 0, 0, 0.4); }
.corner svg { display: block; width: 20px; height: 20px; filter: drop-shadow(0 1px 6px rgba(0, 0, 0, 0.4)); }

a:focus-visible, button:focus-visible { outline: 2px solid var(--focus); outline-offset: 3px; }

/* Static source for about/archive: hidden when JS runs, a plain readable block when it doesn't. */
.js .nojs-only { display: none; }
.nojs-only { max-width: 40rem; margin: 2rem auto; padding: 1.5rem; background: var(--paper); border-radius: 14px; line-height: 1.6; }

/* The panel. */
.panel {
  width: min(40rem, 92vw); max-height: 82dvh; padding: 0; border: 0;
  border-radius: 18px; background: var(--paper); color: var(--ink);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.35); backdrop-filter: blur(14px);
}
.panel[open] { animation: rise 0.25s ease-out; }
.panel::backdrop { background: rgba(5, 12, 20, 0.2); backdrop-filter: blur(6px); }
@keyframes rise { from { opacity: 0; transform: translateY(12px) scale(0.98); } }
.panel-inner { display: flex; flex-direction: column; max-height: 82dvh; }
.panel-head {
  display: grid; grid-template-columns: 1fr auto; gap: 0.25rem 1rem;
  padding: 1.4rem 1.6rem 1rem; border-bottom: 1px solid var(--line);
}
.panel-title { grid-column: 1; margin: 0; font-size: 1.7rem; line-height: 1.15; }
.panel-close {
  grid-column: 2; grid-row: 1 / span 2; align-self: start;
  width: 2.25rem; height: 2.25rem; border: 0; border-radius: 50%;
  background: var(--line); color: var(--ink); font: inherit; font-size: 1.3rem; cursor: pointer;
}
.panel-body { overflow: auto; padding: 1.2rem 1.6rem 1.6rem; line-height: 1.6; }
.panel-body a { color: inherit; }

/* Lists inside panels. */
.entries, .questions { margin: 0; padding: 0; list-style: none; }
.entries a, .entries .row {
  display: grid; grid-template-columns: 1fr auto; gap: 0.15rem 1rem;
  padding: 0.8rem 0; border-bottom: 1px solid var(--line); text-decoration: none;
}
.entries .label, .entries .aside { grid-column: 1 / -1; }
.entries .title { font-weight: 600; }
.entries time, .meta { font-family: var(--mono); font-size: 0.75rem; color: var(--muted); }
.meta { margin: 0 0 1rem; }
.questions li { padding: 0.8rem 0; border-bottom: 1px solid var(--line); }
.questions p { margin: 0.25rem 0 0; }
.questions .is-dropped p:first-of-type { color: var(--muted); text-decoration: line-through; }
.status { font-family: var(--mono); font-size: 0.72rem; }
.status-open { color: var(--open); }
.status-chasing { color: var(--chasing); }
.status-dropped { color: var(--dropped); }
.aside { color: var(--muted); font-size: 0.92rem; }
.empty { color: var(--muted); }
.prose h2, .prose h3 { margin: 1.4em 0 0.4em; line-height: 1.2; }
.prose code { padding: 0.1em 0.35em; border-radius: 4px; background: var(--line); font-family: var(--mono); font-size: 0.88em; }
.back { font-family: var(--mono); font-size: 0.8rem; }

/* Phones: cards stack into slim rows so the home screen still fits without scrolling. */
@media (max-width: 600px) {
  .dock { flex-direction: column; align-items: stretch; }
  .cards { flex-direction: column; gap: 0.6rem; }
  .card { width: 100%; flex-direction: row; align-items: baseline; justify-content: space-between; padding: 0.8rem 1rem; }
  .card-title { font-size: 1rem; text-align: right; }
  .corner { justify-content: space-between; }
}

@media (prefers-reduced-motion: reduce) {
  .scene, .card { transition: none; }
  .panel[open] { animation: none; }
}
```

- [ ] **Step 8: Run the full suite**

Run: `bash scripts/verify.sh`
Expected: every test passes (page-loading included) and the script ends with `✓ all checks passed`.

- [ ] **Step 9: Commit**

```bash
git add -A js tests index.html styles.css
git commit -m "feat: research notebook shell replaces the space theme

One-screen home with Greetings, pop-up panels driven by the URL hash,
and a day/night backdrop. The old space modules and tests are removed;
the projects move to the archive panel."
```

---

### Task 10: Starting content

**Files:**
- Create: `data/notes/index.json`, `data/notes/starting-the-masters.md`, `data/questions.json`

- [ ] **Step 1: Write the content as drafts for Davis to edit**

`data/notes/index.json`:

```json
[
  { "slug": "starting-the-masters", "title": "Starting the master's", "date": "2026-11-25", "label": "field note" }
]
```

`data/notes/starting-the-masters.md`:

```markdown
I started my master's this term. People keep asking what I'm researching, and the honest answer is: I don't know yet.

That's what this notebook is for. Instead of disappearing for a year and coming back with a thesis, I'm going to think out loud here: what I'm reading, the questions that won't leave me alone, and the ones I drop along the way.

## Where I'm starting from

- Rivers, mining, and what satellites can prove
- Who actually gets to take part in carbon markets
- Tools that make climate knowledge less gated

If any of that overlaps with what you're working on, [write to me](mailto:davisdey001@gmail.com).
```

`data/questions.json`:

```json
[
  { "id": "satellite-evidence", "text": "Can satellite imagery count as evidence that communities can actually use against illegal mining?", "status": "open", "added": "2026-11-25" },
  { "id": "smes-carbon", "text": "What stops small businesses in Ghana from entering carbon markets: cost, knowledge, or who sets the rules?", "status": "open", "added": "2026-11-25" },
  { "id": "plain-climate", "text": "Does making climate policy easier to read change who takes part in it?", "status": "open", "added": "2026-11-25", "note": "Came out of building Atmo." }
]
```

- [ ] **Step 2: Check that the content parses through the real modules**

Run:

```bash
node --input-type=module -e "
import { readFileSync } from 'node:fs';
import { cleanNotes } from './js/notes.js';
import { cleanQuestions } from './js/questions.js';
const n = JSON.parse(readFileSync('data/notes/index.json','utf8'));
const q = JSON.parse(readFileSync('data/questions.json','utf8'));
if (cleanNotes(n).length !== n.length || cleanQuestions(q).length !== q.length) throw new Error('content has invalid entries');
process.stdout.write('content ok\n');
"
```

Expected: `content ok`.

- [ ] **Step 3: Commit**

```bash
git add data
git commit -m "feat: first note and seed research questions (drafts)"
```

---

### Task 11: Scene photos

**Files:**
- Create: `img/scenes/{home,notes,questions,about}-{day,night}.webp`, `img/scenes/SOURCES.md`

- [ ] **Step 1: Propose candidates and get Davis's OK before downloading anything**

Search Unsplash for 2–3 candidates per slot. The photos must have no buildings and no people as the subject, must be landscape-oriented, and need calm space on the top left for the greeting.

| Slot | Look for |
|---|---|
| home-day | towering cumulus, deep blue sky |
| home-night | clear starry sky over a low horizon |
| notes-day | still lake with reflections |
| notes-night | moonlit water |
| questions-day | green rolling grass or hills |
| questions-night | dark field under stars |
| about-day | light through forest |
| about-night | forest at dusk or night |

Show Davis the candidate page URLs per slot and wait for picks. Downloading files needs Davis's explicit yes.

- [ ] **Step 2: Download the picks as WebP through Unsplash's CDN**

For each pick, take the image's `images.unsplash.com/photo-…` URL and request it resized and in WebP:

```bash
mkdir -p img/scenes
curl -sSL "https://images.unsplash.com/photo-<ID>?fm=webp&w=2400&q=72" -o img/scenes/home-day.webp
```

Then check the sizes:

```bash
ls -l img/scenes/*.webp
```

Each file must be at most about 350 KB. If one is bigger, download it again with `q=60`, then `w=2000`.

- [ ] **Step 3: Record the sources**

`img/scenes/SOURCES.md`: one line per file, in the form `home-day.webp: <unsplash page URL>, <photographer name>`. This file is for the repo only and is not shown on the site.

- [ ] **Step 4: Commit**

```bash
git add img/scenes
git commit -m "feat: day and night scene photos for every view"
```

---

### Task 12: Browser verification

- [ ] **Step 1:** Start the `static` preview server (launch.json) and open `http://127.0.0.1:8765/`.
- [ ] **Step 2:** Check that the console is clean and that no network request returns 404.
- [ ] **Step 3:** Check that the home screen fits without scrolling at 1440×900, 768×1024 and 375×812. Check that "Greetings. I'm Davis." and the three cards are visible.
- [ ] **Step 4:** Click each card and check the following:
  - the panel opens and the hash updates;
  - the scene crossfades;
  - Esc closes the panel, as do the × button and a click outside;
  - focus returns to the card.
- [ ] **Step 5:** Notes: open the list, then the note. The back button returns to the list, then to home. Open a note from the list, then press × and check that home shows with no panel. Load `/#notes`, open the note, press × and check that home shows (the deep-link case). Press Esc twice quickly and check that the URL and the panel agree. Load `/#notes/starting-the-masters` directly and dismiss it: the URL becomes `/` and the page doesn't navigate away.
- [ ] **Step 6:** Load `/#nope` and `/#notes/nope`. Both show "Nothing here".
- [ ] **Step 7:** Night: run `document.documentElement.dataset.phase = "night"` and check the night colours. Then test a real flip by overriding `Date` before load (navigate with an init script that sets the hours to 19) and confirm that the night photo loads.
- [ ] **Step 8:** Rename `data/questions.json` temporarily, open Questions and check that the retry message shows. Put the file back and check that the retry works.
- [ ] **Step 9:** Take screenshots of home (day and night), an open panel, and mobile. Share them with Davis.
- [ ] **Step 10:** Run `bash scripts/verify.sh` once more, then open a PR from `redesign/research-notebook` to `main`.

---

## Open item for Davis (not blocking the build)

- **About text and seed content** are drafts written from what's on the current site. Davis should edit them, and may want to add the name of the master's program.
