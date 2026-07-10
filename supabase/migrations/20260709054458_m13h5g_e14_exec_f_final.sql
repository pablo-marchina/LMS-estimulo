-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709054458
-- Remote name: m13h5g_e14_exec_f_final
-- Remote SQL SHA-256: 17a0a8aa2b8723ecf4bd61ffa678812229fa89ad90433b13d675aa7f00b0eb57
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_exec_f(a uuid,b uuid,c text)
returns jsonb language sql volatile security definer set search_path=pg_catalog as $$
 with p as (select app_private.e14_prepare_f(a,b,c) x)
 select jsonb_build_object('request_id',(x->>'e')::uuid,'idempotency_key',x->>'k','replayed',(x->>'p')::boolean,'data',case when (x->>'p')::boolean then app_private.e14_snapshot_f((x->>'a')::uuid) else app_private.e14_af(a,b,app_private.e14_vf(a,b),(x->>'a')::uuid,(x->>'e')::uuid,x->>'h',x->>'k') end) from p
$$;
