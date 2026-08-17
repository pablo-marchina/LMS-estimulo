import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile("apps/web/app/empreendedor/jornada/[journeyInstanceId]/page.tsx", "utf8");

test("selected lesson has a stable semantic marker for visual coverage", () => {
  assert.match(page, /id="aula"/u);
  assert.match(page, /data-journey-lesson/u);
});
