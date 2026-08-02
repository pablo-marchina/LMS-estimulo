import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const migrationPath = "supabase/migrations/20260802145444_include_domain_events_in_behavior_score.sql";

const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");

test("behavior score consumes learning domain events and recalculates continuously", async () => {
  const migration = await read(migrationPath);

  assert.match(migration, /behavior_score_interaction_type/);
  assert.match(migration, /when p_event_name='learning\.activity\.completed' then 'activity_complete'/);
  assert.match(migration, /when p_event_name='assessment\.attempt\.submitted' then 'delivery_submit'/);
  assert.match(migration, /when p_event_name='diagnostic\.session\.completed' then 'diagnostic_complete'/);
  assert.match(migration, /when p_event_name='learning\.library_content\.accessed' then 'library_open'/);

  assert.match(migration, /with normalized_events as/);
  assert.match(migration, /count\(scored_event\.event_id\)::bigint as event_count/);
  assert.match(migration, /'activity_complete','delivery_submit','diagnostic_complete'/);
  assert.match(migration, /'discussion_contribution','feedback_submit'/);
  assert.match(migration, /'latest_event_at',rec\.latest_event_at/);

  assert.match(migration, /create trigger trg_recalculate_behavior_score_after_domain_event/);
  assert.match(migration, /after insert on eventing\.events/);
  assert.match(migration, /new\.event_name='behavior\.interaction\.recorded'/);
  assert.match(migration, /perform app_private\.recalculate_behavior_scores\(new\.organization_id,v_entrepreneur_id\)/);
  assert.match(migration, /exception\s+when others then/);
  assert.match(migration, /BEHAVIOR_SCORE_RECALCULATION_FAILED/);
  assert.match(migration, /perform app_private\.recalculate_behavior_scores\(organization\.owner_organization_id,null\)/);

  assert.doesNotMatch(
    migration,
    /left join eventing\.events ev\s+on ev\.actor_id=.*event_name='behavior\.interaction\.recorded'/s,
  );
});
