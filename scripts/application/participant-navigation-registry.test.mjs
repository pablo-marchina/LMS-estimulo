import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [participantShell, migration, boundary] = await Promise.all([
  readFile("apps/web/components/participant-shell.tsx", "utf8"),
  readFile("supabase/migrations/20260816180000_reconcile_participant_navigation_registry.sql", "utf8"),
  readFile("scripts/database/migration-history/active-release-boundary.mjs", "utf8"),
]);

test("participant shell consumes the launch navigation and keeps sparse Library out of the menu", () => {
  for (const key of [
    "participant.nav.home",
    "participant.nav.journeys",
    "participant.nav.rewards",
    "participant.nav.b2b",
  ]) {
    assert.match(participantShell, new RegExp(key.replaceAll(".", "\\."), "u"));
  }

  assert.doesNotMatch(participantShell, /participant\.nav\.library/u);
  assert.doesNotMatch(participantShell, /href: "\/empreendedor\/biblioteca"/u);

  for (const orphanedKey of [
    "participant.nav.achievements",
    "participant.nav.points",
    "participant.nav.profile",
    "participant.nav.submissions",
  ]) {
    assert.doesNotMatch(participantShell, new RegExp(orphanedKey.replaceAll(".", "\\."), "u"));
  }
});

test("navigation registry migration retires dead controls without deleting history", () => {
  for (const orphanedKey of [
    "participant.nav.achievements",
    "participant.nav.points",
    "participant.nav.profile",
    "participant.nav.submissions",
  ]) {
    assert.match(migration, new RegExp(orphanedKey.replaceAll(".", "\\."), "u"));
  }
  assert.match(migration, /set is_active = false/u);
  assert.doesNotMatch(migration, /delete from experience\.interface_content/iu);
});

test("navigation registry migration registers configurable destinations generically", () => {
  assert.match(migration, /participant\.nav\.library/u);
  assert.match(migration, /participant\.nav\.rewards/u);
  assert.match(migration, /participant\.nav\.b2b/u);
  assert.match(migration, /participant\.nav\.home/u);
  assert.match(migration, /registry_scope/u);
  assert.match(migration, /cross join desired/u);
  assert.match(migration, /on conflict \(organization_id, content_key, locale\) do update/u);
  assert.match(migration, /published_value = coalesce\(experience\.interface_content\.published_value, excluded\.published_value\)/u);
  assert.doesNotMatch(migration, /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/iu);
});

test("navigation registry reconciliation remains inside the active migration boundary", () => {
  assert.match(boundary, /'20260816170000_complete_review_remediation\.sql'/u);
  assert.match(boundary, /'20260816180000_reconcile_participant_navigation_registry\.sql'/u);
});
