import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const workflow = await readFile(".github/workflows/production-visual-capture.yml", "utf8");
test("visual capture runs composition audit", () => assert.match(workflow, /production-visual-composition-audit\.mjs/u));
