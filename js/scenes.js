/** Which photo sits behind each view, by day and by night. Swap a photo by overwriting its file. */
export const SCENES = {
  home: { day: "img/scenes/home-day.webp", night: "img/scenes/home-night.webp" },
  notes: { day: "img/scenes/notes-day.webp", night: "img/scenes/notes-night.webp" },
  questions: { day: "img/scenes/questions-day.webp", night: "img/scenes/questions-night.webp" },
  about: { day: "img/scenes/about-day.webp", night: "img/scenes/about-night.webp" },
};

/** The photo for a view at a phase. Archive and "missing" share home's sky, so every route has a scene. */
export function sceneFor(view, phase) {
  return (SCENES[view] ?? SCENES.home)[phase];
}

/** Every photo, for quiet preloading once the page is idle. */
export function allScenes() {
  return Object.values(SCENES).flatMap((s) => [s.day, s.night]);
}
