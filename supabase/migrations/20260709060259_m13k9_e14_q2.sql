-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709060259
-- Remote name: m13k9_e14_q2
-- Remote SQL SHA-256: 1243bcfea5e51bc66875df0baf7eb44f5cc6e8bd7310900591c320dff981b88a
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_q2(a uuid,b uuid,c uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare x jsonb;
begin
 x:=app_private.e14_state_base(c);
 if x is null or (x->>'organization_id')::uuid<>b then raise exception 'RESOURCE_NOT_FOUND' using errcode='P0002';end if;
 if not app_private.e14_actor_has_permission(a,b,'journey.execution.read') then raise exception 'FORBIDDEN' using errcode='42501';end if;
 return app_private.e14_state_all(c)||jsonb_build_object('participant',app_private.e14_person_ref(c),'evidence_events',app_private.e14_evidence(c));
end;$$;
