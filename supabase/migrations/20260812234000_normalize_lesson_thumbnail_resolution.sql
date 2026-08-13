begin;

-- Resolve lesson thumbnails from the lesson identity instead of the path-step
-- UUID. This keeps thumbnails stable across cloned journey versions and live
-- assignments while still preferring the image explicitly configured on the
-- current step.
create or replace function app_private.resolve_lesson_thumbnail_file_id(
  p_path_step_id uuid
) returns uuid
language plpgsql
stable
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_local_file_id uuid;
  v_activity_version_id uuid;
  v_activity_definition_id uuid;
  v_activity_code text;
  v_activity_title text;
  v_normalized_title text;
  v_org uuid;
  v_file_id uuid;
begin
  select
    nullif(step.metadata->>'continue_thumbnail_file_object_id','')::uuid,
    version.id,
    version.activity_definition_id,
    definition.code,
    version.title,
    journey_definition.owner_organization_id
  into
    v_local_file_id,
    v_activity_version_id,
    v_activity_definition_id,
    v_activity_code,
    v_activity_title,
    v_org
  from orchestration.path_steps step
  join catalog.activity_versions version on version.id = step.activity_version_id
  join catalog.activity_definitions definition on definition.id = version.activity_definition_id
  join orchestration.path_templates path on path.id = step.path_template_id
  join catalog.journey_versions journey_version on journey_version.id = path.journey_version_id
  join catalog.journey_definitions journey_definition on journey_definition.id = journey_version.journey_definition_id
  where step.id = p_path_step_id;

  if v_activity_version_id is null or v_org is null then return null; end if;

  if v_local_file_id is not null then
    select file.id into v_file_id
    from core.file_objects file
    where file.id = v_local_file_id
      and file.owner_organization_id = v_org
      and file.security_status = 'clean'
      and file.deleted_at is null;
    if v_file_id is not null then return v_file_id; end if;
  end if;

  v_normalized_title := regexp_replace(
    lower(btrim(coalesce(v_activity_title, ''))),
    '^aula[[:space:]]+[0-9]+[[:space:]]*[—–-][[:space:]]*',
    '',
    'i'
  );

  select candidate_file.id
  into v_file_id
  from orchestration.path_steps candidate
  join catalog.activity_versions candidate_version on candidate_version.id = candidate.activity_version_id
  join catalog.activity_definitions candidate_activity_definition on candidate_activity_definition.id = candidate_version.activity_definition_id
  join orchestration.path_templates candidate_path on candidate_path.id = candidate.path_template_id
  join catalog.journey_versions candidate_journey on candidate_journey.id = candidate_path.journey_version_id
  join catalog.journey_definitions candidate_journey_definition on candidate_journey_definition.id = candidate_journey.journey_definition_id
  join core.file_objects candidate_file
    on candidate_file.id = nullif(candidate.metadata->>'continue_thumbnail_file_object_id','')::uuid
   and candidate_file.owner_organization_id = v_org
   and candidate_file.security_status = 'clean'
   and candidate_file.deleted_at is null
  where candidate_journey_definition.owner_organization_id = v_org
    and nullif(candidate.metadata->>'continue_thumbnail_file_object_id','') is not null
    and (
      candidate_version.activity_definition_id = v_activity_definition_id
      or candidate_activity_definition.code = v_activity_code
      or exists (
        select 1
        from catalog.content_assets current_asset
        join catalog.content_assets candidate_asset
          on candidate_asset.activity_version_id = candidate_version.id
        where current_asset.activity_version_id = v_activity_version_id
          and (
            (
              current_asset.library_item_version_id is not null
              and current_asset.library_item_version_id = candidate_asset.library_item_version_id
            )
            or (
              current_asset.external_url is not null
              and candidate_asset.external_url is not null
              and regexp_replace(split_part(current_asset.external_url, '?', 1), '/+$', '')
                = regexp_replace(split_part(candidate_asset.external_url, '?', 1), '/+$', '')
            )
          )
      )
      or (
        length(v_normalized_title) >= 12
        and regexp_replace(
          lower(btrim(coalesce(candidate_version.title, ''))),
          '^aula[[:space:]]+[0-9]+[[:space:]]*[—–-][[:space:]]*',
          '',
          'i'
        ) = v_normalized_title
      )
    )
  order by
    (candidate_version.activity_definition_id = v_activity_definition_id) desc,
    (candidate_activity_definition.code = v_activity_code) desc,
    exists (
      select 1
      from catalog.content_assets current_asset
      join catalog.content_assets candidate_asset
        on candidate_asset.activity_version_id = candidate_version.id
      where current_asset.activity_version_id = v_activity_version_id
        and (
          (
            current_asset.library_item_version_id is not null
            and current_asset.library_item_version_id = candidate_asset.library_item_version_id
          )
          or (
            current_asset.external_url is not null
            and candidate_asset.external_url is not null
            and regexp_replace(split_part(current_asset.external_url, '?', 1), '/+$', '')
              = regexp_replace(split_part(candidate_asset.external_url, '?', 1), '/+$', '')
          )
        )
    ) desc,
    (candidate_journey.status = 'published') desc,
    candidate_journey.version_number desc,
    candidate.position_hint,
    candidate.id
  limit 1;

  return v_file_id;
end;
$function$;

revoke all on function app_private.resolve_lesson_thumbnail_file_id(uuid) from public, anon, authenticated;
grant execute on function app_private.resolve_lesson_thumbnail_file_id(uuid) to postgres, service_role, app_worker;

create or replace function public.get_admin_lesson_thumbnail_download(
  p_actor_user_account_id uuid,
  p_path_step_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_org uuid;
  v_file_id uuid;
  v_file core.file_objects%rowtype;
begin
  select definition.owner_organization_id
  into v_org
  from orchestration.path_steps step
  join orchestration.path_templates path on path.id = step.path_template_id
  join catalog.journey_versions version on version.id = path.journey_version_id
  join catalog.journey_definitions definition on definition.id = version.journey_definition_id
  where step.id = p_path_step_id;

  if v_org is null then raise exception 'LESSON_NOT_FOUND' using errcode = 'P0002'; end if;
  if not app_private.e14_actor_has_permission(p_actor_user_account_id, v_org, 'journey.definition.manage') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  v_file_id := app_private.resolve_lesson_thumbnail_file_id(p_path_step_id);
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
  v_path_step_id uuid;
  v_org uuid;
  v_file_id uuid;
  v_file core.file_objects%rowtype;
  v_entrepreneur_id uuid := app_private.e14_entrepreneur_for_account(p_actor_user_account_id);
begin
  select step.id, definition.owner_organization_id
  into v_path_step_id, v_org
  from orchestration.step_instances instance
  join orchestration.path_steps step on step.id = instance.path_step_id
  join orchestration.path_assignments assignment on assignment.id = instance.path_assignment_id
  join orchestration.journey_instances journey on journey.id = assignment.journey_instance_id
  join orchestration.enrollments enrollment on enrollment.id = journey.enrollment_id
  join catalog.journey_versions version on version.id = enrollment.journey_version_id
  join catalog.journey_definitions definition on definition.id = version.journey_definition_id
  where instance.id = p_step_instance_id
    and enrollment.entrepreneur_id = v_entrepreneur_id;

  if v_path_step_id is null or v_org is null then raise exception 'LESSON_NOT_AVAILABLE' using errcode = 'P0002'; end if;

  v_file_id := app_private.resolve_lesson_thumbnail_file_id(v_path_step_id);
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

revoke all on function public.get_admin_lesson_thumbnail_download(uuid, uuid) from public, anon, authenticated;
revoke all on function public.get_participant_lesson_thumbnail_download(uuid, uuid) from public, anon, authenticated;
grant execute on function public.get_admin_lesson_thumbnail_download(uuid, uuid) to postgres, service_role, app_worker;
grant execute on function public.get_participant_lesson_thumbnail_download(uuid, uuid) to postgres, service_role, app_worker;

-- Hydrate the resolved thumbnail into the participant outline. The React page
-- already keys its thumbnail card off this metadata, so old journey versions
-- immediately gain the same behavior as newly edited lessons without mutating
-- historical path-step rows.
create or replace function public.get_participant_journey_outline(
  p_actor_user_account_id uuid,
  p_journey_instance_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_entrepreneur_id uuid;
  v_journey jsonb;
  v_modules jsonb;
begin
  select entrepreneur.id into v_entrepreneur_id
  from core.entrepreneurs entrepreneur
  join iam.user_accounts account on account.id = entrepreneur.user_account_id
  where entrepreneur.user_account_id = p_actor_user_account_id
    and entrepreneur.status = 'active'
    and account.status = 'active';
  if v_entrepreneur_id is null then raise exception 'PARTICIPANT_NOT_FOUND' using errcode = 'P0002'; end if;

  select jsonb_build_object(
    'journey_instance_id', instance.id,
    'journey_status', instance.status,
    'journey_aggregate_version', instance.aggregate_version,
    'journey_version_id', version.id,
    'journey_title', version.title,
    'journey_description', version.description,
    'journey_version_number', version.version_number,
    'presentation', coalesce(version.configuration->'presentation', '{}'::jsonb),
    'progress', coalesce(progress.completion_ratio, 0),
    'completed_required_steps', coalesce(progress.completed_required_steps, 0),
    'total_required_steps', coalesce(progress.total_required_steps, 0)
  ) into v_journey
  from orchestration.journey_instances instance
  join orchestration.enrollments enrollment on enrollment.id = instance.enrollment_id
  join catalog.journey_versions version on version.id = enrollment.journey_version_id
  left join orchestration.progress_projections progress on progress.journey_instance_id = instance.id
  where instance.id = p_journey_instance_id
    and enrollment.entrepreneur_id = v_entrepreneur_id;
  if v_journey is null then raise exception 'JOURNEY_NOT_FOUND' using errcode = 'P0002'; end if;

  with ranked_assignments as (
    select assignment.id, assignment.path_template_id, assignment.status, assignment.created_at,
      row_number() over (
        partition by assignment.path_template_id
        order by case assignment.status when 'active' then 0 when 'completed' then 1 else 2 end,
          assignment.created_at desc, assignment.id desc
      ) as assignment_rank
    from orchestration.path_assignments assignment
    where assignment.journey_instance_id = p_journey_instance_id
      and (
        assignment.status = 'completed'
        or (
          assignment.status = 'active'
          and assignment.valid_from <= now()
          and (assignment.valid_until is null or assignment.valid_until > now())
        )
      )
  ), selected_assignments as (
    select id, path_template_id, status, created_at
    from ranked_assignments
    where assignment_rank = 1
  ), ordered_assignments as (
    select assignment.id, assignment.path_template_id, assignment.status,
      template.name as path_name, template.description as path_description,
      template.is_required as path_required,
      coalesce(template.presentation, '{}'::jsonb) as path_presentation,
      row_number() over (order by template.is_default desc, lower(template.name), template.id)::integer as path_position
    from selected_assignments assignment
    join orchestration.path_templates template on template.id = assignment.path_template_id
  ), step_rows as (
    select
      assignment.id as path_assignment_id,
      assignment.path_template_id,
      assignment.path_name,
      assignment.path_description,
      assignment.path_required,
      assignment.path_presentation,
      assignment.path_position,
      step_instance.id as step_instance_id,
      step_instance.status as step_status,
      step_instance.aggregate_version as step_aggregate_version,
      step_instance.available_at,
      step_instance.started_at,
      step_instance.completed_at,
      path_step.code as step_code,
      path_step.is_required,
      path_step.position_hint as step_position,
      coalesce(path_step.metadata, '{}'::jsonb)
        || case when thumbnail.file_object_id is not null then jsonb_build_object(
          'continue_thumbnail_file_object_id', thumbnail.file_object_id,
          'continue_thumbnail_alt', coalesce(nullif(path_step.metadata->>'continue_thumbnail_alt', ''), activity_version.title)
        ) else '{}'::jsonb end as step_metadata,
      activity_version.id as activity_version_id,
      activity_version.title as activity_title,
      activity_version.description as activity_description,
      activity_version.activity_type,
      activity_version.estimated_minutes
    from ordered_assignments assignment
    join orchestration.step_instances step_instance on step_instance.path_assignment_id = assignment.id
    join orchestration.path_steps path_step
      on path_step.id = step_instance.path_step_id
     and path_step.path_template_id = assignment.path_template_id
    join catalog.activity_versions activity_version on activity_version.id = step_instance.activity_version_id
    left join lateral (
      select app_private.resolve_lesson_thumbnail_file_id(path_step.id) as file_object_id
    ) thumbnail on true
  ), module_rows as (
    select
      path_template_id, path_name, path_description, path_required, path_presentation, path_position,
      count(*)::integer as activity_count,
      count(*) filter (where step_status = 'completed')::integer as completed_count,
      coalesce(sum(estimated_minutes), 0)::integer as estimated_minutes,
      jsonb_agg(jsonb_build_object(
        'step_instance_id', step_instance_id,
        'step_status', step_status,
        'step_aggregate_version', step_aggregate_version,
        'available_at', available_at,
        'started_at', started_at,
        'completed_at', completed_at,
        'step_code', step_code,
        'is_required', is_required,
        'position', step_position,
        'metadata', step_metadata,
        'activity_version_id', activity_version_id,
        'activity_title', activity_title,
        'activity_description', activity_description,
        'activity_type', activity_type,
        'estimated_minutes', estimated_minutes,
        'can_open', step_status in ('available', 'in_progress'),
        'can_start', step_status = 'available'
      ) order by step_position, step_instance_id) as activities
    from step_rows
    group by path_template_id, path_name, path_description, path_required, path_presentation, path_position
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'module_key', path_template_id::text,
    'module_id', null,
    'module_title', path_name,
    'module_description', coalesce(path_description, 'Atividades disponíveis nesta trilha da jornada.'),
    'module_position', path_position,
    'estimated_minutes', estimated_minutes,
    'metadata', path_presentation || jsonb_build_object('is_required', path_required),
    'path_name', path_name,
    'activity_count', activity_count,
    'completed_count', completed_count,
    'activities', activities
  ) order by path_position, path_template_id), '[]'::jsonb)
  into v_modules
  from module_rows;

  return v_journey || jsonb_build_object('modules', coalesce(v_modules, '[]'::jsonb));
end;
$function$;

revoke all on function public.get_participant_journey_outline(uuid, uuid) from public, anon, authenticated;
grant execute on function public.get_participant_journey_outline(uuid, uuid) to postgres, service_role, app_worker;

commit;
