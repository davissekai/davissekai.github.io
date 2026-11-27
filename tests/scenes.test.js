import { test } from "node:test";
import assert from "node:assert/strict";
import { SCENES, sceneFor, allScenes, backdropView } from "../js/scenes.js";

test("home, notes and about each have a day and a night photo", () => {
  for (const view of ["home", "notes", "about"]) {
    assert.match(SCENES[view].day, /^img\/scenes\/[a-z]+-day\.webp$/, view);
    assert.match(SCENES[view].night, /^img\/scenes\/[a-z]+-night\.webp$/, view);
  }
});

test("the home screen sits in the about forest, by day and by night", () => {
  assert.equal(sceneFor("home", "day"), SCENES.about.day);
  assert.equal(sceneFor("home", "night"), SCENES.about.night);
});

test("views without their own scene borrow home's", () => {
  assert.equal(sceneFor("about", "day"), SCENES.home.day);
  assert.equal(sceneFor("missing", "night"), SCENES.home.night);
});

test("a view's scene follows the phase", () => {
  assert.equal(sceneFor("notes", "night"), SCENES.notes.night);
});

test("every photo is listed exactly once for preloading", () => {
  const all = allScenes();
  assert.equal(all.length, 4);
  assert.equal(new Set(all).size, 4);
});

test("closing a panel keeps that panel's photo up instead of going back to home's", () => {
  assert.equal(backdropView("home", "notes"), "notes");
  assert.equal(backdropView("home", "about"), "about");
});

test("opening a panel shows that panel's photo, whatever was up before", () => {
  assert.equal(backdropView("about", "notes"), "about");
  assert.equal(backdropView("notes", "about"), "notes");
});

test("arriving on home with nothing shown yet gets home's photo", () => {
  assert.equal(backdropView("home", "home"), "home");
});
