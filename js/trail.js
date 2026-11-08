/**
 * The comet cursor's tail: the pointer's recent positions, each fading as it
 * ages, newest first. Pure and time-driven, so it's testable without a DOM.
 */

/**
 * @param {number} life seconds a point stays in the tail
 * @param {number} [cap] most points kept, so a fast flick can't build an endless tail
 * @returns {{add: (x: number, y: number, t: number) => void, points: (t: number) => {x: number, y: number, k: number}[], clear: () => void}}
 *   k is a point's remaining strength: 1 at the head, falling to 0 at the tail's end
 */
export function createTrail(life, cap = 32) {
  let pts = [];
  return {
    add(x, y, t) {
      pts.unshift({ x, y, t });
      if (pts.length > cap) pts.length = cap;
    },
    points(t) {
      pts = pts.filter((p) => t - p.t < life);
      return pts.map((p) => ({ x: p.x, y: p.y, k: 1 - (t - p.t) / life }));
    },
    clear() {
      pts = [];
    },
  };
}
