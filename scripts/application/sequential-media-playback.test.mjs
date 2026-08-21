import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [autoAdvance, autoplay, journeyActions, progressNav] = await Promise.all([
  readFile("apps/web/components/lesson-auto-advance.tsx", "utf8"),
  readFile("apps/web/components/lesson-autoplay.tsx", "utf8"),
  readFile("apps/web/app/empreendedor/jornada/[journeyInstanceId]/actions.ts", "utf8"),
  readFile("apps/web/components/journey-progress-nav.tsx", "utf8"),
]);

test("automatic lesson advance carries explicit autoplay intent to the next lesson", () => {
  assert.match(autoAdvance, /input\[name="autoplay"\]/u);
  assert.match(autoAdvance, /autoplayInput\.value = "1"/u);
  assert.match(journeyActions, /formData\.get\("autoplay"\)/u);
  assert.match(journeyActions, /&autoplay=1/u);
  assert.match(progressNav, /<LessonAutoplay \/>/u);
});

test("autoplay requests the first rendered media player without changing manual navigation", () => {
  assert.match(autoplay, /URLSearchParams\(window\.location\.search\)\.get\("autoplay"\)/u);
  assert.match(autoplay, /\[data-video-player\]/u);
  assert.match(autoplay, /media\.play\(\)/u);
  assert.match(autoplay, /func: "playVideo"/u);
  assert.match(autoplay, /method: "play"/u);
  assert.match(autoplay, /host === "drive\.google\.com"/u);
  assert.doesNotMatch(progressNav, /name="autoplay"/u);
});
