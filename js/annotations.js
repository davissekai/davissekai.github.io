/**
 * Star-chart annotation layout: where each galaxy's label goes, and the
 * hairline leader that ties it back to its galaxy. Pure geometry in frame
 * coordinates (CSS px), so it's testable without a DOM and the page only has
 * to measure the labels and apply the result.
 *
 * Each label tries a ring of spots just outside its galaxy's rim, preferring
 * below. Every spot is scored by what it would cover (other labels, the
 * heading, any galaxy's bright core, and lightly, other galaxies' discs) and
 * how far it had to be pushed back on screen. With five labels, trying every
 * placement order is cheap and avoids the dead ends a single greedy pass hits.
 */

// Space between a galaxy's rim and its label; the leader line spans it.
const GAP = 22;
// Spots tried around each rim, starting straight below.
const SPOTS = 16;
// Leaders shorter than this read as a smudge, so the label goes without one.
const MIN_LEADER = 6;
// Covering another galaxy's faint disc is allowed but costs a little, so open sky wins.
const DISC_COST = 0.04;

/**
 * @typedef {{cx: number, cy: number, a: number, b: number, tilt: number}} Shape a galaxy rim: tilted ellipse
 * @typedef {{x: number, y: number, w: number, h: number}} Box
 * @typedef {{id: string, shape: Shape, w: number, h: number}} Item a label to place, with its measured size
 * @typedef {Box & {id: string, leader: {x1: number, y1: number, x2: number, y2: number} | null}} Placed
 */

/**
 * Places every label beside its galaxy, clear of the others and of `avoid`.
 * @param {Item[]} items
 * @param {{w: number, h: number, edge?: number, avoid?: Box[]}} frame
 * @returns {Placed[]} one per item, in the items' order
 */
export function layoutLabels(items, { w, h, edge = 12, avoid = [] }) {
  const cores = items.map((it) => coreBox(it.shape));
  const options = items.map((it) => spots(it, w, h, edge));
  let best = null;
  for (const order of permutations(items.map((_, i) => i))) {
    const run = placeInOrder(order, items, options, cores, avoid);
    if (!best || run.cost < best.cost) best = run;
    if (best.cost === 0) break;
  }
  return items.map((it, i) => {
    const box = best.boxes[i];
    return { id: it.id, ...box, leader: leaderFor(it.shape, box) };
  });
}

/**
 * The axis-aligned box around a rim ellipse.
 * @param {Shape} s
 * @returns {Box}
 */
export function shapeBox(s) {
  const hx = Math.hypot(s.a * Math.cos(s.tilt), s.b * Math.sin(s.tilt));
  const hy = Math.hypot(s.a * Math.sin(s.tilt), s.b * Math.cos(s.tilt));
  return { x: s.cx - hx, y: s.cy - hy, w: hx * 2, h: hy * 2 };
}

/** Greedily places labels in one order; each takes its cheapest spot given those before it. */
function placeInOrder(order, items, options, cores, avoid) {
  const boxes = [];
  let cost = 0;
  for (const i of order) {
    const taken = [...avoid, ...boxes.filter(Boolean)];
    let pick = null;
    for (const spot of options[i]) {
      let c = spot.push + spot.drift + covered(spot, taken) + covered(spot, cores);
      for (let j = 0; j < items.length; j++) if (j !== i) c += DISC_COST * covered(spot, [shapeBox(items[j].shape)]);
      // Earlier spots are the nicer ones; a hair of cost keeps ties on them.
      c += spot.rank * 1e-3;
      if (!pick || c < pick.c) pick = { box: spot, c };
    }
    boxes[i] = { x: pick.box.x, y: pick.box.y, w: pick.box.w, h: pick.box.h };
    cost += pick.c;
  }
  return { boxes, cost };
}

/**
 * Candidate label boxes in a ring just outside the rim, clamped on screen.
 * Each label is pushed out along the rim's direction until its nearest side
 * clears the rim by GAP, so wide labels sit as close as narrow ones.
 */
function spots({ shape, w: lw, h: lh }, w, h, edge) {
  const rimBox = shapeBox(shape);
  const out = [];
  for (let k = 0; k < SPOTS; k++) {
    // 0, +1, -1, +2, -2... steps away from straight below, alternating sides.
    const step = k === 0 ? 0 : Math.ceil(k / 2) * (k % 2 ? 1 : -1);
    const theta = Math.PI / 2 + (step * 2 * Math.PI) / SPOTS;
    const dx = Math.cos(theta);
    const dy = Math.sin(theta);
    const rim = rimToward(shape, dx, dy);
    const reach = GAP + Math.abs(dx) * (lw / 2) + Math.abs(dy) * (lh / 2);
    const x = rim.x + dx * reach - lw / 2;
    const y = rim.y + dy * reach - lh / 2;
    const cx = clamp(x, edge, w - edge - lw);
    const cy = clamp(y, edge, h - edge - lh);
    // Being shoved back on screen moves the label off its galaxy; weigh it like covered area.
    const box = { x: cx, y: cy, w: lw, h: lh };
    // Diagonal spots carry wide labels far out; past the gap, distance from the galaxy costs too.
    const drift = Math.max(0, gapBetween(box, rimBox) - GAP) * lh;
    out.push({ ...box, rank: k, drift, push: Math.hypot(cx - x, cy - y) * lh });
  }
  return out;
}

/** Where a ray from the galaxy's centre in direction (dx, dy) crosses its rim. */
function rimToward(s, dx, dy) {
  const c = Math.cos(-s.tilt);
  const n = Math.sin(-s.tilt);
  const u = dx * c - dy * n;
  const v = dx * n + dy * c;
  const t = 1 / Math.hypot(u / s.a, v / s.b);
  return { x: s.cx + dx * t, y: s.cy + dy * t };
}

/**
 * The hairline from the galaxy's rim to just outside its label, or null when
 * the label sits too close (or on top of the rim) for a line to read.
 */
function leaderFor(s, box) {
  // Aim at the label's nearest point to the galaxy's centre, stopping a few px short of the text.
  const nx = clamp(s.cx, box.x, box.x + box.w);
  const ny = clamp(s.cy, box.y, box.y + box.h);
  const len = Math.hypot(nx - s.cx, ny - s.cy);
  if (len === 0) return null;
  const dx = (nx - s.cx) / len;
  const dy = (ny - s.cy) / len;
  const start = rimToward(s, dx, dy);
  const end = { x: nx - dx * 3, y: ny - dy * 3 };
  const span = (end.x - start.x) * dx + (end.y - start.y) * dy;
  if (span < MIN_LEADER) return null;
  return { x1: start.x, y1: start.y, x2: end.x, y2: end.y };
}

/** A box over a galaxy's bright core, which no label may cover. */
function coreBox(s) {
  const r = Math.max(14, s.b * 0.5);
  return { x: s.cx - r, y: s.cy - r, w: r * 2, h: r * 2 };
}

/** Empty space between two boxes (0 when they touch or overlap). */
function gapBetween(p, q) {
  const x = Math.max(q.x - (p.x + p.w), 0, p.x - (q.x + q.w));
  const y = Math.max(q.y - (p.y + p.h), 0, p.y - (q.y + q.h));
  return Math.hypot(x, y);
}

/** Total area of `box` covered by `boxes`. */
function covered(box, boxes) {
  let sum = 0;
  for (const b of boxes) {
    const x = Math.min(box.x + box.w, b.x + b.w) - Math.max(box.x, b.x);
    const y = Math.min(box.y + box.h, b.y + b.h) - Math.max(box.y, b.y);
    if (x > 0 && y > 0) sum += x * y;
  }
  return sum;
}

/** Clamps v into [lo, hi]; when the range is empty (label wider than the screen), pins to lo. */
function clamp(v, lo, hi) {
  return hi < lo ? lo : Math.min(hi, Math.max(lo, v));
}

/** Every ordering of `xs` (Heap's algorithm); fine for a handful of labels. */
function* permutations(xs) {
  const a = [...xs];
  const c = new Array(a.length).fill(0);
  yield [...a];
  let i = 0;
  while (i < a.length) {
    if (c[i] < i) {
      const j = i % 2 ? c[i] : 0;
      [a[j], a[i]] = [a[i], a[j]];
      yield [...a];
      c[i]++;
      i = 0;
    } else {
      c[i] = 0;
      i++;
    }
  }
}
