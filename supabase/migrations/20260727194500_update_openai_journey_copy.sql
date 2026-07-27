set lock_timeout = '5s';
set statement_timeout = '5min';

-- Published versions remain immutable. Participant-facing copy lives on the
-- journey definition so wording can be corrected without rewriting curriculum
-- history or invalidating active enrollments.
update catalog.journey_definitions
set name = 'IA na prática para impulsionar o seu negócio',
    purpose = 'Aprenda a usar inteligência artificial para economizar tempo, vender mais e tomar melhores decisões no seu negócio. Uma jornada prática desenvolvida pela Estímulo em conjunto com a OpenAI (ChatGPT), com conteúdos para aplicar desde o primeiro dia.',
    updated_at = now()
where code = 'capacitacao_ia_mei_openai';

create or replace function public.e14_list_eligible_journeys(p_actor_user_account_id uuid)
returns jsonb
language sql
stable
security definer
set search_path to 'pg_catalog'
as $$
  with person as (
    select app_private.e14_entrepreneur_for_account(p_actor_user_account_id) id
  ), archetype as (
    select definition.code
    from diagnostics.archetype_assignments assignment
    join diagnostics.archetype_versions version on version.id=assignment.primary_archetype_version_id
    join diagnostics.archetype_definitions definition on definition.id=version.archetype_definition_id
    where assignment.entrepreneur_id=(select id from person)
    order by assignment.assigned_at desc
    limit 1
  ), already_enrolled as (
    select enrollment.journey_version_id
    from orchestration.enrollments enrollment
    where enrollment.entrepreneur_id=(select id from person)
      and enrollment.status in ('assigned','active','paused','completed')
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'journey_version_id',version.id,
    'title',coalesce(nullif(definition.name,''),version.title),
    'description',coalesce(definition.purpose,version.description),
    'open_to_all',(version.eligible_archetype_codes is null or array_length(version.eligible_archetype_codes,1) is null),
    'presentation',coalesce(version.configuration->'presentation','{}'::jsonb)
  ) order by coalesce((version.configuration#>>'{presentation,featured_rank}')::integer,9999),coalesce(nullif(definition.name,''),version.title)),'[]'::jsonb)
  from catalog.journey_versions version
  join catalog.journey_definitions definition on definition.id=version.journey_definition_id
  where version.status='published'
    and version.id not in(select journey_version_id from already_enrolled)
    and not exists(
      select 1 from catalog.journey_versions newer
      where newer.journey_definition_id=version.journey_definition_id
        and newer.status='published'
        and newer.version_number>version.version_number
    )
    and coalesce((version.configuration->>'publishable_to_real_participants')::boolean,true)
    and coalesce(version.configuration->>'visibility','')<>'internal_test_only'
    and (
      version.eligible_archetype_codes is null
      or array_length(version.eligible_archetype_codes,1) is null
      or (select code from archetype)=any(version.eligible_archetype_codes)
    );
$$;

create or replace function public.e14_list_participant_journeys(p_actor_user_account_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog'
as $$
declare
  v_entrepreneur_id uuid;
  v_journeys jsonb := '[]'::jsonb;
  v_state jsonb;
  v_row record;
  v_skipped integer := 0;
begin
  v_entrepreneur_id:=app_private.e14_entrepreneur_for_account(p_actor_user_account_id);
  if v_entrepreneur_id is null then
    return jsonb_build_object('actor_user_account_id',p_actor_user_account_id,'entrepreneur_id',null,'journeys','[]'::jsonb,'skipped_invalid_journeys',0);
  end if;

  for v_row in
    select instance.id journey_instance_id,
      instance.updated_at,
      coalesce(nullif(definition.name,''),version.title) title,
      coalesce(definition.purpose,version.description) description,
      version.status version_status,
      version.configuration,
      definition.slug,
      definition.code
    from orchestration.journey_instances instance
    join orchestration.enrollments enrollment on enrollment.id=instance.enrollment_id
    join catalog.journey_versions version on version.id=enrollment.journey_version_id
    join catalog.journey_definitions definition on definition.id=version.journey_definition_id
    where enrollment.entrepreneur_id=v_entrepreneur_id
      and enrollment.status in ('assigned','active','paused','completed')
      and version.status in ('published','retired')
      and coalesce(version.configuration->>'visibility','')<>'internal_test_only'
      and coalesce((version.configuration->>'publishable_to_real_participants')::boolean,true)
    order by instance.updated_at desc
  loop
    begin
      v_state:=app_private.e14_state_all(v_row.journey_instance_id);
      v_journeys:=v_journeys||jsonb_build_array(v_state||jsonb_build_object(
        'journey_title',v_row.title,
        'journey_description',v_row.description,
        'journey_slug',v_row.slug,
        'journey_presentation',coalesce(v_row.configuration->'presentation','{}'::jsonb)
      ));
    exception when others then
      v_skipped:=v_skipped+1;
    end;
  end loop;

  return jsonb_build_object(
    'actor_user_account_id',p_actor_user_account_id,
    'entrepreneur_id',v_entrepreneur_id,
    'journeys',v_journeys,
    'skipped_invalid_journeys',v_skipped
  );
end;
$$;

create or replace function public.get_participant_journey_outline(
  p_actor_user_account_id uuid,
  p_journey_instance_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog'
as $$
declare
  v_entrepreneur_id uuid;
  v_journey jsonb;
  v_modules jsonb;
begin
  select entrepreneur.id into v_entrepreneur_id
  from core.entrepreneurs entrepreneur
  where entrepreneur.user_account_id=p_actor_user_account_id
    and entrepreneur.status='active';
  if v_entrepreneur_id is null then
    raise exception 'PARTICIPANT_NOT_FOUND' using errcode='P0002';
  end if;

  select jsonb_build_object(
    'journey_instance_id',instance.id,
    'journey_status',instance.status,
    'journey_aggregate_version',instance.aggregate_version,
    'journey_version_id',version.id,
    'journey_title',coalesce(nullif(definition.name,''),version.title),
    'journey_description',coalesce(definition.purpose,version.description),
    'journey_version_number',version.version_number,
    'presentation',coalesce(version.configuration->'presentation','{}'::jsonb),
    'progress',coalesce(progress.completion_ratio,0),
    'completed_required_steps',coalesce(progress.completed_required_steps,0),
    'total_required_steps',coalesce(progress.total_required_steps,0)
  ) into v_journey
  from orchestration.journey_instances instance
  join orchestration.enrollments enrollment on enrollment.id=instance.enrollment_id
  join catalog.journey_versions version on version.id=enrollment.journey_version_id
  join catalog.journey_definitions definition on definition.id=version.journey_definition_id
  left join orchestration.progress_projections progress on progress.journey_instance_id=instance.id
  where instance.id=p_journey_instance_id
    and enrollment.entrepreneur_id=v_entrepreneur_id;
  if v_journey is null then
    raise exception 'JOURNEY_NOT_FOUND' using errcode='P0002';
  end if;

  with step_rows as (
    select template.id::text module_key,
      template.id module_id,
      template.name module_title,
      coalesce(template.description,'Escolha uma atividade e avance no seu ritmo.') module_description,
      template.position module_position,
      null::integer module_estimated_minutes,
      template.presentation||jsonb_build_object('is_required',template.is_required) module_metadata,
      template.name path_name,
      step_instance.id step_instance_id,
      step_instance.status step_status,
      step_instance.aggregate_version step_aggregate_version,
      step_instance.available_at,
      step_instance.started_at,
      step_instance.completed_at,
      path_step.code step_code,
      path_step.is_required,
      path_step.position_hint step_position,
      coalesce(path_step.metadata,'{}'::jsonb) step_metadata,
      activity_version.id activity_version_id,
      activity_version.title activity_title,
      activity_version.description activity_description,
      activity_version.activity_type,
      activity_version.estimated_minutes
    from orchestration.path_assignments assignment
    join orchestration.path_templates template on template.id=assignment.path_template_id
    join orchestration.step_instances step_instance on step_instance.path_assignment_id=assignment.id
    join orchestration.path_steps path_step on path_step.id=step_instance.path_step_id
    join catalog.activity_versions activity_version on activity_version.id=step_instance.activity_version_id
    where assignment.journey_instance_id=p_journey_instance_id
      and assignment.status in ('active','completed')
  ), module_rows as (
    select module_key,module_id,module_title,module_description,module_position,module_estimated_minutes,module_metadata,path_name,
      count(*)::integer activity_count,
      count(*) filter(where step_status='completed')::integer completed_count,
      jsonb_agg(jsonb_build_object(
        'step_instance_id',step_instance_id,
        'step_status',step_status,
        'step_aggregate_version',step_aggregate_version,
        'available_at',available_at,
        'started_at',started_at,
        'completed_at',completed_at,
        'step_code',step_code,
        'is_required',is_required,
        'position',step_position,
        'metadata',step_metadata,
        'activity_version_id',activity_version_id,
        'activity_title',activity_title,
        'activity_description',activity_description,
        'activity_type',activity_type,
        'estimated_minutes',estimated_minutes,
        'can_open',step_status in ('available','in_progress','completed'),
        'can_start',step_status='available'
      ) order by step_position,step_instance_id) activities
    from step_rows
    group by module_key,module_id,module_title,module_description,module_position,module_estimated_minutes,module_metadata,path_name
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'module_key',module_key,
    'module_id',module_id,
    'module_title',module_title,
    'module_description',module_description,
    'module_position',module_position,
    'estimated_minutes',module_estimated_minutes,
    'metadata',module_metadata,
    'path_name',path_name,
    'activity_count',activity_count,
    'completed_count',completed_count,
    'activities',activities
  ) order by module_position,module_key),'[]'::jsonb)
  into v_modules
  from module_rows;

  return v_journey||jsonb_build_object('modules',coalesce(v_modules,'[]'::jsonb));
end;
$$;
