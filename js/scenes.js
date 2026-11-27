/** Which photo sits behind each view, by day and by night. Swap a photo by overwriting its file. */
const ABOUT = { day: "img/scenes/about-day.webp", night: "img/scenes/about-night.webp" };

export const SCENES = {
  // Home shares the about forest, so the first thing a visitor sees is the woods.
  home: ABOUT,
  notes: { day: "img/scenes/notes-day.webp", night: "img/scenes/notes-night.webp" },
  questions: { day: "img/scenes/questions-day.webp", night: "img/scenes/questions-night.webp" },
  about: ABOUT,
};

/** The photo for a view at a phase. Archive and "missing" share home's scene, so every route has one. */
export function sceneFor(view, phase) {
  return (SCENES[view] ?? SCENES.home)[phase];
}

/** Every distinct photo, for quiet preloading once the page is idle. */
export function allScenes() {
  return [...new Set(Object.values(SCENES).flatMap((s) => [s.day, s.night]))];
}
