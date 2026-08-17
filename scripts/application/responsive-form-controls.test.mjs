import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const inputControls = await readFile("apps/web/components/ui/input.tsx", "utf8");

test("shared form controls can shrink inside narrow mobile containers", () => {
  assert.match(inputControls, /w-full min-w-0 max-w-full/u);
  assert.match(inputControls, /grid min-w-0 max-w-full gap-1\.5/u);
});
