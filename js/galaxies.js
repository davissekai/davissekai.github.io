/**
 * Spiral galaxy sky for the star chart (page 2): a few slow-turning galaxies
 * plus white field stars. Each star's "home" function gives its place at time t.
 */

const PALETTE = {
  core: [255, 226, 180],
  white: [236, 240, 255],
  yellow: [255, 210, 40],
  cyan: [40, 200, 255],
  violet: [140, 80, 255],
  jade: [30, 255, 170],
  amber: [255, 160, 50],
};

/** Galaxy specs in viewport fractions; size scales off the shorter side. */
const GALAXIES = [
  { x: 0.7, y: 0.36, r: 0.42, tilt: -0.5, squash: 0.42, arms: 2, share: 0.5, arm: "cyan", rim: "violet" },
  { x: 0.3, y: 0.17, r: 0.2, tilt: 0.7, squash: 0.55, arms: 3, share: 0.16, arm: "yellow", rim: "amber" },
  { x: 0.9, y: 0.86, r: 0.12, tilt: 0.2, squash: 0.6, arms: 2, share: 0.08, arm: "jade", rim: "cyan" },
];

/** Gaussian-ish noise from three uniforms; cheap and good enough for scatter. */
function gauss(random) {
  return (random() + random() + random() - 1.5) / 1.5;
}

/** Linear mix of two RGB triplets. */
function mix(a, b, k) {
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

/**
 * Builds `count` sky stars for a viewport.
 * @param {number} count
 * @param {number} w viewport width (CSS px)
 * @param {number} h viewport height (CSS px)
 * @param {() => number} random
 * @returns {{home: (t: number) => {x: number, y: number}, still?: boolean, rgb: number[], size: number, bright: number, twinkle: number}[]}
 */
export function buildSky(count, w, h, random) {
  const unit = Math.min(w, h);
  const stars = [];
  for (const g of GALAXIES) {
    const n = Math.round(count * g.share);
    for (let i = 0; i < n; i++) stars.push(galaxyStar(g, w, h, unit, random));
  }
  while (stars.length < count) stars.push(fieldStar(w, h, random));
  return stars;
}

/** One star on a spiral arm; inner stars orbit faster (differential rotation). */
function galaxyStar(g, w, h, unit, random) {
  const R = g.r * unit;
  const k = Math.pow(random(), 0.85);
  const d = k * R;
  const arm = Math.floor(random() * g.arms);
  const spread = 0.12 + 0.45 * (1 - k);
  const a0 = (arm * Math.PI * 2) / g.arms + k * 3.6 + gauss(random) * spread;
  // Slow enough to feel stately: the fastest inner star takes about two minutes per orbit.
  const omega = 0.015 / (0.25 + k);
  const cx = g.x * w;
  const cy = g.y * h;
  const cos = Math.cos(g.tilt);
  const sin = Math.sin(g.tilt);
  const jitter = gauss(random) * R * 0.03;
  const rgb = k < 0.18 ? mix(PALETTE.core, PALETTE[g.arm], k / 0.18) : mix(PALETTE[g.arm], PALETTE[g.rim], random() * 0.6);
  return {
    home(t) {
      const a = a0 + t * omega;
      const px = Math.cos(a) * (d + jitter);
      const py = Math.sin(a) * (d + jitter) * g.squash;
      return { x: cx + px * cos - py * sin, y: cy + px * sin + py * cos };
    },
    rgb,
    size: k < 0.15 ? 0.9 + random() * 0.9 : 0.5 + random() * 0.9,
    // Stars pile up near the core; under additive blending they'd sum to flat white, so each one shines less.
    bright: Math.min(1, 0.14 + k * 1.7),
    twinkle: random() * Math.PI * 2,
  };
}

/** Background star; static, white, twinkles only. Color is kept for the galaxies. */
function fieldStar(w, h, random) {
  const x = random() * w;
  const y = random() * h;
  return {
    home: () => ({ x, y }),
    // Still stars can be baked into a cached layer instead of repainted every frame.
    still: true,
    rgb: PALETTE.white,
    size: 0.4 + random() * 1.1,
    bright: 1,
    twinkle: random() * Math.PI * 2,
  };
}

/**
 * Paints soft nebula dust once into an offscreen canvas; composited behind stars.
 * @param {number} w
 * @param {number} h
 * @returns {HTMLCanvasElement}
 */
export function paintNebula(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  const unit = Math.min(w, h);
  const clouds = [
    [0.68, 0.34, 0.55, PALETTE.violet, 0.34],
    [0.78, 0.42, 0.3, PALETTE.cyan, 0.26],
    [0.55, 0.22, 0.28, PALETTE.yellow, 0.1],
    [0.3, 0.17, 0.32, PALETTE.yellow, 0.24],
    [0.22, 0.08, 0.2, PALETTE.amber, 0.14],
    [0.1, 0.62, 0.4, PALETTE.jade, 0.1],
    [0.9, 0.86, 0.22, PALETTE.amber, 0.2],
    [0.95, 0.7, 0.25, PALETTE.jade, 0.12],
  ];
  ctx.globalCompositeOperation = "lighter";
  for (const [fx, fy, fr, rgb, a] of clouds) {
    const g = ctx.createRadialGradient(fx * w, fy * h, 0, fx * w, fy * h, fr * unit);
    g.addColorStop(0, `rgba(${rgb.join(",")},${a})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  return c;
}
