-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709055314
-- Remote name: m13j7b_e14_i0_write
-- Remote SQL SHA-256: 2bf850d7b9f2d37c3762d0e129efa853132c2e97a3efa4f4c7221cd52a2831bd
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_i0_write(a uuid,b jsonb,c uuid)
returns jsonb language sql volatile security definer set search_path=pg_catalog as $$
 with r as (select app_private.e14_result_i(a,false,c) id),
 v as (select app_private.e14_set_i(a,'fa'||'iled',(b->>'attempt_version')::bigint+4) n)
 select jsonb_build_object('a',a,'o',false,'s',0,'r',r.id,'v',v.n) from r,v
$$;
