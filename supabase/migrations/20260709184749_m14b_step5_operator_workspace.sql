-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709184749
-- Remote name: m14b_step5_operator_workspace
-- Remote SQL SHA-256: 9b4b9b387778ee174c01aaf700d638e6df157065a167c585624e8a1ad3e1fe69
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function public.e14_get_operator_workspace(
  p_actor_user_account_id uuid,
  p_organization_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  v_versions jsonb;
  v_participants jsonb;
begin
  if not app_private.e14_actor_has_permission(
    p_actor_user_account_id,
    p_organization_id,
    'journey.execution.manage'
  ) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'journey_version_id', jv.id,
    'journey_definition_id', jd.id,
    'journey_code', jd.code,
    'title', jv.title,
    'version_number', jv.version_number,
    'status', jv.status,
    'content_hash', jv.content_hash,
    'published_at', jv.published_at
  ) order by jv.created_at desc), '[]'::jsonb)
  into v_versions
  from catalog.journey_versions jv
  join catalog.journey_definitions jd on jd.id = jv.journey_definition_id
  where jd.owner_organization_id = p_organization_id
    and jd.status = 'active';

  select coalesce(jsonb_agg(jsonb_build_object(
    'entrepreneur_id', e.id,
    'display_name', coalesce(e.preferred_name, e.legal_name, e.email_normalized),
    'email', e.email_normalized
  ) order by coalesce(e.preferred_name, e.legal_name, e.email_normalized)), '[]'::jsonb)
  into v_participants
  from core.entrepreneurs e
  where e.status = 'active'
    and e.profile_data->>'synthetic' = 'true'
    and e.profile_data->>'owner_organization_id' = p_organization_id::text;

  return jsonb_build_object(
    'organization_id', p_organization_id,
    'journey_versions', v_versions,
    'participants', v_participants
  );
end;
$$;

revoke all on function public.e14_get_operator_workspace(uuid,uuid) from public, anon, authenticated;
grant execute on function public.e14_get_operator_workspace(uuid,uuid) to service_role, app_worker;
