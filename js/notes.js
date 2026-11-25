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
