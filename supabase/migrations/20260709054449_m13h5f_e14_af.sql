-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709054449
-- Remote name: m13h5f_e14_af
-- Remote SQL SHA-256: f3d1c16352a2e0f2ae4a0407bc1012077b3d8b775ef5b326e1eaba43f86134de
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_af(a uuid,b uuid,c jsonb,d uuid,e uuid,f text,g text) returns jsonb language sql volatile security definer set search_path=pg_catalog as $$select app_private.e14_apply_f(a,b,c,d,e,f,g)$$;
