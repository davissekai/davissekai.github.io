import { test } from "node:test";
import assert from "node:assert/strict";
import { fbm, nebulaColor } from "../js/nebula.js";
import { BAND } from "../js/sky.js";

const W = 1200;
const H = 800;

/** Perceived brightness of an RGB triplet. */
function lum([r, g, b]) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Point on the lane's centre line at fraction `t`, nudged `off` short-sides toward its upper side. */
function lanePoint(t, off) {
  const dx = (BAND.x1 - BAND.x0) * W;
  const dy = (BAND.y1 - BAND.y0) * H;
  const len = Math.hypot(dx, dy);
  const unit = Math.min(W, H);
  return [BAND.x0 * W + dx * t + (dy / len) * off * unit, BAND.y0 * H + dy * t - (dx / len) * off * unit];
}

test("fbm stays within 0..1 everywhere", () => {
  for (let i = 0; i < 2000; i++) {
    const v = fbm(i * 0.37 - 300, i * 0.91 + 40, 3);
    assert.ok(v >= 0 && v <= 1, `fbm out of range: ${v}`);
  }
});

test("fbm is repeatable per seed and differs between seeds", () => {
  assert.equal(fbm(1.3, 2.7, 5), fbm(1.3, 2.7, 5));
  assert.notEqual(fbm(1.3, 2.7, 5), fbm(1.3, 2.7, 6));
});

test("fbm is smooth: tiny steps give tiny changes, so clouds have no hard seams", () => {
  for (let i = 0; i < 200; i++) {
    const x = i * 0.53;
    const y = i * 0.29;
    assert.ok(Math.abs(fbm(x, y, 1) - fbm(x + 0.001, y, 1)) < 0.01);
  }
});

test("the core outshines every other part of the sky", () => {
  const core = lum(nebulaColor(BAND.core.x * W, BAND.core.y * H, W, H, 7));
  for (let i = 0; i < 300; i++) {
    const x = (i * 97) % W;
    const y = (i * 61) % H;
    if (Math.hypot(x - BAND.core.x * W, y - BAND.core.y * H) < 120) continue;
    assert.ok(lum(nebulaColor(x, y, W, H, 7)) < core, `(${x}, ${y}) is brighter than the core`);
  }
});

test("far below the lane the sky falls to near-black", () => {
  assert.ok(lum(nebulaColor(20, H - 20, W, H, 7)) < 30);
});

test("the lane glows hydrogen pink while the gas above it runs blue-violet, like Hubble's nebulae", () => {
  let lanePink = 0;
  let laneOrange = 0;
  let gasBlue = 0;
  const n = 60;
  for (let i = 0; i < n; i++) {
    const t = 0.72 + (i / n) * 0.22;
    const [lx, ly] = lanePoint(t, 0);
    const [gx, gy] = lanePoint(t, 0.28);
    const lane = nebulaColor(lx, ly, W, H, 7);
    const gas = nebulaColor(gx, gy, W, H, 7);
    lanePink += lane[0] - lane[1];
    laneOrange += lane[1] - lane[2];
    gasBlue += gas[2] - gas[0];
  }
  assert.ok(lanePink > 0, "lane should lean red over green (pink)");
  assert.ok(laneOrange < 0, "lane should carry more blue than green, so it reads pink, not orange");
  assert.ok(gasBlue > 0, "gas should lean blue");
});

test("no part of the sky is gold: green never outweighs blue by much", () => {
  for (let i = 0; i < 400; i++) {
    const c = nebulaColor((i * 97) % W, (i * 61) % H, W, H, 7);
    assert.ok(c[1] - c[2] < 12, `gold-ish at sample ${i}: ${c.map(Math.round)}`);
  }
});
