import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const domainMigrationPath = "supabase/migrations/20260802145444_include_domain_events_in_behavior_score.sql";
const finalMigrationPath = "supabase/migrations/20260802153507_finalize_behavior_score_event_pipeline.sql";

const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");

test("behavior score consumes learning domain events and recalculates continuously", async () => {
  const [domainMigration, finalMigration] = await Promise.all([
    read(domainMigrationPath),
    read(finalMigrationPath),
  ]);

  assert.match(domainMigration, /behavior_score_interaction_type/);
  assert.match(domainMigration, /when p_event_name='learning\.activity\.completed' then 'activity_complete'/);
  assert.match(domainMigration, /when p_event_name='assessment\.attempt\.submitted' then 'delivery_submit'/);
  assert.match(domainMigration, /when p_event_name='diagnostic\.session\.completed' then 'diagnostic_complete'/);
  assert.match(domainMigration, /when p_event_name='learning\.library_content\.accessed' then 'library_open'/);

  assert.match(finalMigration, /create index if not exists ix_eventing_events_organization_actor_occurred/);
  assert.match(finalMigration, /with target_entrepreneurs as/);
  assert.match(finalMigration, /join eventing\.events event\s+on event\.actor_id=target\.user_account_id/s);
  assert.match(finalMigration, /event\.organization_id=p_organization_id/);
  assert.match(finalMigration, /count\(scored_event\.event_id\)::bigint as event_count/);
  assert.match(finalMigration, /'activity_complete','delivery_submit','diagnostic_complete'/);
  assert.match(finalMigration, /'discussion_contribution','feedback_submit'/);
  assert.match(finalMigration, /'latest_event_at',rec\.latest_event_at/);

  assert.match(finalMigration, /return public\.perform_participant_extension_before_continuous_behavior_score/);
  assert.doesNotMatch(finalMigration, /p_action='behavior_event'/);
  assert.match(finalMigration, /app_private\.behavior_score_interaction_type\(new\.event_name,new\.payload\) is null/);
  assert.doesNotMatch(finalMigration, /new\.event_name='behavior\.interaction\.recorded'/);
  assert.match(finalMigration, /perform app_private\.recalculate_behavior_scores\(new\.organization_id,v_entrepreneur_id\)/);
  assert.match(finalMigration, /exception\s+when others then/);
  assert.match(finalMigration, /BEHAVIOR_SCORE_RECALCULATION_FAILED/);

  assert.doesNotMatch(
    finalMigration,
    /left join eventing\.events ev\s+on ev\.actor_id=.*event_name='behavior\.interaction\.recorded'/s,
  );
});
