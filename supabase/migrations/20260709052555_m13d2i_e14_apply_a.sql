-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709052555
-- Remote name: m13d2i_e14_apply_a
-- Remote SQL SHA-256: ae3eb0962e57e42f71b2ac3a331b9075e07a35f4c1b53a9b6796f4e654f5091c
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_apply_a(a uuid,b uuid,c uuid,d uuid,e uuid,f text,g text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare x jsonb;
begin
 x:=app_private.e14_context_a(a,b,c);
 perform app_private.e14_insert_a(d,c,(x->>'entrepreneur_id')::uuid,b);
 perform app_private.e14_emit_a(e,a,(x->>'organization_id')::uuid,b,d,c,f,g);
 return app_private.e14_snapshot_a(d,c);
end;$$;
