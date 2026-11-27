import { test } from "node:test";
import assert from "node:assert/strict";
import { offsetFromMiddle, coverflowTransform, nearest, wrap } from "../js/coverflow.js";

test("a print's offset is how many print widths it sits from the middle, positive on the left", () => {
  assert.equal(offsetFromMiddle(500, 500, 200), 0);
  assert.equal(offsetFromMiddle(300, 500, 200), 1);
  assert.equal(offsetFromMiddle(800, 500, 200), -1.5);
});

test("a print with no width counts as centred rather than dividing by zero", () => {
  assert.equal(offsetFromMiddle(10, 500, 0), 0);
});

test("the centred print faces you flat", () => {
  assert.equal(coverflowTransform(0), "perspective(1200px) translateZ(0px) rotateY(0deg)");
});

test("prints either side turn the same amount in opposite directions and sit equally far back", () => {
  assert.equal(coverflowTransform(1), "perspective(1200px) translateZ(-68px) rotateY(13deg)");
  assert.equal(coverflowTransform(-1), "perspective(1200px) translateZ(-68px) rotateY(-13deg)");
});

test("prints further from the middle sit deeper, but never past two prints' worth", () => {
  assert.equal(coverflowTransform(0.5), "perspective(1200px) translateZ(-34px) rotateY(6.5deg)");
  assert.equal(coverflowTransform(-9), coverflowTransform(-2));
});

test("nearest picks the print closest to the middle, the first on a tie, and -1 for an empty shelf", () => {
  assert.equal(nearest([1.2, -0.3, -1.3]), 1);
  assert.equal(nearest([0.5, -0.5]), 0);
  assert.equal(nearest([]), -1);
});

test("wrap steps past either end of the shelf round to the other", () => {
  assert.equal(wrap(-1, 3), 2);
  assert.equal(wrap(3, 3), 0);
  assert.equal(wrap(1, 3), 1);
});
