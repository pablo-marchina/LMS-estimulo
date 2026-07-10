-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709052811
-- Remote name: m13d3g_e14_exec_b_final
-- Remote SQL SHA-256: 4e8f091eb3b3257f5062ab04495a0176342b48abe3278bec415a05a74bb82222
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_exec_b(a uuid,b uuid,c uuid,d text,e integer,f integer,g text)
returns jsonb language sql volatile security definer set search_path=pg_catalog as $$
 with p as (select app_private.e14_prepare_b(a,b,c,d,e,f,g) x)
 select jsonb_build_object('request_id',(x->>'e')::uuid,'idempotency_key',x->>'k','replayed',(x->>'p')::boolean,'data',case when (x->>'p')::boolean then app_private.e14_snapshot_b((x->>'e')::uuid) else app_private.e14_apply_b(a,b,c,d,e,f,(x->>'r')::uuid,(x->>'e')::uuid,x->>'h',x->>'k') end) from p
$$;
