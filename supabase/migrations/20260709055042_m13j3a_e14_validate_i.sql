-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709055042
-- Remote name: m13j3a_e14_validate_i
-- Remote SQL SHA-256: b313a37896584acb8e3f8fbe6aa65f9af0144def9c1b13a3a42c8f38c94cd819
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_validate_i(a uuid,b uuid,c bigint)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare x jsonb;
begin
 x:=app_private.e14_context_i_raw(b);
 if x is null then raise exception 'RESOURCE_NOT_FOUND' using errcode='P0002';end if;
 if app_private.e14_entrepreneur_for_account(a) is distinct from (x->>'person')::uuid then raise exception 'FORBIDDEN' using errcode='42501';end if;
 if x->>'attempt_state'<>'in_progress' then raise exception 'ATTEMPT_NOT_IN_PROGRESS' using errcode='P0001';end if;
 if (x->>'attempt_version')::bigint<>c then raise exception 'AGGREGATE_VERSION_CONFLICT' using errcode='P0001';end if;
 if (x->>'answer_count')::integer<>1 then raise exception 'ASSESSMENT_INCOMPLETE' using errcode='P0001';end if;
 return x;
end;$$;
