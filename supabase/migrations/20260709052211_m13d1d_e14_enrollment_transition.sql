-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709052211
-- Remote name: m13d1d_e14_enrollment_transition
-- Remote SQL SHA-256: 474e3f65d7bece3d8a2e76856f17ec8a0c868d9e3f2d36464f2538a8b214ec16
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_enrollment_transition(p_enrollment uuid)
returns bigint language plpgsql security definer set search_path=pg_catalog as $$
declare v bigint;
begin
 update orchestration.enrollments set status='active',accepted_at=coalesce(accepted_at,now()),aggregate_version=aggregate_version+1 where id=p_enrollment returning aggregate_version into v;
 return v;
end;$$;
revoke all on function app_private.e14_enrollment_transition(uuid) from public,anon,authenticated;
