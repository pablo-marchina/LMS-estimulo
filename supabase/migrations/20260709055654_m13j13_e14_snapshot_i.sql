-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709055654
-- Remote name: m13j13_e14_snapshot_i
-- Remote SQL SHA-256: d413b58fe4d341e0b6857d9261c8299adb8fdcdd261446fa836ff0092bc877dd
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_snapshot_i(a uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select jsonb_build_object('attempt_id',x.attempt_id,'attempt_status',x.attempt_status,'attempt_aggregate_version',x.attempt_version,'passed',r.passed,'score',r.normalized_score,'journey_status',x.journey_status,'progress',p.completion_ratio,'point_balance',coalesce(bp.balance,0),'result_id',r.id)
 from app_private.e14_completion_context x
 left join assessment.results r on r.attempt_id=x.attempt_id and r.scoring_version='e14.v1'
 left join orchestration.progress_projections p on p.journey_instance_id=x.journey_instance_id
 left join engagement.point_balance_projections bp on bp.entrepreneur_id=x.entrepreneur_id and bp.journey_instance_id=x.journey_instance_id
 where x.attempt_id=a
$$;
