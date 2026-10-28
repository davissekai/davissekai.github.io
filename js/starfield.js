/**
 * Canvas 2D starfield.
 * SWAP POINT: replace this module with a Three.js starfield later.
 * Keep the same createStarfield(canvas, options) → { start, stop, resize, setPaused, destroy } API.
 */

export function createStarfield(canvas, options = {}) {
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) {
    return {
      start() {},
      stop() {},
      resize() {},
      setPaused() {},
      destroy() {},
    };
  }

  const reduced =
    options.reducedMotion ??
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let raf = 0;
  let paused = false;
  let stars = [];
  let t0 = performance.now();
  let shooting = null;

  const LAYERS = [
    { count: 120, speed: 0.015, size: [0.35, 1.0], alpha: [0.22, 0.5] },
    { count: 70, speed: 0.04, size: [0.65, 1.5], alpha: [0.38, 0.72] },
    { count: 36, speed: 0.08, size: [1.0, 2.35], alpha: [0.55, 0.95] },
  ];

  // Warm starlight — bone / silt / soft amber. No purple, no blue.
  const COLORS = [
    [242, 237, 228],
    [201, 162, 126],
    [232, 210, 170],
    [255, 248, 235],
  ];

  function pickColor() {
    return COLORS[(Math.random() * COLORS.length) | 0];
  }

  function seed() {
    stars = [];
    const density = Math.min(1, (width * height) / (1440 * 900));
    for (const layer of LAYERS) {
      const n = Math.max(8, Math.round(layer.count * density));
      for (let i = 0; i < n; i++) {
        const [r, g, b] = pickColor();
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          z: layer.speed,
          r: layer.size[0] + Math.random() * (layer.size[1] - layer.size[0]),
          a: layer.alpha[0] + Math.random() * (layer.alpha[1] - layer.alpha[0]),
          tw: Math.random() * Math.PI * 2,
          tws: 0.4 + Math.random() * 1.2,
          color: `rgba(${r},${g},${b},`,
        });
      }
    }
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
    if (reduced) drawStatic();
  }

  function drawStatic() {
    ctx.fillStyle = "#07060A";
    ctx.fillRect(0, 0, width, height);
    for (const s of stars) {
      ctx.beginPath();
      ctx.fillStyle = `${s.color}${s.a})`;
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function maybeShoot(now) {
    if (shooting) return;
    if (Math.random() > 0.002) return;
    shooting = {
      x: Math.random() * width * 0.8,
      y: Math.random() * height * 0.4,
      len: 80 + Math.random() * 120,
      speed: 8 + Math.random() * 6,
      life: 0,
      max: 40 + Math.random() * 20,
      angle: Math.PI / 5 + Math.random() * 0.3,
    };
  }

  function drawShoot() {
    if (!shooting) return;
    const s = shooting;
    s.life += 1;
    s.x += Math.cos(s.angle) * s.speed;
    s.y += Math.sin(s.angle) * s.speed;
    const fade = 1 - s.life / s.max;
    const tx = s.x - Math.cos(s.angle) * s.len;
    const ty = s.y - Math.sin(s.angle) * s.len;
    const grad = ctx.createLinearGradient(tx, ty, s.x, s.y);
    grad.addColorStop(0, "rgba(242,237,228,0)");
    grad.addColorStop(1, `rgba(232,210,170,${0.7 * fade})`);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(s.x, s.y);
    ctx.stroke();
    if (s.life >= s.max) shooting = null;
  }

  function frame(now) {
    if (paused || reduced) return;
    raf = requestAnimationFrame(frame);
    const t = (now - t0) / 1000;
    const scrollY = window.scrollY || 0;

    ctx.fillStyle = "#07060A";
    ctx.fillRect(0, 0, width, height);

    for (const s of stars) {
      const parallax = scrollY * s.z * 0.15;
      let y = (s.y + parallax) % (height + 20);
      if (y < -10) y += height + 20;
      const twinkle = 0.65 + 0.35 * Math.sin(t * s.tws + s.tw);
      ctx.beginPath();
      ctx.fillStyle = `${s.color}${s.a * twinkle})`;
      ctx.arc(s.x, y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    maybeShoot(now);
    drawShoot();
  }

  function onVisibility() {
    setPaused(document.hidden);
  }

  function start() {
    resize();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", resize);
    if (!reduced) {
      paused = false;
      t0 = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }

  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
    paused = true;
  }

  function setPaused(v) {
    if (reduced) return;
    if (v && !paused) {
      paused = true;
      cancelAnimationFrame(raf);
      raf = 0;
    } else if (!v && paused) {
      paused = false;
      t0 = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }

  function destroy() {
    stop();
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("resize", resize);
  }

  return { start, stop, resize, setPaused, destroy };
}
