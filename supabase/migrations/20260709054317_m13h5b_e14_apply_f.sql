-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709054317
-- Remote name: m13h5b_e14_apply_f
-- Remote SQL SHA-256: 4aed7a9958d96a55a5e23313ab720b4916efb684a6c1d79300fc2999fdfd0772
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_apply_f(a uuid,b uuid,c jsonb,d uuid,e uuid,f text,g text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare n integer;
begin
 n:=app_private.e14_attempt_number(b,(c->>'max_attempts')::integer);
 perform app_private.e14_emit_f(a,d,c,e,f,g,n);
 perform app_private.e14_insert_attempt(d,b,c,n);
 perform app_private.e14_set_attempt_count(b,n);
 return app_private.e14_snapshot_f(d);
end;$$;
