/** Which photo sits behind each view, by day and by night. Swap a photo by overwriting its file. */
const ABOUT = { day: "img/scenes/about-day.webp", night: "img/scenes/about-night.webp" };

export const SCENES = {
  // Home shares the about forest, so the first thing a visitor sees is the woods.
  home: ABOUT,
  notes: { day: "img/scenes/notes-day.webp", night: "img/scenes/notes-night.webp" },
  about: ABOUT,
};

/** The photo for a view at a phase. Archive and "missing" share home's scene, so every route has one. */
export function sceneFor(view, phase) {
  return (SCENES[view] ?? SCENES.home)[phase];
}

/**
 * Which view's photo the backdrop shows for `view`, given the one `shown` now. Going home (closing
 * a panel) leaves the last panel's photo up rather than jumping back, so the page stays where it was.
 */
export function backdropView(view, shown) {
  return view === "home" ? shown : view;
}

/** Every distinct photo, for quiet preloading once the page is idle. */
export function allScenes() {
  return [...new Set(Object.values(SCENES).flatMap((s) => [s.day, s.night]))];
}
