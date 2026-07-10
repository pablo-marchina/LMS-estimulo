-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709055805
-- Remote name: m13j14f_e14_exec_i
-- Remote SQL SHA-256: d37211b7cccab64031d4835d7204c8d91e561d5b3050595a8d1bb9f7afd823d7
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_exec_i(a uuid,b uuid,c bigint,d text)
returns jsonb language sql volatile security definer set search_path=pg_catalog as $$
 with p as (select app_private.e14_prepare_i(a,b,c,d) x)
 select jsonb_build_object('request_id',(x->>'e')::uuid,'idempotency_key',x->>'k','replayed',(x->>'p')::boolean,'data',case when (x->>'p')::boolean then app_private.e14_si(b) else app_private.e14_ci(a,b,app_private.e14_vi(a,b,c),(x->>'e')::uuid,x->>'h',x->>'k') end) from p
$$;
