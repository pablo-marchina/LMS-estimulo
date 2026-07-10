-- Canonical reconstruction of the E14 runtime migration range.
-- Generated deterministically from the Supabase migration history export.
-- This file is documentation/replay evidence; executable history remains
-- represented by the timestamped files under supabase/migrations.

-- BEGIN 20260710165530_m15a_e14_semantic_activity_session_close
-- Remote SQL SHA-256: 8fbc1cc944fefa9e9bd5cfed4deb572c07d730162b5267b3074ce511fd867d96
set lock_timeout = '5s';
set statement_timeout = '5min';

create or replace function app_private.e14_close_completed_activity_session(
  p_activity_session_id uuid
) returns void
language sql
security definer
set search_path = pg_catalog
as $$
  update orchestration.activity_sessions
     set ended_at = now(),
         last_seen_at = now()
   where id = p_activity_session_id
     and ended_at is null
$$;

revoke all on function app_private.e14_close_completed_activity_session(uuid)
from public, anon, authenticated;

create or replace function app_private.e14_i1_state(a jsonb, b uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  sv bigint;
  jv bigint;
  t integer;
begin
  perform app_private.e14_close_completed_activity_session(
    (a ->> 'activity_session')::uuid
  );
  sv := app_private.e14_complete_step_state(
    (a ->> 'step')::uuid,
    (a ->> 'step_version')::bigint
  );
  perform app_private.e14_complete_path_state((a ->> 'assignment')::uuid);
  jv := app_private.e14_complete_journey_state(
    (a ->> 'instance')::uuid,
    (a ->> 'journey_version')::bigint
  );
  perform app_private.e14_complete_progress((a ->> 'instance')::uuid);
  t := app_private.e14_sum_i(a);
  perform app_private.e14_upsert_i(a, b, t);
  return jsonb_build_object(
    'point_balance', t,
    'step_aggregate_version', sv,
    'journey_aggregate_version', jv,
    'journey_status', 'completed',
    'progress', 1
  );
end;
$$;

drop function app_private.e14_close_activity_session(uuid);
-- END 20260710165530_m15a_e14_semantic_activity_session_close
