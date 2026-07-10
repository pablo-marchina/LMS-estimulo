-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709060145
-- Remote name: m13k3_e14_q1
-- Remote SQL SHA-256: 080421213c570e13ec8e4f4782c49714809762530af496b9fac953fa414d0deb
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_q1(a uuid,b uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare x jsonb;
begin
 x:=app_private.e14_state_base(b);
 if x is null then raise exception 'RESOURCE_NOT_FOUND' using errcode='P0002';end if;
 if app_private.e14_entrepreneur_for_account(a) is distinct from (x->>'entrepreneur_id')::uuid then raise exception 'FORBIDDEN' using errcode='42501';end if;
 return app_private.e14_state_all(b);
end;$$;
