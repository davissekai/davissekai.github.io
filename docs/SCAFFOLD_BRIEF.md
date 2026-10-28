# The Domain — scaffolding brief for OpenCode

You are scaffolding a redesign of this static portfolio (GitHub Pages). Branch is already `domain-v1`. Do NOT push. Do NOT invent project facts.

## Goal of THIS pass
Build the **structure and behaviour shell only**. Another human designer will own the aesthetic (starfield look, palette polish, type, travel animation beauty). Keep visual code minimal and swappable — stub interfaces, not pretty CSS.

## Layout (three short scroll sections)
1. **About (hero)** — `#about`
   - Greeting: `Greetings, welcome to my domain.`
   - Then `I'm Davis…` with a short, evocative intro (no credentials). Keep facts real.
2. **Worlds (star map)** — `#worlds`
   - Five worlds from the current live site, Two Eyes first.
   - Each world is a focusable/clickable node on a map.
   - Click/Enter opens a **full-screen world view** (overlay or route panel).
   - Back (on-screen button + Esc + browser Back / hash) returns to the map at the **same scroll position and focused world**.
   - Hash routes: `#/world/two-eyes` etc. Opening a hash on load should open that world.
3. **Contact footer** — `#contact`
   - Short invite + email / GitHub / X / LinkedIn from current site.
   - Tiny copyright.

## Files to create / replace
Replace the paint-splash site with this architecture. You may delete splash-*.svg usage from HTML (leave files or delete — either fine).

Required files:
- `index.html` — semantic landmarks (header/nav/main/footer), three sections, world-view panel markup (hidden until open), a11y hooks (skip link, aria-live for enter/leave world, focusable world nodes).
- `styles.css` — **structural only**: layout, spacing tokens as CSS variables placeholders, reduced-motion media query stubs, mobile constellation list. Use a deep black background `#07060A` and light text `#F2EDE4` as bare defaults — do NOT invent fancy gradients, purple, blue nebulae, or Ghana flag colours. Leave clear `/* AESTHETIC: designer owns */` comments where polish goes.
- `js/main.js` — boot: load worlds, init map, routing, reduced-motion detect.
- `js/starfield.js` — **canvas 2D module** with a clear public API so a future Three.js module can replace it:
  ```
  export function createStarfield(canvas, options) → { start(), stop(), resize(), setPaused(bool), destroy() }
  ```
  Implement a simple working warm point-star field (enough to prove the hook), pause when `document.hidden`, respect `prefers-reduced-motion` (static or no animation). Comment: `// SWAP POINT: replace with three-starfield.js later`.
- `js/worlds-map.js` — render nodes from data, keyboard (arrows/Tab/Enter/Esc), focus management, restore scroll+focus on Back.
- `js/router.js` — hash routing `#/world/:id` and `#/worlds` or `#about` anchors; sync with history so browser Back works.
- `data/worlds.json` — the five projects with real copy from current index.html:

### worlds.json shape
```json
{
  "worlds": [
    {
      "id": "two-eyes",
      "name": "Two Eyes",
      "accent": "#D4FF3A",
      "teaser": "A phone sees a muddy river; a satellite sees the scar upstream.",
      "body": "Two Eyes pairs a citizen's phone video with Sentinel-2 imagery… (use real copy from current site)",
      "tags": ["computer vision", "remote sensing", "climate", "ai"],
      "links": [{ "label": "source", "href": "https://github.com/davissekai/two-eyes" }],
      "map": { "x": 0.28, "y": 0.35 }
    }
  ]
}
```
Include all five:
1. two-eyes (lead) — github.com/davissekai/two-eyes — accent #D4FF3A
2. atmo — atmo-v2.vercel.app + github.com/davissekai/atmo-v2 — accent #C9A27E
3. venturequest — mvp-six-vert.vercel.app — accent #9C5A34
4. carbon-markets — research, in development (no live link) — accent #F2EDE4
5. notify-crossx — github.com/davissekai/opencode-notify-crossx — accent #5C564C

Map x/y are 0–1 fractions for desktop constellation positions. On mobile, CSS can ignore x/y and stack as a vertical list.

## Behaviour requirements
- Static HTML/CSS/JS only (ES modules). No build step required. Works on GitHub Pages.
- `prefers-reduced-motion: reduce` → no parallax / no fly animation; crossfade or instant panel.
- World content must exist as HTML in the DOM (not canvas-only) for a11y/SEO.
- Title: `Davis Dey — The Domain`
- Meta description: keep truthful (researcher & creator; AI, carbon, living systems).

## Explicitly OUT of scope for you
- Beautiful starfield art, glow, typography pairing, travel choreography polish — leave hooks/comments.
- Three.js
- ProgrammeDesk / phone-as-API (not confirmed)
- Pushing to remote, deploying, touching main

## Done when
- `python3 -m http.server` from repo root serves a working three-section page
- Clicking a world opens the panel; Back/Esc/hash Back restores map position
- worlds.json drives the map
- starfield.js API is documented and called from main.js
- No purple/blue nebula CSS; no invented stats

Write the files. Keep code clear and commented at swap points.
