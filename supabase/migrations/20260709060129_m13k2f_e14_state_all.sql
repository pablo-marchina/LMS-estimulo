-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709060129
-- Remote name: m13k2f_e14_state_all
-- Remote SQL SHA-256: dfa33b7189078ea0f34f9eadc6651c6c3f2bd81fcc6b27bdd4382bae51f19034
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_state_all(a uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select app_private.e14_state_base(a)||jsonb_build_object('d',app_private.e14_state_diag(a),'s',app_private.e14_state_step(a),'q',app_private.e14_state_check(a),'p',app_private.e14_state_points(a))
$$;
