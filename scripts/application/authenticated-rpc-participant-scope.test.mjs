import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile("supabase/functions/authenticated-rpc/index.ts", "utf8");

function setBody(name) {
  const marker = `const ${name} = new Set(\``;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `${name} must remain statically auditable`);
  const bodyStart = start + marker.length;
  const endMarker = "`.split(/\\s+/u));";
  const end = source.indexOf(endMarker, bodyStart);
  assert.notEqual(end, -1, `${name} must keep the static split form`);
  return new Set(source.slice(bodyStart, end).trim().split(/\s+/u));
}

const allowed = setBody("allowedRpcs");
const participantOnly = setBody("participantOnlyRpcs");

for (const rpc of [
  "ensure_participant_open_paths",
  "record_activity_asset_progress",
  "get_participant_journey_outline",
  "get_participant_lesson_thumbnail_download",
]) {
  test(`${rpc} remains allowlisted and participant-scoped`, () => {
    assert.equal(allowed.has(rpc), true);
    assert.equal(participantOnly.has(rpc), true);
  });
}
