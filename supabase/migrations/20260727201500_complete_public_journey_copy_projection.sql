set lock_timeout = '5s';
set statement_timeout = '5min';

create or replace function public.e14_get_participant_experience(
  p_actor_user_account_id uuid,
  p_journey_instance_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog'
as $$
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
    jsonb_build_object(
      'title',coalesce(nullif(definition.name,''),version.title),
      'description',coalesce(definition.purpose,version.description),
      'purpose',definition.purpose,
      'presentation',coalesce(version.configuration->'presentation','{}'::jsonb)
    )
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
$$;

create or replace function public.get_library_content(
  p_actor_user_account_id uuid,
  p_slug text
) returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog'
as $$
declare
  v_result jsonb;
  v_entrepreneur_id uuid;
begin
  if not app_private.library_actor_is_active(p_actor_user_account_id) then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  v_entrepreneur_id:=app_private.e14_entrepreneur_for_account(p_actor_user_account_id);

  select jsonb_build_object(
    'library_item_id',item.id,
    'library_item_version_id',version.id,
    'slug',item.slug,
    'version_number',version.version_number,
    'title',version.title,
    'summary',version.summary,
    'body',version.body,
    'content_kind',version.content_kind,
    'content_format',version.content_format,
    'level',version.level,
    'estimated_minutes',version.estimated_minutes,
    'source_type',version.source_type,
    'source_name',version.source_name,
    'external_url',version.external_url,
    'language_code',version.language_code,
    'topics',version.topics,
    'visibility',version.visibility,
    'accessibility_metadata',version.accessibility_metadata,
    'published_at',version.published_at,
    'has_external_link',version.external_url is not null,
    'has_file',version.file_object_id is not null,
    'file_object_id',version.file_object_id,
    'original_filename',file.original_filename,
    'file_content_type',file.content_type,
    'journeys',coalesce((
      select jsonb_agg(jsonb_build_object(
        'journey_version_id',link.journey_version_id,
        'relation_type',link.relation_type,
        'journey_title',coalesce(nullif(definition.name,''),journey_version.title)
      ) order by coalesce(nullif(definition.name,''),journey_version.title))
      from catalog.library_item_journey_links link
      join catalog.journey_versions journey_version on journey_version.id=link.journey_version_id
      join catalog.journey_definitions definition on definition.id=journey_version.journey_definition_id
      where link.library_item_version_id=version.id
    ),'[]'::jsonb)
  ) into v_result
  from catalog.library_items item
  join catalog.library_item_versions version on version.library_item_id=item.id
  left join core.file_objects file on file.id=version.file_object_id
  where item.slug=trim(lower(p_slug))
    and item.status='active'
    and version.status='published'
    and app_private.library_actor_can_view(p_actor_user_account_id,item.owner_organization_id,version.visibility)
    and (
      version.discoverable_in_library
      or exists(
        select 1
        from catalog.library_item_journey_links link
        join orchestration.enrollments enrollment on enrollment.journey_version_id=link.journey_version_id
        where link.library_item_version_id=version.id
          and enrollment.entrepreneur_id=v_entrepreneur_id
          and enrollment.status in ('assigned','active','paused','completed')
      )
    )
  order by version.version_number desc
  limit 1;

  if v_result is null then
    raise exception 'LIBRARY_CONTENT_NOT_FOUND' using errcode='P0002';
  end if;
  return v_result;
end;
$$;

create or replace function public.list_participant_credentials(p_actor_user_account_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog'
as $$
declare
  v_entrepreneur_id uuid;
  v_badges jsonb;
  v_certificates jsonb;
begin
  v_entrepreneur_id:=app_private.e14_entrepreneur_for_account(p_actor_user_account_id);
  if v_entrepreneur_id is null then
    return jsonb_build_object('entrepreneur_id',null,'badges','[]'::jsonb,'certificates','[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'award_id',award.id,
    'journey_instance_id',award.journey_instance_id,
    'badge_version_id',award.badge_version_id,
    'title',badge_version.title,
    'description',badge_version.description,
    'journey_title',coalesce(nullif(definition.name,''),journey_version.title),
    'awarded_at',award.awarded_at,
    'revoked_at',award.revoked_at,
    'revocation_reason',award.revocation_reason,
    'status',case when award.revoked_at is null then 'active' else 'revoked' end
  ) order by award.awarded_at desc),'[]'::jsonb)
  into v_badges
  from engagement.badge_awards award
  join engagement.badge_versions badge_version on badge_version.id=award.badge_version_id
  join orchestration.journey_instances instance on instance.id=award.journey_instance_id
  join orchestration.enrollments enrollment on enrollment.id=instance.enrollment_id
  join catalog.journey_versions journey_version on journey_version.id=enrollment.journey_version_id
  join catalog.journey_definitions definition on definition.id=journey_version.journey_definition_id
  where award.entrepreneur_id=v_entrepreneur_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'issuance_id',issuance.id,
    'journey_instance_id',issuance.journey_instance_id,
    'certificate_version_id',issuance.certificate_version_id,
    'certificate_name',certificate_definition.name,
    'journey_title',coalesce(nullif(definition.name,''),journey_version.title),
    'verification_code',issuance.verification_code,
    'display_name',issuance.display_name_snapshot,
    'status',issuance.status,
    'issued_at',issuance.issued_at,
    'expires_at',issuance.expires_at,
    'revoked_at',issuance.revoked_at,
    'revocation_reason',issuance.revocation_reason,
    'valid',issuance.status='active' and issuance.revoked_at is null and (issuance.expires_at is null or issuance.expires_at>now())
  ) order by issuance.issued_at desc),'[]'::jsonb)
  into v_certificates
  from engagement.certificate_issuances issuance
  join engagement.certificate_versions certificate_version on certificate_version.id=issuance.certificate_version_id
  join engagement.certificate_definitions certificate_definition on certificate_definition.id=certificate_version.certificate_definition_id
  join orchestration.journey_instances instance on instance.id=issuance.journey_instance_id
  join orchestration.enrollments enrollment on enrollment.id=instance.enrollment_id
  join catalog.journey_versions journey_version on journey_version.id=enrollment.journey_version_id
  join catalog.journey_definitions definition on definition.id=journey_version.journey_definition_id
  where issuance.entrepreneur_id=v_entrepreneur_id;

  return jsonb_build_object('entrepreneur_id',v_entrepreneur_id,'badges',v_badges,'certificates',v_certificates);
end;
$$;
