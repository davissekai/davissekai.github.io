/** Panels that can be opened from the URL. */
export const VIEWS = ["notes", "about"];

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
