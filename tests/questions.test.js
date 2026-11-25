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
