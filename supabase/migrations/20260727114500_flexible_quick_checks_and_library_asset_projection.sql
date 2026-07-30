-- Flexible quick checks and reusable Library content projection.
-- Originally exercised in the Supabase test environment on 2026-07-27.

create or replace function app_private.e14_context_i_raw(a uuid)
returns jsonb
language sql
stable security definer
set search_path to 'pg_catalog'
as $function$
  select jsonb_build_object(
    'attempt_id',x.attempt_id,
    'person',x.entrepreneur_id,
    'step',x.step_instance_id,
    'activity',x.activity_version_id,
    'assignment',x.path_assignment_id,
    'instance',x.journey_instance_id,
    'org',x.owner_organization_id,
    'attempt_number',x.attempt_number,
    'attempt_state',x.attempt_status,
    'attempt_version',x.attempt_version,
    'step_version',x.step_version,
    'journey_version',x.journey_version,
    'activity_session',x.activity_session_id,
    'sections',x.accepted_observation_count,
    'question_count',questions.question_count,
    'answer_count',responses.answer_count,
    'correct_count',responses.correct_count,
    'passing_score',coalesce(spec.passing_score,100),
    'normalized_score',case when questions.question_count>0 then round((responses.correct_count::numeric/questions.question_count::numeric)*100,2) else 0 end,
    'correct',questions.question_count>0
      and responses.answer_count=questions.question_count
      and ((responses.correct_count::numeric/questions.question_count::numeric)*100)>=coalesce(spec.passing_score,100)
  )
  from app_private.e14_completion_context x
  left join assessment.assessment_specs spec on spec.activity_version_id=x.activity_version_id
  cross join lateral (
    select count(*)::integer question_count
    from assessment.questions q
    where q.activity_version_id=x.activity_version_id
  ) questions
  cross join lateral (
    select
      count(*)::integer answer_count,
      count(*) filter(where coalesce((r.response_value->>'correct')::boolean,false))::integer correct_count
    from assessment.responses r
    where r.attempt_id=x.attempt_id
  ) responses
  where x.attempt_id=a
$function$;

create or replace function app_private.e14_validate_i(a uuid,b uuid,c bigint)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare x jsonb;
begin
  x:=app_private.e14_context_i_raw(b);
  if x is null then raise exception 'RESOURCE_NOT_FOUND' using errcode='P0002'; end if;
  if app_private.e14_entrepreneur_for_account(a) is distinct from (x->>'person')::uuid then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if x->>'attempt_state'<>'in_progress' then raise exception 'ATTEMPT_NOT_IN_PROGRESS' using errcode='P0001'; end if;
  if (x->>'attempt_version')::bigint<>c then raise exception 'AGGREGATE_VERSION_CONFLICT' using errcode='P0001'; end if;
  if (x->>'question_count')::integer<1 or (x->>'answer_count')::integer<>(x->>'question_count')::integer then raise exception 'ASSESSMENT_INCOMPLETE' using errcode='P0001'; end if;
  return x;
end;
$function$;

alter table catalog.content_assets
  add column if not exists library_item_version_id uuid;

do $constraint$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint constraint_row
    where constraint_row.conrelid='catalog.content_assets'::regclass
      and constraint_row.conname='content_assets_library_item_version_id_fkey'
  ) then
    alter table catalog.content_assets
      add constraint content_assets_library_item_version_id_fkey
      foreign key (library_item_version_id)
      references catalog.library_item_versions(id)
      on delete set null;
  end if;
end
$constraint$;

create index if not exists ix_content_assets_library_item_version_id
  on catalog.content_assets(library_item_version_id);

update catalog.content_assets asset
set library_item_version_id=version.id
from catalog.library_item_versions version
join catalog.library_items item on item.id=version.library_item_id
where asset.library_item_version_id is null
  and version.status='published'
  and item.status='active'
  and (
    (asset.external_url is not null and version.external_url=asset.external_url)
    or lower(asset.title)=lower(version.title)
  );

create or replace function public.e14_get_participant_experience(
  p_actor_user_account_id uuid,
  p_journey_instance_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_state jsonb;
  v_journey_version_id uuid;
  v_diagnostic_version_id uuid;
  v_activity_version_id uuid;
  v_step_instance_id uuid;
  v_journey jsonb;
  v_diagnostic jsonb;
  v_activity jsonb;
  v_assessment jsonb;
begin
  v_state:=app_private.e14_q1(p_actor_user_account_id,p_journey_instance_id);
  v_journey_version_id:=(v_state->>'journey_version_id')::uuid;
  v_activity_version_id:=nullif(v_state->'s'->>'version_id','')::uuid;
  v_step_instance_id:=nullif(v_state->'s'->>'step_instance_id','')::uuid;

  select (version.configuration->>'diagnostic_version_id')::uuid,
    jsonb_build_object('title',version.title,'description',version.description,'purpose',definition.purpose,'presentation',coalesce(version.configuration->'presentation','{}'::jsonb))
  into v_diagnostic_version_id,v_journey
  from catalog.journey_versions version
  join catalog.journey_definitions definition on definition.id=version.journey_definition_id
  where version.id=v_journey_version_id;

  if v_diagnostic_version_id is not null then
    select jsonb_build_object(
      'version_id',version.id,
      'items',coalesce((
        select jsonb_agg(jsonb_build_object(
          'id',item.id,'code',item.code,'prompt',item.prompt,'item_type',item.item_type,'position',item.position,'is_required',item.is_required,
          'options',coalesce((select jsonb_agg(jsonb_build_object('id',option.id,'code',option.code,'label',option.label,'position',option.position) order by option.position) from diagnostics.item_options option where option.item_id=item.id),'[]'::jsonb),
          'response',(select jsonb_build_object('revision',response.revision,'option_code',response.response_value->>'option_code') from diagnostics.responses response where response.session_id=nullif(v_state->'d'->>'session_id','')::uuid and response.item_id=item.id order by response.revision desc limit 1)
        ) order by item.position)
        from diagnostics.items item where item.diagnostic_version_id=version.id
      ),'[]'::jsonb)
    ) into v_diagnostic
    from diagnostics.diagnostic_versions version
    where version.id=v_diagnostic_version_id and version.status='published';
  end if;

  if v_activity_version_id is not null then
    select jsonb_build_object(
      'version_id',version.id,
      'title',version.title,
      'description',version.description,
      'estimated_minutes',version.estimated_minutes,
      'sections',coalesce(version.configuration->'content_sections','[]'::jsonb),
      'prompts',coalesce(version.configuration->'prompts','[]'::jsonb),
      'assets',coalesce((
        select jsonb_agg(jsonb_build_object(
          'id',asset.id,
          'asset_type',asset.asset_type,
          'title',asset.title,
          'external_url',asset.external_url,
          'file_object_id',asset.file_object_id,
          'original_filename',file.original_filename,
          'content_type',file.content_type,
          'language_code',asset.language_code,
          'accessibility_metadata',asset.accessibility_metadata,
          'position',asset.position,
          'is_required',asset.is_required,
          'library_item_version_id',asset.library_item_version_id,
          'library_slug',library_item.slug,
          'library_body',library_version.body,
          'library_content_kind',library_version.content_kind,
          'library_content_format',library_version.content_format,
          'library_summary',library_version.summary,
          'library_source_name',library_version.source_name,
          'progress',jsonb_build_object(
            'watched_seconds',coalesce(asset_progress.watched_seconds,0),
            'duration_seconds',asset_progress.duration_seconds,
            'completion_ratio',coalesce(asset_progress.completion_ratio,0),
            'completed',asset_progress.completed_at is not null
          )
        ) order by asset.position,asset.id)
        from catalog.content_assets asset
        left join core.file_objects file on file.id=asset.file_object_id
        left join catalog.library_item_versions library_version on library_version.id=asset.library_item_version_id
        left join catalog.library_items library_item on library_item.id=library_version.library_item_id
        left join orchestration.activity_asset_progress asset_progress on asset_progress.content_asset_id=asset.id and asset_progress.step_instance_id=v_step_instance_id
        where asset.activity_version_id=version.id
      ),'[]'::jsonb),
      'content_progress',jsonb_build_object(
        'completed_parts',coalesce((v_state->'s'->>'accepted_sections')::integer,0)+(select count(*) from catalog.content_assets asset left join orchestration.activity_asset_progress ap on ap.content_asset_id=asset.id and ap.step_instance_id=v_step_instance_id where asset.activity_version_id=version.id and ap.completed_at is not null),
        'total_parts',jsonb_array_length(coalesce(version.configuration->'content_sections','[]'::jsonb))+(select count(*) from catalog.content_assets asset where asset.activity_version_id=version.id),
        'required_assets_completed',(select count(*) from catalog.content_assets asset left join orchestration.activity_asset_progress ap on ap.content_asset_id=asset.id and ap.step_instance_id=v_step_instance_id where asset.activity_version_id=version.id and asset.is_required and ap.completed_at is not null),
        'required_assets_total',(select count(*) from catalog.content_assets asset where asset.activity_version_id=version.id and asset.is_required)
      )
    ) into v_activity
    from catalog.activity_versions version
    where version.id=v_activity_version_id and version.status='published';

    select jsonb_build_object(
      'passing_score',spec.passing_score,
      'max_attempts',spec.max_attempts,
      'questions',coalesce((
        select jsonb_agg(jsonb_build_object(
          'id',question.id,
          'code',question.code,
          'prompt',question.prompt,
          'question_type',question.question_type,
          'position',question.position,
          'options',coalesce((select jsonb_agg(jsonb_build_object('id',option.id,'code',option.code,'label',option.label,'position',option.position) order by option.position) from assessment.answer_options option where option.question_id=question.id),'[]'::jsonb),
          'response',(select jsonb_build_object(
            'option_code',response.response_value->>'option_code',
            'answer_text',response.response_value->>'answer_text',
            'selected_codes',coalesce(response.response_value->'selected_codes','[]'::jsonb),
            'question_type',response.response_value->>'question_type'
          ) from assessment.responses response where response.attempt_id=nullif(v_state->'q'->>'attempt_id','')::uuid and response.question_id=question.id limit 1)
        ) order by question.position)
        from assessment.questions question where question.activity_version_id=v_activity_version_id
      ),'[]'::jsonb)
    ) into v_assessment
    from assessment.assessment_specs spec
    where spec.activity_version_id=v_activity_version_id;
  end if;

  return jsonb_build_object('state',v_state,'journey',v_journey,'diagnostic',v_diagnostic,'activity',v_activity,'assessment',v_assessment);
end;
$function$;

revoke execute on function public.e14_get_participant_experience(uuid,uuid) from public,anon,authenticated;
grant execute on function public.e14_get_participant_experience(uuid,uuid) to service_role;
