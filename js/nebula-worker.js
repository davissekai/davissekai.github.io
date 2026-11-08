/**
 * Computes the hero nebula's pixels off the main thread, so the arrival can
 * start gathering stars at once instead of stalling for a few hundred ms.
 * Replies with the RGBA buffer, transferred rather than copied.
 */
import { nebulaPixels } from "./nebula.js";

self.onmessage = (e) => {
  const { lw, lh, w, h, seed } = e.data;
  const px = nebulaPixels(lw, lh, w, h, seed);
  self.postMessage(px.buffer, [px.buffer]);
};
