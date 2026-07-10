-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709060103
-- Remote name: m13k2d_e14_state_check
-- Remote SQL SHA-256: c0a44219b12fca3ad44921d89de92189d72b23c7cad9a7bac5e446baf27f3469
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_state_check(a uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select jsonb_build_object('attempt_id',at.id,'attempt_number',at.attempt_number,'status',at.status,'aggregate_version',at.aggregate_version,'score',ar.normalized_score,'passed',ar.passed)
 from assessment.attempts at left join assessment.results ar on ar.attempt_id=at.id
 where at.step_instance_id in(select si.id from orchestration.path_assignments pa join orchestration.step_instances si on si.path_assignment_id=pa.id where pa.journey_instance_id=a)
 order by at.attempt_number desc limit 1
$$;
