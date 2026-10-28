/**
 * Star map: renders world nodes, keyboard nav, focus restore.
 */

export function createWorldsMap({
  container,
  listContainer,
  worlds,
  onSelect,
  liveRegion,
}) {
  const buttons = new Map();
  let focusedId = worlds[0]?.id ?? null;
  let savedScrollY = 0;

  function announce(msg) {
    if (liveRegion) liveRegion.textContent = msg;
  }

  function render() {
    container.innerHTML = "";
    listContainer.innerHTML = "";

    // Constellation lines (desktop map)
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "constellation-lines");
    svg.setAttribute("aria-hidden", "true");
    const pairs = [
      [0, 2],
      [2, 1],
      [2, 3],
      [0, 4],
      [4, 2],
    ];
    for (const [a, b] of pairs) {
      if (!worlds[a] || !worlds[b]) continue;
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", `${worlds[a].map.x * 100}%`);
      line.setAttribute("y1", `${worlds[a].map.y * 100}%`);
      line.setAttribute("x2", `${worlds[b].map.x * 100}%`);
      line.setAttribute("y2", `${worlds[b].map.y * 100}%`);
      svg.appendChild(line);
    }
    container.appendChild(svg);

    worlds.forEach((world, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "world-node";
      btn.dataset.id = world.id;
      btn.style.setProperty("--accent", world.accent);
      btn.style.left = `${world.map.x * 100}%`;
      btn.style.top = `${world.map.y * 100}%`;
      btn.setAttribute("aria-label", `${world.name}. ${world.teaser}`);
      btn.innerHTML = `
        <span class="world-node__core" aria-hidden="true"></span>
        <span class="world-node__ring" aria-hidden="true"></span>
        <span class="world-node__label">
          <span class="world-node__index">${String(index + 1).padStart(2, "0")}</span>
          <span class="world-node__name">${escapeHtml(world.name)}</span>
          <span class="world-node__teaser">${escapeHtml(world.teaser)}</span>
        </span>
      `;
      btn.addEventListener("click", () => select(world.id));
      btn.addEventListener("keydown", (e) => onKey(e, index));
      container.appendChild(btn);
      buttons.set(world.id, btn);

      // Mobile list twin
      const li = document.createElement("li");
      const mBtn = document.createElement("button");
      mBtn.type = "button";
      mBtn.className = "world-list-item";
      mBtn.dataset.id = world.id;
      mBtn.style.setProperty("--accent", world.accent);
      mBtn.setAttribute("aria-label", `${world.name}. ${world.teaser}`);
      mBtn.innerHTML = `
        <span class="world-list-item__dot" aria-hidden="true"></span>
        <span class="world-list-item__text">
          <span class="world-list-item__name">${escapeHtml(world.name)}</span>
          <span class="world-list-item__teaser">${escapeHtml(world.teaser)}</span>
        </span>
        <span class="world-list-item__go" aria-hidden="true">→</span>
      `;
      mBtn.addEventListener("click", () => select(world.id));
      li.appendChild(mBtn);
      listContainer.appendChild(li);
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function onKey(e, index) {
    let next = index;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      next = (index + 1) % worlds.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      next = (index - 1 + worlds.length) % worlds.length;
    } else if (e.key === "Home") {
      e.preventDefault();
      next = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      next = worlds.length - 1;
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      select(worlds[index].id);
      return;
    } else {
      return;
    }
    const id = worlds[next].id;
    focusedId = id;
    buttons.get(id)?.focus();
  }

  function select(id) {
    savedScrollY = window.scrollY;
    focusedId = id;
    announce(`Entering ${worlds.find((w) => w.id === id)?.name ?? id}`);
    onSelect(id);
  }

  function restoreFocus() {
    requestAnimationFrame(() => {
      window.scrollTo(0, savedScrollY);
      const btn = buttons.get(focusedId);
      if (btn) btn.focus({ preventScroll: true });
      announce(`Back to the star map`);
    });
  }

  function rememberScroll() {
    savedScrollY = window.scrollY;
  }

  function setActive(id) {
    focusedId = id;
    for (const [wid, btn] of buttons) {
      btn.classList.toggle("is-active", wid === id);
    }
  }

  render();

  return {
    restoreFocus,
    rememberScroll,
    setActive,
    getFocusedId: () => focusedId,
    destroy() {
      container.innerHTML = "";
      listContainer.innerHTML = "";
      buttons.clear();
    },
  };
}
