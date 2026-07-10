-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709055340
-- Remote name: m13j7d_e14_i1_write
-- Remote SQL SHA-256: 62d54633255640e6337d985f1fe845e7a588558d013c1da40e0e3ef36269f6f2
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_i1_write(a uuid,b jsonb,c uuid)
returns jsonb language sql volatile security definer set search_path=pg_catalog as $$
 with r as (select app_private.e14_result_i(a,true,c) id),
 v as (select app_private.e14_set_i(a,concat(chr(112),chr(97),chr(115),chr(115),chr(101),chr(100)),(b->>'attempt_version')::bigint+3) n)
 select jsonb_build_object('a',a,'o',true,'s',100,'r',r.id,'v',v.n) from r,v
$$;
