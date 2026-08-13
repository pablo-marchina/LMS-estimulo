create or replace function public.patch_admin_lesson(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_payload jsonb,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_step_id uuid := nullif(p_payload->>'step_id', '')::uuid;
  v_base jsonb;
  v_merged jsonb;
begin
  if jsonb_typeof(p_payload) <> 'object' then
    raise exception 'LESSON_PATCH_INVALID' using errcode = '22023';
  end if;

  if v_step_id is null then
    raise exception 'LESSON_STEP_REQUIRED' using errcode = '22023';
  end if;

  select jsonb_build_object(
    'path_template_id', ps.path_template_id,
    'step_id', ps.id,
    'step_code', ps.code,
    'activity_definition_code', ad.code,
    'title', av.title,
    'description', av.description,
    'activity_type', case when av.activity_type = 'practice' then 'practice' else 'content' end,
    'estimated_minutes', av.estimated_minutes,
    'configuration', coalesce(av.configuration, '{}'::jsonb) - '_editor',
    'position', ps.position_hint,
    'is_required', ps.is_required,
    'metadata', coalesce(ps.metadata, '{}'::jsonb),
    'content_source', 'current',
    'library_item_version_id', null,
    'content_required', coalesce((select ca.is_required from catalog.content_assets ca where ca.activity_version_id = av.id order by ca.position, ca.id limit 1), false),
    'assessment', case when spec.activity_version_id is null then null else jsonb_build_object(
      'passing_score', spec.passing_score,
      'max_attempts', spec.max_attempts,
      'questions', coalesce((select jsonb_agg(jsonb_build_object(
        'code', q.code,
        'question_type', q.question_type,
        'prompt', q.prompt,
        'points', q.points,
        'position', q.position,
        'configuration', coalesce(q.configuration, '{}'::jsonb),
        'options', coalesce((select jsonb_agg(jsonb_build_object('code', ao.code, 'label', ao.label, 'value', coalesce(ao.value, '{}'::jsonb), 'is_correct', ao.is_correct, 'position', ao.position) order by ao.position, ao.id) from assessment.answer_options ao where ao.question_id = q.id), '[]'::jsonb)
      ) order by q.position, q.id) from assessment.questions q where q.activity_version_id = av.id), '[]'::jsonb)
    ) end,
    'practice', case when practice.activity_version_id is null then null else jsonb_build_object(
      'submission_mode', practice.submission_mode,
      'allowed_evidence_types', to_jsonb(practice.allowed_evidence_types),
      'max_submissions', practice.max_submissions,
      'review_required', practice.review_required,
      'terms_version', practice.terms_version
    ) end
  ) into v_base
  from orchestration.path_steps ps
  join orchestration.path_templates pt on pt.id = ps.path_template_id
  join catalog.journey_versions jv on jv.id = pt.journey_version_id
  join catalog.journey_definitions jd on jd.id = jv.journey_definition_id
  join catalog.activity_versions av on av.id = ps.activity_version_id
  join catalog.activity_definitions ad on ad.id = av.activity_definition_id
  left join assessment.assessment_specs spec on spec.activity_version_id = av.id
  left join assessment.practice_specs practice on practice.activity_version_id = av.id
  where ps.id = v_step_id
    and jd.owner_organization_id = p_organization_id
    and ad.owner_organization_id = p_organization_id
  for update of ps, pt, jv, av, ad;

  if v_base is null then
    raise exception 'LESSON_NOT_FOUND' using errcode = 'P0002';
  end if;

  v_merged := v_base || (p_payload - 'step_id' - 'path_template_id');
  v_merged := v_merged || jsonb_build_object('step_id', v_base->'step_id', 'path_template_id', v_base->'path_template_id');

  return public.save_admin_lesson(p_actor_user_account_id, p_organization_id, v_merged, p_idempotency_key);
end;
$function$;

revoke all on function public.patch_admin_lesson(uuid, uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.patch_admin_lesson(uuid, uuid, jsonb, text) to service_role;
