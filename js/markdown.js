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
