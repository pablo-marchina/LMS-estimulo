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
  assert.match(layout, /<BadgeAcquisitionPopup badges=\{credentials\?\.badges \?\? \[\]\} snapshotAvailable=\{credentials !== null\}/u);
});

test("badge acquisition popup establishes a reliable baseline before announcing new awards", () => {
  assert.match(popup, /estimulo:seen-badge-awards:v2/u);
  assert.match(popup, /if \(!snapshotAvailable\) return/u);
  assert.match(popup, /if \(!baselineReadyRef\.current\)/u);
  assert.match(popup, /const stored = readSeenAwards\(\)/u);
  assert.match(popup, /const baseline = stored \?\? new Set\(orderedBadges\.map\(\(badge\) => badge\.award_id\)\)/u);
  assert.match(popup, /seenAwardsRef\.current = baseline/u);
  assert.match(popup, /if \(stored === null\) persistSeenAwards\(baseline\)/u);
  assert.match(popup, /setQueue\(\[\]\)/u);
  assert.match(popup, /orderedBadges\.filter\(\(badge\) => !seenAwardsRef\.current\.has\(badge\.award_id\)\)/u);
  assert.match(popup, /if \(!Array\.isArray\(parsed\)\) return null/u);
  assert.match(popup, /catch \{\s*return null;\s*\}/u);
  assert.doesNotMatch(popup, /if \(!orderedBadges\.length\) return/u);
  assert.match(popup, /const queuedIds = new Set\(currentQueue\.map\(\(badge\) => badge\.award_id\)\)/u);
  assert.match(popup, /unseen\.filter\(\(badge\) => !queuedIds\.has\(badge\.award_id\)\)/u);
  assert.match(popup, /seenAwardsRef\.current\.add\(current\.award_id\)/u);
  assert.doesNotMatch(popup, /const latest = orderedBadges\.at\(-1\)/u);
  assert.doesNotMatch(popup, /orderedBadges\.slice\(0, -1\)/u);
  assert.match(popup, /Parabéns! Você conquistou o selo/u);
  assert.match(popup, /Ver minha conquista/u);
  assert.match(popup, /role="dialog"/u);
  assert.match(popup, /aria-modal="true"/u);
});
