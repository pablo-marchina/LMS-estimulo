-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709055449
-- Remote name: m13j10a_e14_sum_i
-- Remote SQL SHA-256: 42b62a2998318fef9ef04cf43482cc23642688facedd6646f64188251a40d689
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_sum_i(a jsonb)
returns integer language sql stable security definer set search_path=pg_catalog as $$
 select coalesce(sum(amount),0)::integer from engagement.point_ledger where entrepreneur_id=(a->>'person')::uuid and journey_instance_id=(a->>'instance')::uuid
$$;
