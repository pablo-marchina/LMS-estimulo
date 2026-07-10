-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709055053
-- Remote name: m13j4_e14_result_i
-- Remote SQL SHA-256: fb3e130f77c7ae461c159c199f8149b5ee9e4ac0002ffddf08d7c144bf8a898b
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_result_i(a uuid,b boolean,c uuid)
returns uuid language sql security definer set search_path=pg_catalog as $$
 insert into assessment.results(id,attempt_id,scoring_version,raw_score,normalized_score,passed,details,calculated_at)
 values(app_private.e14_deterministic_uuid(a::text||'result'),a,'e14.v1',case when b then 1 else 0 end,case when b then 100 else 0 end,b,jsonb_build_object('correct',b,'source_event_id',c),now())
 on conflict(attempt_id,scoring_version) do update set raw_score=excluded.raw_score,normalized_score=excluded.normalized_score,passed=excluded.passed,details=excluded.details,calculated_at=excluded.calculated_at
 returning id
$$;
