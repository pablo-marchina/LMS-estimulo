-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709054804
-- Remote name: m13i9_e14_exec_h
-- Remote SQL SHA-256: bd287acbaca824f9998e0a9cd95a25b47778b9e25a2b26a2e8d8f0eecea1368c
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_exec_h(a uuid,b uuid,c uuid,d text,e text)
returns jsonb language sql volatile security definer set search_path=pg_catalog as $$
 with p as (select app_private.e14_prepare_10(a,b,c,d,e) x)
 select jsonb_build_object('request_id',(x->>'e')::uuid,'idempotency_key',x->>'k','replayed',(x->>'p')::boolean,'data',case when (x->>'p')::boolean then app_private.e14_snapshot_10((x->>'r')::uuid) else app_private.e14_apply_h(a,b,c,d,(x->>'r')::uuid,(x->>'e')::uuid,x->>'h',x->>'k') end) from p
$$;
