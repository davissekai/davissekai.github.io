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

test("asterisks inside a link's address are left alone", () => {
  assert.equal(
    renderMarkdown("[x](https://e.com/a*b*c)"),
    '<p><a href="https://e.com/a*b*c" rel="noopener" target="_blank">x</a></p>',
  );
  assert.equal(
    renderMarkdown("*a [x](https://e.com/*b)"),
    '<p>*a <a href="https://e.com/*b" rel="noopener" target="_blank">x</a></p>',
  );
});

test("link labels and surrounding text still get emphasis", () => {
  assert.equal(
    renderMarkdown("*hi* [*x*](#q) **yo**"),
    '<p><em>hi</em> <a href="#q"><em>x</em></a> <strong>yo</strong></p>',
  );
});

test("one level of parentheses is allowed inside a link address", () => {
  assert.equal(
    renderMarkdown("[x](https://en.wikipedia.org/wiki/Foo_(bar))"),
    '<p><a href="https://en.wikipedia.org/wiki/Foo_(bar)" rel="noopener" target="_blank">x</a></p>',
  );
  assert.equal(renderMarkdown("[x](javascript:alert(1))"), "<p>x</p>");
});

test("protocol-relative addresses are not internal links", () => {
  assert.equal(renderMarkdown("[x](//evil.com)"), "<p>x</p>");
  assert.equal(renderMarkdown("[x](/about)"), '<p><a href="/about">x</a></p>');
});
