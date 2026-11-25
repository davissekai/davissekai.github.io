import { parseHash } from "./router.js";
import { phaseAt } from "./time-of-day.js";
import { sceneFor, allScenes } from "./scenes.js";
import { viewFor } from "./views.js";
import { createBackdrop } from "./backdrop.js";
import { createPanel } from "./panel.js";

const root = document.documentElement;
const backdrop = createBackdrop(document.querySelector(".backdrop"));
const panel = createPanel(document.getElementById("panel"), { onDismiss: dismiss });

/** Real network I/O for views.js. A non-2xx response counts as a failure, so views show the retry. */
const io = {
  fetchJson: (url) => fetchOk(url).then((r) => r.json()),
  fetchText: (url) => fetchOk(url).then((r) => r.text()),
  staticHtml: (id) => document.getElementById(id)?.innerHTML ?? null,
};

let phase = phaseAt(new Date());
let route = parseHash(location.hash);
let renderToken = 0;
let closing = false;

/** fetch that rejects on HTTP errors, not just on network errors. */
async function fetchOk(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response;
}

/** Brings the scene and the panel in line with the current route and phase. */
async function render() {
  const token = ++renderToken;
  root.dataset.phase = phase;
  backdrop.show(sceneFor(route.view, phase));
  if (route.view === "home") {
    panel.hide();
    return;
  }
  const content = await viewFor(route, io);
  // A newer navigation started while this one was loading; let it win.
  if (token !== renderToken) return;
  panel.show(content);
}

/** Reads the URL and renders it. Runs on load, on back and forward, and after in-page links. */
function go() {
  route = parseHash(location.hash);
  render();
}

/**
 * Closes the panel. If panels were opened from inside the site, step back through that history,
 * so the back button stays honest. If the visitor landed on a deep link, replace it with home instead.
 */
function dismiss() {
  const depth = history.state?.depth ?? 0;
  if (depth > 0) {
    closing = true;
    history.go(-depth);
  } else {
    closeHere();
  }
}

/** Swaps the current entry for home, used when there's no in-site history to step back through. */
function closeHere() {
  history.replaceState(null, "", location.pathname + location.search);
  go();
}

// In-page links push history with a depth counter, which dismiss() uses to unwind.
document.addEventListener("click", (event) => {
  const link = event.target.closest('a[href^="#"]');
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
  event.preventDefault();
  if (link.hasAttribute("data-retry")) {
    render();
    return;
  }
  const href = link.getAttribute("href");
  const next = parseHash(href);
  const depth = next.view === "home" ? 0 : (history.state?.depth ?? 0) + 1;
  history.pushState({ depth }, "", next.view === "home" ? location.pathname + location.search : href);
  go();
});

// After dismiss() steps back, the entry it lands on may itself be a deep link (e.g. the visitor
// arrived on #notes, then opened a note). In that case finish closing by replacing it with home.
window.addEventListener("popstate", () => {
  if (closing) {
    closing = false;
    if (parseHash(location.hash).view !== "home") {
      closeHere();
      return;
    }
  }
  go();
});

/** Re-checks the clock, and crossfades the scene if day just turned to night or back. */
function checkPhase() {
  const next = phaseAt(new Date());
  if (next !== phase) {
    phase = next;
    render();
  }
}
setInterval(checkPhase, 60_000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) checkPhase();
});

const whenIdle = window.requestIdleCallback ?? ((fn) => setTimeout(fn, 2000));
window.addEventListener("load", () => whenIdle(() => backdrop.preload(allScenes())), { once: true });

go();
