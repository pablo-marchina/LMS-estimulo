-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709053243
-- Remote name: m13e5c_e14_write_dimension
-- Remote SQL SHA-256: 9dd93574a6679a53d77703319b28998f8316cc6bb4f6babd543b1629393f18e8
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_write_dimension(a uuid,b uuid,c integer,d numeric)
returns void language sql security definer set search_path=pg_catalog as $$
 insert into diagnostics.dimension_results(result_id,dimension_id,score,answered_ratio,evidence_status,details)
 select a,x.id,d,1,'observed','{"raw_range":"0..4"}'::jsonb from diagnostics.dimensions x where x.diagnostic_version_id=b and x.position=c
 on conflict(result_id,dimension_id) do nothing
$$;
