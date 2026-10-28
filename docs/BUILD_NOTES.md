# Domain v1 build notes

## OpenCode
- Confirmed model id: `opencode/glm-5.3-flash-free` with `--variant max` (reasoningEffort: max).
- Every `opencode run` invocation was rejected by Auto-review with "An error occured while classifying this action" (including a trivial READY smoke test). `opencode models` and `opencode run --help` worked.
- Scaffolding was therefore written by Grok Bot to the same brief in `docs/SCAFFOLD_BRIEF.md`, then aesthetic-owned by Grok Bot as requested.

## Architecture (swappable for Three.js later)
- `js/starfield.js` exports `createStarfield(canvas, options)` → `{ start, stop, resize, setPaused, destroy }`. Comment marks the swap point.
- World data in `data/worlds.json`.
- Hash routes `#/world/:id`; Back / Esc / browser Back restore map scroll + focus.

## Aesthetic owned here
- Palette, type (Instrument Serif + Inter + JetBrains Mono), starfield rendering, per-world accents, travel panel, copy polish.
