import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const note = await readFile("docs/reviews/participant-lesson-layout-root-cause.md", "utf8");

test("lesson layout review records the reproduced implicit two-column failure", () => {
  assert.match(note, /762\.5px 323\.5px/u);
  assert.match(note, /grid-cols-1/u);
  assert.match(note, /hero, learning path and selected lesson share the same left edge/u);
});
