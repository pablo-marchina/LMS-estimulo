import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [layout, popup] = await Promise.all([
  readFile("apps/web/app/empreendedor/layout.tsx", "utf8"),
  readFile("apps/web/components/badge-acquisition-popup.tsx", "utf8"),
]);

test("participant shell observes issued badges without blocking the rest of the experience", () => {
  assert.match(layout, /credentialRuntime\.listParticipant/u);
  assert.match(layout, /\.catch\(\(\) => null\)/u);
  assert.match(layout, /<BadgeAcquisitionPopup badges=\{credentials\?\.badges \?\? \[\]\}/u);
});

test("badge acquisition popup distinguishes historical awards from newly issued badges", () => {
  assert.match(popup, /estimulo:seen-badge-awards:v2/u);
  assert.match(popup, /if \(seen === null\)/u);
  assert.match(popup, /const latest = orderedBadges\.at\(-1\)/u);
  assert.match(popup, /orderedBadges\.slice\(0, -1\)/u);
  assert.match(popup, /orderedBadges\.filter\(\(badge\) => !seen\.has\(badge\.award_id\)\)/u);
  assert.match(popup, /Parabéns! Você conquistou o selo/u);
  assert.match(popup, /Ver minha conquista/u);
  assert.match(popup, /role="dialog"/u);
  assert.match(popup, /aria-modal="true"/u);
});
