-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709053455
-- Remote name: m13e7_e14_ec
-- Remote SQL SHA-256: 21d238ee938e563019bda56b3237cc56ef0057ab8e9615ccd0d3c16ba7605b79
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_ec(a uuid,b uuid,c integer,d uuid,e uuid,f uuid,g text,h uuid,i text,j uuid,k bigint,l jsonb)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare x uuid;
begin
 x:=app_private.e14_deterministic_uuid(b::text||a::text||c::text);
 perform app_private.e14_emit_g(a,x,d,e,f,g,h,i,j,k,b,b,l);
 return x;
end;$$;
