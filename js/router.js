/**
 * Hash router for The Domain.
 * Routes:
 *   #/world/:id  → open world
 *   #about | #worlds | #contact → section anchors
 *   #/ or empty → home scroll
 */

export function createRouter({ onWorld, onHome }) {
  let silent = false;

  function parse() {
    const raw = window.location.hash.replace(/^#/, "");
    if (raw.startsWith("/world/")) {
      const id = raw.slice("/world/".length).split(/[/?#]/)[0];
      return { type: "world", id };
    }
    if (raw.startsWith("world/")) {
      const id = raw.slice("world/".length).split(/[/?#]/)[0];
      return { type: "world", id };
    }
    if (raw === "about" || raw === "worlds" || raw === "contact") {
      return { type: "section", id: raw };
    }
    return { type: "home" };
  }

  function apply() {
    if (silent) return;
    const route = parse();
    if (route.type === "world" && route.id) {
      onWorld(route.id, { fromHash: true });
    } else {
      onHome({ fromHash: true, section: route.type === "section" ? route.id : null });
    }
  }

  function openWorld(id, { push = true } = {}) {
    const next = `#/world/${id}`;
    if (push) {
      if (window.location.hash !== next) {
        silent = true;
        window.location.hash = next;
        silent = false;
      }
    } else {
      silent = true;
      history.replaceState(null, "", next);
      silent = false;
    }
  }

  function closeWorld({ push = true } = {}) {
    const next = "#worlds";
    if (push) {
      // Prefer history.back when we navigated here via hash push from map
      if (history.state && history.state.domainWorld) {
        history.back();
        return;
      }
      silent = true;
      window.location.hash = next;
      silent = false;
    } else {
      silent = true;
      history.replaceState(null, "", next);
      silent = false;
    }
  }

  function markWorldEntry() {
    history.replaceState({ domainWorld: true }, "", window.location.hash);
  }

  window.addEventListener("hashchange", apply);
  window.addEventListener("popstate", apply);

  return {
    parse,
    apply,
    openWorld,
    closeWorld,
    markWorldEntry,
    destroy() {
      window.removeEventListener("hashchange", apply);
      window.removeEventListener("popstate", apply);
    },
  };
}
