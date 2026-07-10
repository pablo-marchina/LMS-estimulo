-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709055458
-- Remote name: m13j10b_e14_upsert_i
-- Remote SQL SHA-256: 6136632deff27cefccf7fcb3c0542cf332627bf75f555ec24c136d6a19a4b392
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_upsert_i(a jsonb,b uuid,c integer)
returns void language sql security definer set search_path=pg_catalog as $$
 insert into engagement.point_balance_projections(id,entrepreneur_id,journey_instance_id,balance,last_ledger_entry_id,projection_version,updated_at)
 values(app_private.e14_deterministic_uuid((a->>'instance')||'balance'),(a->>'person')::uuid,(a->>'instance')::uuid,c,b,1,now())
 on conflict(entrepreneur_id,journey_instance_id) do update set balance=excluded.balance,last_ledger_entry_id=excluded.last_ledger_entry_id,projection_version=engagement.point_balance_projections.projection_version+1,updated_at=now()
$$;
