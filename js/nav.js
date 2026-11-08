/**
 * Marks the section in view in the masthead nav (aria-current), so readers
 * always know where they are in the Domain. The chart overlaps the arrival's
 * fading bottom, so a section counts as "in view" once it covers the middle
 * of the screen.
 */
const links = [...document.querySelectorAll(".nav a[href^='#']")];

/** Sets aria-current on the link to `id`, clearing the others. */
function markCurrent(id) {
  for (const a of links) {
    if (a.getAttribute("href") === `#${id}`) a.setAttribute("aria-current", "true");
    else a.removeAttribute("aria-current");
  }
}

const watch = new IntersectionObserver(
  (entries) => {
    for (const e of entries) if (e.isIntersecting) markCurrent(e.target.id);
  },
  // A one-pixel band across the middle of the viewport: whichever section covers it is current.
  { rootMargin: "-50% 0px -50% 0px" },
);
for (const a of links) {
  const section = document.getElementById(a.getAttribute("href").slice(1));
  if (section) watch.observe(section);
}
