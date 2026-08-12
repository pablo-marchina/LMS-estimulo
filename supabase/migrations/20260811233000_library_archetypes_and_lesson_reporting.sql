begin;

create or replace function public.set_library_content_archetypes(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_library_item_version_id uuid,
  p_archetype_definition_ids uuid[],
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_ids uuid[] := coalesce(p_archetype_definition_ids, '{}'::uuid[]);
  v_count integer := 0;
begin
  perform app_private.e14_validate_idempotency_key(p_idempotency_key);

  if not app_private.e14_actor_has_permission(p_actor_user_account_id, p_organization_id, 'library.manage') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from catalog.library_item_versions version
    join catalog.library_items item on item.id = version.library_item_id
    where version.id = p_library_item_version_id
      and version.status = 'draft'
      and item.owner_organization_id = p_organization_id
  ) then
    raise exception 'LIBRARY_DRAFT_NOT_FOUND' using errcode = 'P0002';
  end if;

  if cardinality(v_ids) <> cardinality(array(select distinct id from unnest(v_ids) id)) then
    raise exception 'DUPLICATE_LIBRARY_ARCHETYPE' using errcode = '22023';
  end if;

  if exists (
    select 1
    from unnest(v_ids) requested(id)
    where not exists (
      select 1
      from diagnostics.archetype_definitions definition
      where definition.id = requested.id
        and definition.owner_organization_id = p_organization_id
        and definition.status = 'active'
    )
  ) then
    raise exception 'LIBRARY_ARCHETYPE_NOT_AVAILABLE' using errcode = '22023';
  end if;

  delete from catalog.library_item_archetype_links
  where library_item_version_id = p_library_item_version_id;

  insert into catalog.library_item_archetype_links(
    library_item_version_id,
    archetype_definition_id,
    created_by,
    created_at
  )
  select p_library_item_version_id, requested.id, p_actor_user_account_id, now()
  from unnest(v_ids) requested(id)
  on conflict (library_item_version_id, archetype_definition_id) do nothing;

  get diagnostics v_count = row_count;

  return jsonb_build_object(
    'request_id', app_private.e14_command_event_id('set_library_content_archetypes', p_actor_user_account_id, p_library_item_version_id, p_idempotency_key),
    'idempotency_key', p_idempotency_key,
    'replayed', false,
    'data', jsonb_build_object(
      'library_item_version_id', p_library_item_version_id,
      'archetype_definition_ids', to_jsonb(v_ids),
      'restriction_count', v_count
    )
  );
end;
$function$;

revoke all on function public.set_library_content_archetypes(uuid, uuid, uuid, uuid[], text) from public, anon, authenticated;
grant execute on function public.set_library_content_archetypes(uuid, uuid, uuid, uuid[], text) to postgres, service_role, app_worker;

create or replace function public.get_admin_lesson_reporting(
  p_actor_user_account_id uuid,
  p_organization_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog
as $function$
declare
  v_lessons jsonb;
begin
  if not app_private.estimulo_staff_can_view(p_actor_user_account_id, p_organization_id)
    and not app_private.e14_actor_has_permission(p_actor_user_account_id, p_organization_id, 'reporting.read') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'activity_version_id', lesson.activity_version_id,
    'title', lesson.title,
    'activity_type', lesson.activity_type,
    'assigned', lesson.assigned,
    'started', lesson.started,
    'completed', lesson.completed,
    'completion_rate', lesson.completion_rate
  ) order by lesson.title, lesson.activity_version_id), '[]'::jsonb)
  into v_lessons
  from (
    select
      activity_version.id as activity_version_id,
      activity_version.title,
      activity_version.activity_type,
      count(step_instance.id)::integer as assigned,
      count(step_instance.id) filter (
        where step_instance.started_at is not null
          or step_instance.status in ('in_progress', 'completed')
      )::integer as started,
      count(step_instance.id) filter (
        where step_instance.completed_at is not null
          or step_instance.status = 'completed'
      )::integer as completed,
      case
        when count(step_instance.id) = 0 then 0
        else round(
          100.0 * count(step_instance.id) filter (
            where step_instance.completed_at is not null
              or step_instance.status = 'completed'
          ) / count(step_instance.id),
          2
        )
      end as completion_rate
    from orchestration.step_instances step_instance
    join catalog.activity_versions activity_version on activity_version.id = step_instance.activity_version_id
    join orchestration.path_assignments assignment on assignment.id = step_instance.path_assignment_id
    join orchestration.journey_instances journey_instance on journey_instance.id = assignment.journey_instance_id
    join orchestration.enrollments enrollment on enrollment.id = journey_instance.enrollment_id
    join core.entrepreneurs entrepreneur on entrepreneur.id = enrollment.entrepreneur_id and entrepreneur.status = 'active'
    join catalog.journey_versions journey_version on journey_version.id = enrollment.journey_version_id
    join catalog.journey_definitions journey_definition on journey_definition.id = journey_version.journey_definition_id
    where journey_definition.owner_organization_id = p_organization_id
      and journey_definition.status = 'active'
      and journey_definition.code not in ('e14_runtime_validation_journey', 'task4_verify_journey')
      and enrollment.status in ('assigned', 'accepted', 'active', 'completed')
    group by activity_version.id, activity_version.title, activity_version.activity_type
  ) lesson;

  return jsonb_build_object(
    'organization_id', p_organization_id,
    'generated_at', now(),
    'lessons', v_lessons
  );
end;
$function$;

revoke all on function public.get_admin_lesson_reporting(uuid, uuid) from public, anon, authenticated;
grant execute on function public.get_admin_lesson_reporting(uuid, uuid) to postgres, service_role, app_worker;

commit;
