/**
 * The stars that make up each project galaxy, one generator per form: spirals
 * (grand-design, three-armed, flocculent), a disc seen edge-on, and a cloud
 * still forming. Every star gets a `home(t)` that turns it about its galaxy's
 * centre in the galaxy's own tilted, squashed plane; inner stars orbit faster.
 */

export const CORE = [255, 232, 196];
const KNOT = [255, 128, 168];
// Share of a spiral's stars spread through the disc between the arms, so it reads as a disc, not a squiggle.
const DISC = 0.35;
// Share of an edge-on galaxy's stars in its round central bulge.
const BULGE = 0.25;
// Half-height of an edge-on disc's dark dust lane, and of the starlit disc beside it (radius units).
const LANE = 0.014;
const THICK = 0.05;

/** Gaussian-ish noise from three uniforms; cheap and good enough for scatter. */
function gauss(random) {
  return (random() + random() + random() - 1.5) / 1.5;
}

/** Linear mix of two RGB triplets. */
function mix(a, b, k) {
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

/**
 * Wraps a star's position in the galaxy's tilt and squash, turning at `omega`
 * rad/s. `z` lifts it off the disc plane, for thick discs seen edge-on.
 */
function orbit(g, { cx, cy }, d, a0, omega, z = 0) {
  const cos = Math.cos(g.tilt);
  const sin = Math.sin(g.tilt);
  return (t) => {
    const a = a0 + t * omega;
    const px = Math.cos(a) * d;
    const py = Math.sin(a) * d * g.squash + z;
    return { x: cx + px * cos - py * sin, y: cy + px * sin + py * cos };
  };
}

/**
 * One star on a spiral arm. `wind` is how tightly the arms coil and `spread`
 * how loosely stars cling to them: many loose arms make a patchy, flocculent disc.
 */
function spiralStar(g, at, random) {
  const k = Math.pow(random(), 0.85);
  const d = Math.min(1, k + gauss(random) * 0.03) * at.R;
  const inDisc = random() < DISC;
  const arm = Math.floor(random() * g.arms);
  const spread = (0.22 + 0.5 * (1 - k)) * (g.spread ?? 1);
  const a0 = inDisc ? random() * Math.PI * 2 : (arm * Math.PI * 2) / g.arms + k * (g.wind ?? 4.3) + gauss(random) * spread;
  const knot = !inDisc && k > 0.25 && random() < g.knots;
  const rgb = knot ? KNOT : k < 0.2 ? mix(CORE, g.arm, k / 0.2) : mix(g.arm, g.rim, random() * 0.6);
  return {
    // Slow enough to feel stately: the fastest inner star takes about two minutes per orbit.
    home: orbit(g, at, d, a0, 0.015 / (0.25 + k)),
    galaxy: g.id,
    rgb,
    size: knot ? 1.1 + random() * 0.6 : inDisc ? 0.4 + random() * 0.6 : k < 0.15 ? 0.9 + random() * 0.9 : 0.5 + random() * 0.9,
    // Stars pile up near the core; under additive blending they'd sum to flat white, so each one shines less.
    bright: Math.min(1, 0.14 + k * 1.7) * (inDisc ? 0.7 : 1),
    twinkle: random() * Math.PI * 2,
  };
}

/**
 * One star in a disc seen edge-on, like the Needle Galaxy: a thin starlit
 * line split by a dark dust lane, with a round bulge of old cream stars.
 */
function edgeStar(g, at, random) {
  if (random() < BULGE) {
    const d = Math.abs(gauss(random)) * 0.16 * at.R;
    return {
      home: orbit(g, at, d, random() * Math.PI * 2, 0.02, gauss(random) * 0.16 * at.R),
      galaxy: g.id,
      rgb: mix(CORE, g.arm, random() * 0.3),
      size: 0.5 + random() * 0.8,
      bright: 0.25 + random() * 0.35,
      twinkle: random() * Math.PI * 2,
    };
  }
  const k = 0.12 + Math.pow(random(), 0.9) * 0.88;
  // Stars sit above or below the lane, never in it: dust swallows the light along the midplane.
  const z = (random() < 0.5 ? -1 : 1) * (LANE + Math.abs(gauss(random)) * THICK) * at.R;
  const knot = random() < g.knots;
  return {
    home: orbit(g, at, k * at.R, random() * Math.PI * 2, 0.012 / (0.25 + k), z),
    galaxy: g.id,
    rgb: knot ? KNOT : mix(g.arm, g.rim, random() * 0.6),
    size: knot ? 1 + random() * 0.5 : 0.45 + random() * 0.8,
    bright: 0.5 + random() * 0.5,
    twinkle: random() * Math.PI * 2,
  };
}

/** One star in a galaxy still forming: a grainy, lumpy cloud with no arms, barely turning. */
function cloudStar(g, at, random) {
  const d = Math.min(1, Math.abs(gauss(random)) * 0.75) * at.R;
  const knot = random() < g.knots;
  return {
    home: orbit(g, at, d, random() * Math.PI * 2, 0.004),
    galaxy: g.id,
    rgb: knot ? KNOT : mix(g.arm, g.rim, random()),
    size: knot ? 1 + random() * 0.6 : 0.45 + random() * 0.7,
    bright: 0.3 + random() * 0.5,
    twinkle: random() * Math.PI * 2,
  };
}

/**
 * One star for galaxy `g`, in the shape its form calls for.
 * @param {{form: string}} g
 * @param {{cx: number, cy: number, R: number}} at the galaxy's centre and radius (canvas px)
 * @param {() => number} random
 */
export function starFor(g, at, random) {
  if (g.form === "edge-on") return edgeStar(g, at, random);
  if (g.form === "forming") return cloudStar(g, at, random);
  return spiralStar(g, at, random);
}
