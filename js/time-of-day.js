/** Local hour the day scene starts. Shared with the inline script in index.html (a page test keeps them equal). */
export const DAY_START_HOUR = 6;
/** Local hour the night scene starts. */
export const NIGHT_START_HOUR = 18;

/**
 * Which half of the day a moment falls in, by the visitor's own clock,
 * so the scene behind the page matches what's outside their window.
 */
export function phaseAt(date) {
  const h = date.getHours();
  return h >= DAY_START_HOUR && h < NIGHT_START_HOUR ? "day" : "night";
}
