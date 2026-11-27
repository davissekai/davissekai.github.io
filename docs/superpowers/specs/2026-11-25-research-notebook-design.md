# The research notebook: site redesign

Date: 2026-11-25
Status: approved, implemented

## Why

Davis has started a master's and now presents as a researcher, though the topic is still open. The current site ("The Domain") is a space spectacle built to show off projects. The new site is a calm, outdoor notebook that grows as the research takes shape. The inspiration is the "boring mode" of itsdavis.com: flat, quiet and characterful, with things that open when you tap them. Like that page, it has no 3D.

## What a visitor sees

### Home: one screen, no scrolling

- A full-bleed nature photo with a soft veil so the text stays readable.
- Top left: **"Greetings. I'm Davis."** in large type, followed by a two-line intro: a master's student working out what to research, thinking in public.
- Below that are three paper-like cards with small monospace labels, each topped with a textured print illustration (inline SVG) that has its own day and night palette:
  - `notes`: what I'm reading and thinking (a book on a picnic blanket by a mountain lake)
  - `questions`: what I'm circling (a kite looping over ploughed hills)
  - `about`: who I am (a tent and campfire under the mountains)
- Hovering or focusing a card wakes its print a little: the kite tugs, the fire flickers, the tea steams.
- A small `archive` link to past projects.
- Social links in a corner.
- The page never scrolls at any viewport size. On small phones the cards stack and shrink, and only the inside of a panel scrolls.

### Panels: tap something and it pops up

- One reusable panel floats in the centre of the screen.
- Opening a panel blurs the backdrop slightly and crossfades it to that section's scene.
- Esc, the close button, tapping outside the panel, or the browser back button all close it. Focus moves into the panel when it opens and returns to the card that opened it when it closes.
- Each panel has its own URL hash, so links can point straight at it:
  - `#notes`: a dated list of notes, newest first. Each item shows its label, title and date.
  - `#notes/<slug>`: a single note, shown inside the same panel with a "← all notes" link.
  - `#questions`: a list of research questions, each with a status of `open`, `chasing` or `dropped`, plus an optional one-line comment.
  - `#about`: a short bio, the master's program, and contact details.
  - `#archive`: "The project shelf", a wide panel laid out like the shelf on itsdavis.com. The projects (Two Eyes, Atmo, notify-crossx) stand as illustrated paper prints on a wooden ledge, in a coverflow: the middle print faces you and its neighbours turn away. Wheel, trackpad, touch, Tab and the ←/→ buttons slide it (the buttons wrap round), and clicking a side print brings it to the middle. Under the ledge, a dark pill opens the middle print and names what it does. Each print has its own day and night palette, a type label and a title. A "Print index" pill lists the prints with thumbnails and jumps to any of them.
- An unknown hash or slug shows a short "nothing here" message in the panel. It does not break the page.

## Scenes and time of day

Each view has a scene, and each scene comes in a day version and a night version.

| View      | Day                    | Night                       |
|-----------|------------------------|-----------------------------|
| home      | forest light (shared with about) | forest at night (shared with about) |
| notes     | still water, lake      | moonlit water               |
| questions | grassy hills, green    | dark field under the stars  |
| about     | forest light           | forest at dusk or night     |

- The visitor's local time picks the version. **Day runs from 06:00 to 17:59; night runs from 18:00 to 05:59.**
- The time is checked again every minute. If the clock crosses a boundary while the page is open, the scene crossfades to the other version.
- At night the veil darkens, and the panels and cards switch to dark paper with light text. These are colour tokens on the page root, not a second stylesheet.
- When `prefers-reduced-motion` is on, scenes swap instantly with no crossfade, and the card prints stay still.

### Photos

- The photos come from Unsplash or Pexels, whose free licenses allow this use. Pinterest is ruled out because its images are usually reposted with no license.
- No on-page photo credits. Neither license requires attribution, and the source URL for each photo is recorded in `img/scenes/SOURCES.md` in the repo.
- The photos are self-hosted in `img/scenes/` as WebP, about 2400px wide, at most about 400 KB each. Home reuses the about photos, so that makes 6 photos in all.
- Only the current scene loads at first. The other scenes load quietly after the page is idle, so the first crossfade has no blank frame.
- Davis can replace any photo with their own by overwriting the file of the same name.

## Content: adding notes without touching code

- `data/notes/index.json` lists the notes. Each entry has `slug`, `title`, `date` (YYYY-MM-DD) and `label` (e.g. `reading`, `field note`, `idea`).
- `data/notes/<slug>.md` holds the body of each note.
- `data/questions.json` lists the questions. Each entry has `id`, `text`, `status` (`open` | `chasing` | `dropped`), `added` (date) and an optional `note`.
- A small built-in Markdown renderer covers paragraphs, `##`/`###` headings, links, emphasis, inline code and lists. Raw HTML in notes is escaped, so it never runs.
- GitHub Pages can't list folders, which is why notes need the index file. Adding a note means writing the `.md` file and adding one line to the index.
- The site launches with one real first note ("Starting the master's") and a few seed questions that Davis writes or approves.

## Tech

- Plain HTML, CSS and ES modules on GitHub Pages, as now. No frameworks and no new dependencies.
- The space theme is retired: its `js/` modules, tests, styles and fonts are removed. The project list moves into the archive panel. Git history keeps the old site.
- New modules, grouped by feature:
  - `js/time-of-day.js`: maps a `Date` to `day` or `night`.
  - `js/scenes.js`: maps a view and time to a photo.
  - `js/backdrop.js`: preloads the photos and crossfades between them.
  - `js/panel.js`: opening and closing, focus handling, the dialog itself.
  - `js/router.js`: parses a hash into a view and slug.
  - `js/main.js`: wires everything together and syncs the hash with the browser history.
  - `js/notes.js`: loads the index and note files and renders them.
  - `js/markdown.js`: the small, escaping Markdown renderer.
  - `js/questions.js`: loads and renders the questions.
- Fonts: one display face for the greeting and one monospace face for labels, both from Google Fonts: Bricolage Grotesque and DM Mono.

## Errors and edge cases

- If a data file fails to load, the panel shows "couldn't load this right now" with a retry link. The home screen still works.
- If a photo fails to load, the veil colour shows on its own (a sky-blue gradient by day, deep navy by night), so the page is never blank.
- With JavaScript off, the home screen and the cards still render. The cards fall back to anchor links into a plain no-JS section listing the about text and archive links. Notes need JS.

## Testing

Unit tests run with `node --test`, as now, and are written before the code:

- `time-of-day`: the boundaries at 05:59, 06:00, 17:59 and 18:00.
- `router`: `#notes/slug` parses correctly; empty, unknown and malformed hashes fall back safely.
- `markdown`: each supported construct renders; HTML and `javascript:` links are escaped or stripped.
- `notes` and `questions`: newest-first sorting, the status filter, and malformed entries skipped without crashing.
- `scenes`: every view has both a day and a night photo.

Then a browser check: open and close each panel, the back button, focus, day vs night (with a mocked clock), a mobile viewport, and screenshots for review.

## Out of scope for now

- A reading-list page, which can be added later as another panel.
- Search, RSS, comments and analytics.
- More than two times of day (dawn and dusk phases).
