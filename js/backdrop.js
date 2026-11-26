/**
 * Crossfades the full-screen photo behind the page. Two stacked layers take turns being in front:
 * the next photo is loaded off-screen first, so a fade never reveals a blank frame. A photo that
 * fails to load leaves the current one (or the CSS sky gradient) in place.
 */
export function createBackdrop(root) {
  const layers = [...root.querySelectorAll(".scene")];
  let front = 0;
  let shown = null;
  let wanted = null;

  return {
    /** Fade to `src`. If several calls race, only the latest one wins. */
    show(src) {
      if (src === wanted) return;
      wanted = src;
      const img = new Image();
      img.onload = () => {
        if (wanted !== src) return;
        const back = layers[1 - front];
        back.style.backgroundImage = `url("${src}")`;
        back.classList.add("is-shown");
        layers[front].classList.remove("is-shown");
        front = 1 - front;
        shown = src;
      };
      img.onerror = () => {
        if (wanted === src) wanted = shown;
      };
      img.src = src;
    },
    /** Warm the browser cache so later scene changes are instant. */
    preload(srcs) {
      for (const src of srcs) new Image().src = src;
    },
  };
}
