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
