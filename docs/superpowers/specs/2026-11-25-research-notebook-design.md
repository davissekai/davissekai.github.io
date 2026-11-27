# The research notebook: site redesign

Date: 2026-11-25
Status: approved, implemented

## Why

Davis has started a master's and now presents as a researcher, though the topic is still open. The current site ("The Domain") is a space spectacle built to show off projects. The new site is a calm, outdoor notebook that grows as the research takes shape. The inspiration is the "boring mode" of itsdavis.com: flat, quiet and characterful, with things that open when you tap them. Like that page, it has no 3D.

## What a visitor sees

### Home: one screen, no scrolling

- A full-bleed nature photo with a soft veil so the text stays readable.
- Top left: **"Greetings. I'm Davis."** in large type, followed by a two-line intro: a master's student working out what to research, thinking in public.
- Under the intro, two plain underlined links, as on itsdavis.com: "What I'm reading and thinking" (`#notes`) and "Who I am" (`#about`).
- The project shelf, a full-width band under the greeting, after the shelf on itsdavis.com: "The project shelf" heading, a hint, and a "Print index" pill (thumbnails, title, one line each). Current projects (Tally, notify-crossx) stand as big illustrated paper prints on a wooden ledge, side by side. The print under the mouse is in focus: it faces you and the other turns away, and a click opens it. On phones the shelf scrolls and the print in the middle is in focus; tapping the other brings it over. Tab and the ←/→ buttons (which stop at either end, no loop) move focus too; under the ledge a dark pill opens the print in focus and names what it does. The prints are painted after Van Gogh in inline SVG (short dashed brushstrokes, swirling skies, a paint filter for brush edges and thick impasto): Tally is a cypress and wheatfield by day and a starry night after dark, and notify-crossx a blue room in the manner of his bedroom in Arles. Email, GitHub and X sit top right.
- The page fits one screen when it can; when the shelf doesn't fit under the greeting, the home page scrolls. Only the inside of a panel scrolls when a panel is open.

### Panels: tap something and it pops up

- One reusable panel floats in the centre of the screen.
- Opening a panel blurs the backdrop slightly and crossfades it to that section's scene.
- Esc, the close button, tapping outside the panel, or the browser back button all close it. Focus moves into the panel when it opens and returns to the link that opened it when it closes.
- Each panel has its own URL hash, so links can point straight at it:
  - `#notes`: a dated list of notes, newest first. Each item shows its label, title and date.
  - `#notes/<slug>`: a single note, shown inside the same panel with a "← all notes" link.
  - `#about`: a short bio, the master's program, and contact details.
- An unknown hash or slug shows a short "nothing here" message in the panel. It does not break the page.

## Scenes and time of day

Each view has a scene, and each scene comes in a day version and a night version.

| View      | Day                    | Night                       |
|-----------|------------------------|-----------------------------|
| home      | forest light (shared with about) | forest at night (shared with about) |
| notes     | still water, lake      | moonlit water               |
| about     | forest light           | forest at dusk or night     |

- The visitor's local time picks the version. **Day runs from 06:00 to 17:59; night runs from 18:00 to 05:59.**
- The time is checked again every minute. If the clock crosses a boundary while the page is open, the scene crossfades to the other version.
- At night the veil darkens, and the panels and prints switch to dark paper with light text. These are colour tokens on the page root, not a second stylesheet.
- When `prefers-reduced-motion` is on, scenes swap instantly with no crossfade, and the shelf jumps between prints instead of sliding.

### Photos

- The photos come from Unsplash or Pexels, whose free licenses allow this use. Pinterest is ruled out because its images are usually reposted with no license.
- No on-page photo credits. Neither license requires attribution, and the source URL for each photo is recorded in `img/scenes/SOURCES.md` in the repo.
- The photos are self-hosted in `img/scenes/` as WebP, about 2400px wide, at most about 400 KB each. Home reuses the about photos, so that makes 6 photos in all.
- Only the current scene loads at first. The other scenes load quietly after the page is idle, so the first crossfade has no blank frame.
- Davis can replace any photo with their own by overwriting the file of the same name.

## Content: adding notes without touching code

- `data/notes/index.json` lists the notes. Each entry has `slug`, `title`, `date` (YYYY-MM-DD) and `label` (e.g. `reading`, `field note`, `idea`).
- `data/notes/<slug>.md` holds the body of each note.
- A small built-in Markdown renderer covers paragraphs, `##`/`###` headings, links, emphasis, inline code and lists. Raw HTML in notes is escaped, so it never runs.
- GitHub Pages can't list folders, which is why notes need the index file. Adding a note means writing the `.md` file and adding one line to the index.
- The site launches with one real first note ("Starting the master's").

## Tech

- Plain HTML, CSS and ES modules on GitHub Pages, as now. No frameworks and no new dependencies.
- The space theme is retired: its `js/` modules, tests, styles and fonts are removed. The project list moves onto the home page as the project shelf. Git history keeps the old site.
- New modules, grouped by feature:
  - `js/time-of-day.js`: maps a `Date` to `day` or `night`.
  - `js/scenes.js`: maps a view and time to a photo.
  - `js/backdrop.js`: preloads the photos and crossfades between them.
  - `js/panel.js`: opening and closing, focus handling, the dialog itself.
  - `js/router.js`: parses a hash into a view and slug.
  - `js/main.js`: wires everything together and syncs the hash with the browser history.
  - `js/notes.js`: loads the index and note files and renders them.
  - `js/markdown.js`: the small, escaping Markdown renderer.
- Fonts: one display face for the greeting and one monospace face for labels, both from Google Fonts: Bricolage Grotesque and DM Mono.

## Errors and edge cases

- If a data file fails to load, the panel shows "couldn't load this right now" with a retry link. The home screen still works.
- If a photo fails to load, the veil colour shows on its own (a sky-blue gradient by day, deep navy by night), so the page is never blank.
- With JavaScript off, the home screen and the shelf still render (the prints sit side by side as plain links). The notebook links fall back to anchor links into a plain no-JS section with the about text. Notes need JS.

## Testing

Unit tests run with `node --test`, as now, and are written before the code:

- `time-of-day`: the boundaries at 05:59, 06:00, 17:59 and 18:00.
- `router`: `#notes/slug` parses correctly; empty, unknown and malformed hashes fall back safely.
- `markdown`: each supported construct renders; HTML and `javascript:` links are escaped or stripped.
- `notes`: newest-first sorting and malformed entries skipped without crashing.
- `scenes`: every view has both a day and a night photo.

Then a browser check: open and close each panel, the back button, focus, day vs night (with a mocked clock), a mobile viewport, and screenshots for review.

## Out of scope for now

- A reading-list page, which can be added later as another panel.
- Search, RSS, comments and analytics.
- More than two times of day (dawn and dusk phases).
