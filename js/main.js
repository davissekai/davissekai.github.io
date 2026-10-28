import { createStarfield } from "./starfield.js";
import { createRouter } from "./router.js";
import { createWorldsMap } from "./worlds-map.js";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const els = {
  canvas: document.getElementById("starfield"),
  map: document.getElementById("star-map"),
  list: document.getElementById("world-list"),
  panel: document.getElementById("world-view"),
  panelInner: document.getElementById("world-view-inner"),
  back: document.getElementById("world-back"),
  live: document.getElementById("live-region"),
  year: document.getElementById("year"),
};

if (els.year) els.year.textContent = String(new Date().getFullYear());

let worlds = [];
let map;
let router;
let openId = null;
let lastFocus = null;

const starfield = createStarfield(els.canvas, { reducedMotion });
starfield.start();

async function boot() {
  const res = await fetch("./data/worlds.json");
  const data = await res.json();
  worlds = data.worlds;

  // SSR-ish: also hydrate noscript/static list already in HTML if present
  map = createWorldsMap({
    container: els.map,
    listContainer: els.list,
    worlds,
    onSelect: (id) => openWorld(id, { push: true }),
    liveRegion: els.live,
  });

  router = createRouter({
    onWorld: (id) => openWorld(id, { push: false }),
    onHome: ({ section }) => {
      if (openId) closeWorld({ push: false, skipHash: true });
      if (section) {
        document.getElementById(section)?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
      }
    },
  });

  els.back?.addEventListener("click", () => closeWorld({ push: true }));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && openId) {
      e.preventDefault();
      closeWorld({ push: true });
    }
  });

  // Initial route
  const route = router.parse();
  if (route.type === "world" && route.id) {
    openWorld(route.id, { push: false });
  }

  document.documentElement.classList.add("is-ready");
}

function findWorld(id) {
  return worlds.find((w) => w.id === id);
}

function openWorld(id, { push }) {
  const world = findWorld(id);
  if (!world) {
    closeWorld({ push: false, skipHash: true });
    return;
  }

  if (!openId) {
    map.rememberScroll();
    lastFocus = document.activeElement;
  }

  openId = id;
  map.setActive(id);
  renderPanel(world);

  els.panel.hidden = false;
  els.panel.classList.add("is-open");
  els.panel.setAttribute("aria-hidden", "false");
  document.body.classList.add("world-open");
  starfield.setPaused(true);

  if (push) {
    router.openWorld(id, { push: true });
    router.markWorldEntry();
  }

  // Focus back control after paint
  requestAnimationFrame(() => {
    els.back?.focus();
  });
}

function closeWorld({ push, skipHash } = {}) {
  if (!openId && els.panel.hidden) return;

  openId = null;
  els.panel.classList.remove("is-open");
  els.panel.hidden = true;
  els.panel.setAttribute("aria-hidden", "true");
  document.body.classList.remove("world-open");
  starfield.setPaused(false);

  if (push && !skipHash) {
    router.closeWorld({ push: true });
  } else if (!skipHash) {
    // already handled by hash
  }

  map.restoreFocus();
}

function renderPanel(world) {
  const links = (world.links || [])
    .map(
      (l) =>
        `<a class="world-view__link" href="${escapeAttr(l.href)}" target="_blank" rel="noopener noreferrer"><span>→</span> ${escapeHtml(l.label)}</a>`
    )
    .join("");

  const status = world.status
    ? `<p class="world-view__status">${escapeHtml(world.status)}</p>`
    : "";

  const tags = (world.tags || [])
    .map((t) => `<span class="world-view__tag">${escapeHtml(t)}</span>`)
    .join("");

  els.panelInner.innerHTML = `
    <p class="world-view__eyebrow" style="--accent:${escapeAttr(world.accent)}">world</p>
    <h2 class="world-view__title" id="world-view-title">${escapeHtml(world.name)}</h2>
    <p class="world-view__teaser">${escapeHtml(world.teaser)}</p>
    <p class="world-view__body">${escapeHtml(world.body)}</p>
    <div class="world-view__tags">${tags}</div>
    ${status}
    <div class="world-view__links">${links}</div>
  `;
  els.panel.style.setProperty("--accent", world.accent);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

boot().catch((err) => {
  console.error(err);
  if (els.live) els.live.textContent = "Could not load worlds.";
});
