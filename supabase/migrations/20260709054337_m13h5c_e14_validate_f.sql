-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709054337
-- Remote name: m13h5c_e14_validate_f
-- Remote SQL SHA-256: 2736bed8133d7bf7eed3367c377590b0e798bcbc1cbbffe337793e761d400117
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_validate_f(a uuid,b uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare x jsonb;
begin
 x:=app_private.e14_context_f(b);
 if x is null then raise exception 'RESOURCE_NOT_FOUND' using errcode='P0002';end if;
 if app_private.e14_entrepreneur_for_account(a) is distinct from (x->>'person')::uuid then raise exception 'FORBIDDEN' using errcode='42501';end if;
 if (x->>'sections')::integer<>4 or x->>'state'<>'in_progress' then raise exception 'ACTIVITY_INCOMPLETE' using errcode='P0001';end if;
 return x;
end;$$;
