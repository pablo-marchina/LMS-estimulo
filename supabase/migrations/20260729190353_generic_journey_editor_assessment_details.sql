-- Keep assessment question types and practice settings available to the
-- generic lesson editor. This migration is intentionally idempotent because
-- the final definition is also present in the preceding foundation migration
-- for clean database replays.

create or replace function public.get_admin_journey_editor_details(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_journey_version_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog'
as $function$
begin
  if not (
    app_private.estimulo_staff_can_view(p_actor_user_account_id,p_organization_id)
    or app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'journey.definition.manage')
  ) then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  if not exists (
    select 1 from catalog.journey_versions jv
    join catalog.journey_definitions jd on jd.id=jv.journey_definition_id
    where jv.id=p_journey_version_id and jd.owner_organization_id=p_organization_id
  ) then
    raise exception 'JOURNEY_NOT_FOUND' using errcode='P0002';
  end if;
  return jsonb_build_object(
    'journey_version_id',p_journey_version_id,
    'activities',(
      select coalesce(jsonb_agg(jsonb_build_object(
        'activity_version_id',av.id,
        'activity_definition_id',ad.id,
        'definition_code',ad.code,
        'definition_name',ad.name,
        'version_number',av.version_number,
        'status',av.status,
        'estimated_minutes',av.estimated_minutes,
        'assets',(select coalesce(jsonb_agg(jsonb_build_object(
          'id',ca.id,'asset_type',ca.asset_type,'title',ca.title,
          'external_url',ca.external_url,'file_object_id',ca.file_object_id,
          'library_item_version_id',ca.library_item_version_id,
          'position',ca.position,'is_required',ca.is_required,
          'accessibility_metadata',ca.accessibility_metadata
        ) order by ca.position,ca.id),'[]'::jsonb)
          from catalog.content_assets ca where ca.activity_version_id=av.id),
        'assessment',(select jsonb_build_object(
          'passing_score',spec.passing_score,
          'max_attempts',spec.max_attempts,
          'questions',(select coalesce(jsonb_agg(jsonb_build_object(
            'id',q.id,'code',q.code,'prompt',q.prompt,
            'question_type',q.question_type,'points',q.points,
            'position',q.position,'configuration',q.configuration,
            'options',(select coalesce(jsonb_agg(jsonb_build_object(
              'id',answer.id,'code',answer.code,'label',answer.label,
              'value',answer.value,'is_correct',answer.is_correct,
              'position',answer.position
            ) order by answer.position,answer.id),'[]'::jsonb)
              from assessment.answer_options answer where answer.question_id=q.id)
          ) order by q.position,q.id),'[]'::jsonb)
            from assessment.questions q where q.activity_version_id=av.id)
        ) from assessment.assessment_specs spec where spec.activity_version_id=av.id),
        'practice',(select jsonb_build_object(
          'submission_mode',practice.submission_mode,
          'allowed_evidence_types',practice.allowed_evidence_types,
          'max_submissions',practice.max_submissions,
          'review_required',practice.review_required,
          'terms_version',practice.terms_version
        ) from assessment.practice_specs practice where practice.activity_version_id=av.id)
      ) order by av.id),'[]'::jsonb)
      from (
        select distinct ps.activity_version_id
        from orchestration.path_templates pt
        join orchestration.path_steps ps on ps.path_template_id=pt.id
        where pt.journey_version_id=p_journey_version_id
      ) linked
      join catalog.activity_versions av on av.id=linked.activity_version_id
      join catalog.activity_definitions ad on ad.id=av.activity_definition_id
      where ad.owner_organization_id=p_organization_id
    )
  );
end;
$function$;

revoke all on function public.get_admin_journey_editor_details(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.get_admin_journey_editor_details(uuid,uuid,uuid) to service_role;
