begin;

-- Lesson completion is a product rule, not an implicit UI convention. Keep one
-- published +5 rule per completed activity and let the event runtime enforce
-- idempotency by step instance.
do $migration$
declare
  v_org_id uuid;
  v_eligibility_rule_version_id uuid;
  v_definition_id uuid;
  v_next_version integer;
  v_policy jsonb := jsonb_build_object(
    'scope', 'enrollment_activity',
    'maximum', 1,
    'transferable', false,
    'trigger', jsonb_build_object('event_name', 'learning.activity.completed')
  );
begin
  select id into v_org_id
  from iam.organizations
  where slug = 'estimulo' and status = 'active'
  order by created_at
  limit 1;

  if v_org_id is null then raise exception 'ESTIMULO_ORGANIZATION_NOT_FOUND'; end if;

  select rv.id into v_eligibility_rule_version_id
  from orchestration.rule_versions rv
  join orchestration.rule_definitions rd on rd.id = rv.rule_definition_id
  where rd.owner_organization_id = v_org_id
    and rd.code = 'e14_always_eligible'
    and rv.status = 'published'
  order by rv.version_number desc
  limit 1;

  if v_eligibility_rule_version_id is null then raise exception 'ALWAYS_ELIGIBLE_RULE_NOT_FOUND'; end if;

  insert into engagement.point_rule_definitions(owner_organization_id, code, name, status)
  values (v_org_id, 'complete_lesson', 'Concluir uma aula', 'active')
  on conflict (owner_organization_id, code) do update
    set name = excluded.name,
        status = 'active'
  returning id into v_definition_id;

  if exists (
    select 1
    from engagement.point_rule_versions
    where point_rule_definition_id = v_definition_id
      and status = 'published'
      and published_at is not null
      and amount = 5
      and eligibility_rule_version_id = v_eligibility_rule_version_id
      and recurrence_policy = v_policy
  ) then
    return;
  end if;

  update engagement.point_rule_versions
  set status = 'retired'
  where point_rule_definition_id = v_definition_id
    and status = 'published';

  select coalesce(max(version_number), 0) + 1
  into v_next_version
  from engagement.point_rule_versions
  where point_rule_definition_id = v_definition_id;

  insert into engagement.point_rule_versions(
    point_rule_definition_id, version_number, status, amount,
    eligibility_rule_version_id, recurrence_policy, published_at
  ) values (
    v_definition_id, v_next_version, 'published', 5,
    v_eligibility_rule_version_id, v_policy, now()
  );
end;
$migration$;

-- A thumbnail describes the lesson itself. Older journey versions may point at
-- the same activity definition while only one path_step contains the uploaded
-- image metadata. Prefer the local path thumbnail, then inherit the newest
-- published thumbnail from the same activity definition.
create or replace function public.get_participant_lesson_thumbnail_download(
  p_actor_user_account_id uuid,
  p_step_instance_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_file_id uuid;
  v_org uuid;
  v_activity_definition_id uuid;
  v_file core.file_objects%rowtype;
  v_entrepreneur_id uuid := app_private.e14_entrepreneur_for_account(p_actor_user_account_id);
begin
  select
    nullif(step.metadata->>'continue_thumbnail_file_object_id','')::uuid,
    definition.owner_organization_id,
    activity_version.activity_definition_id
  into v_file_id, v_org, v_activity_definition_id
  from orchestration.step_instances instance
  join orchestration.path_steps step on step.id = instance.path_step_id
  join catalog.activity_versions activity_version on activity_version.id = instance.activity_version_id
  join orchestration.path_assignments assignment on assignment.id = instance.path_assignment_id
  join orchestration.journey_instances journey on journey.id = assignment.journey_instance_id
  join orchestration.enrollments enrollment on enrollment.id = journey.enrollment_id
  join catalog.journey_versions version on version.id = enrollment.journey_version_id
  join catalog.journey_definitions definition on definition.id = version.journey_definition_id
  where instance.id = p_step_instance_id
    and enrollment.entrepreneur_id = v_entrepreneur_id;

  if v_org is null then raise exception 'LESSON_NOT_AVAILABLE' using errcode = 'P0002'; end if;

  if v_file_id is null then
    select nullif(candidate.metadata->>'continue_thumbnail_file_object_id','')::uuid
    into v_file_id
    from orchestration.path_steps candidate
    join catalog.activity_versions candidate_version on candidate_version.id = candidate.activity_version_id
    join orchestration.path_templates candidate_path on candidate_path.id = candidate.path_template_id
    join catalog.journey_versions candidate_journey on candidate_journey.id = candidate_path.journey_version_id
    join catalog.journey_definitions candidate_definition on candidate_definition.id = candidate_journey.journey_definition_id
    where candidate_version.activity_definition_id = v_activity_definition_id
      and candidate_definition.owner_organization_id = v_org
      and nullif(candidate.metadata->>'continue_thumbnail_file_object_id','') is not null
    order by
      (candidate_journey.status = 'published') desc,
      candidate_journey.version_number desc,
      candidate.position_hint,
      candidate.id
    limit 1;
  end if;

  if v_file_id is null then raise exception 'LESSON_THUMBNAIL_NOT_FOUND' using errcode = 'P0002'; end if;

  select * into v_file
  from core.file_objects
  where id = v_file_id
    and owner_organization_id = v_org
    and security_status = 'clean'
    and deleted_at is null;

  if not found then raise exception 'LESSON_THUMBNAIL_NOT_AVAILABLE' using errcode = 'P0002'; end if;
  return jsonb_build_object('bucket', v_file.bucket, 'object_key', v_file.object_key, 'content_type', v_file.content_type);
end;
$function$;

revoke all on function public.get_participant_lesson_thumbnail_download(uuid, uuid) from public, anon, authenticated;
grant execute on function public.get_participant_lesson_thumbnail_download(uuid, uuid) to postgres, service_role, app_worker;

-- Admin-only descriptor used to render the already persisted issuer media back
-- in step 1. This makes save state observable instead of relying on hidden IDs.
create or replace function public.get_admin_certificate_issuer_media_download(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_role text
) returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_file_id uuid;
  v_file core.file_objects%rowtype;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id, p_organization_id, 'engagement.manage') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_role not in ('logo', 'signature') then raise exception 'ISSUER_MEDIA_ROLE_INVALID' using errcode = '22023'; end if;

  select case p_role
    when 'logo' then issuer.logo_file_object_id
    else issuer.signature_file_object_id
  end
  into v_file_id
  from engagement.certificate_issuers issuer
  where issuer.owner_organization_id = p_organization_id
    and issuer.status = 'active'
  order by issuer.created_at desc, issuer.id desc
  limit 1;

  if v_file_id is null then raise exception 'ISSUER_MEDIA_NOT_FOUND' using errcode = 'P0002'; end if;

  select * into v_file
  from core.file_objects
  where id = v_file_id
    and owner_organization_id = p_organization_id
    and security_status = 'clean'
    and deleted_at is null;

  if not found then raise exception 'ISSUER_MEDIA_NOT_AVAILABLE' using errcode = 'P0002'; end if;
  return jsonb_build_object('bucket', v_file.bucket, 'object_key', v_file.object_key, 'content_type', v_file.content_type);
end;
$function$;

revoke all on function public.get_admin_certificate_issuer_media_download(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.get_admin_certificate_issuer_media_download(uuid, uuid, text) to postgres, service_role, app_worker;

commit;
