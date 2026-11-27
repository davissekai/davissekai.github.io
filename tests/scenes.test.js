import { test } from "node:test";
import assert from "node:assert/strict";
import { SCENES, sceneFor, allScenes } from "../js/scenes.js";

test("home, notes, questions and about each have a day and a night photo", () => {
  for (const view of ["home", "notes", "questions", "about"]) {
    assert.match(SCENES[view].day, /^img\/scenes\/[a-z]+-day\.webp$/, view);
    assert.match(SCENES[view].night, /^img\/scenes\/[a-z]+-night\.webp$/, view);
  }
});

test("the home screen sits in the about forest, by day and by night", () => {
  assert.equal(sceneFor("home", "day"), SCENES.about.day);
  assert.equal(sceneFor("home", "night"), SCENES.about.night);
});

test("views without their own scene borrow home's", () => {
  assert.equal(sceneFor("archive", "day"), SCENES.home.day);
  assert.equal(sceneFor("missing", "night"), SCENES.home.night);
});

test("a view's scene follows the phase", () => {
  assert.equal(sceneFor("notes", "night"), SCENES.notes.night);
});

test("every photo is listed exactly once for preloading", () => {
  const all = allScenes();
  assert.equal(all.length, 6);
  assert.equal(new Set(all).size, 6);
});
