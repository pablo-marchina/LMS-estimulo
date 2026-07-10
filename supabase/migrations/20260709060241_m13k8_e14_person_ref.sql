-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709060241
-- Remote name: m13k8_e14_person_ref
-- Remote SQL SHA-256: c5b569f739027405703c3f69fac64e74a5ff60f9cfa5cde97edb6caa51dfdf3a
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_person_ref(a uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select jsonb_build_object('entrepreneur_id',e.id,'preferred_name',e.preferred_name,'synthetic',coalesce((e.profile_data->>'synthetic')::boolean,false))
 from core.entrepreneurs e join app_private.e14_instance_context x on x.entrepreneur_id=e.id where x.journey_instance_id=a
$$;
