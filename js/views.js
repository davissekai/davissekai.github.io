import { cleanNotes, noteListHtml, noteHtml } from "./notes.js";

const TITLES = { notes: "Notes", about: "About", archive: "The project shelf" };

/** Shown for any route that doesn't lead anywhere. */
export const MISSING = {
  label: "lost",
  title: "Nothing here",
  html: `<p>That page doesn't exist. <a href="#" data-close>Back to the start</a></p>`,
};

/**
 * Builds the panel content ({ label, title, html, wide? }) for a route. I/O comes in through `io`
 * so this runs the same in the browser and in tests, and a failed fetch becomes a retry
 * message instead of an exception.
 */
export async function viewFor(route, io) {
  try {
    switch (route.view) {
      case "notes":
        return route.slug ? await noteView(route.slug, io) : await notesView(io);
      case "about":
      case "archive": {
        const html = io.staticHtml(route.view);
        if (html === null) return MISSING;
        // The shelf slides sideways, so the archive gets a wide panel.
        return { label: route.view, title: TITLES[route.view], html, wide: route.view === "archive" };
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
