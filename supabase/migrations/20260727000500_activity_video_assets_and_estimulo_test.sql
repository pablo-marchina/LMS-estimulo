-- The official video is seeded only when its target editorial activity exists.
-- Structural replay must remain valid without environment-specific content.
insert into catalog.content_assets(
  id,activity_version_id,file_object_id,asset_type,title,external_url,language_code,
  accessibility_metadata,position,is_required,created_at
)
select
  app_private.e14_deterministic_uuid('official-estimulo-video|3c9c78b7-36d4-4292-9f88-dc5f1206e8e6'),
  activity.id,
  null,
  'video',
  'Mentorias inspiracionais — Estímulo',
  'https://www.youtube.com/playlist?list=PLvMEGAp1Y9tYP1PUHMMYeuq0V0hpm4ScA',
  'pt-BR',
  jsonb_build_object(
    'description','Vídeos oficiais com histórias e aprendizados de empreendedores.',
    'source','Página de Educação do Estímulo',
    'official',true
  ),
  1,
  false,
  now()
from catalog.activity_versions activity
where activity.id='3c9c78b7-36d4-4292-9f88-dc5f1206e8e6'::uuid
on conflict(activity_version_id,position) do update set
  asset_type=excluded.asset_type,
  title=excluded.title,
  external_url=excluded.external_url,
  language_code=excluded.language_code,
  accessibility_metadata=excluded.accessibility_metadata,
  is_required=excluded.is_required;

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
  v_journey jsonb;
  v_diagnostic jsonb;
  v_activity jsonb;
  v_assessment jsonb;
begin
  v_state:=app_private.e14_q1(p_actor_user_account_id,p_journey_instance_id);
  v_journey_version_id:=(v_state->>'journey_version_id')::uuid;
  v_activity_version_id:=nullif(v_state->'s'->>'version_id','')::uuid;

  select (version.configuration->>'diagnostic_version_id')::uuid,
    jsonb_build_object('title',version.title,'description',version.description,'purpose',definition.purpose)
  into v_diagnostic_version_id,v_journey
  from catalog.journey_versions version
  join catalog.journey_definitions definition on definition.id=version.journey_definition_id
  where version.id=v_journey_version_id;

  if v_diagnostic_version_id is not null then
    select jsonb_build_object(
      'version_id',version.id,
      'items',coalesce((
        select jsonb_agg(jsonb_build_object(
          'id',item.id,
          'code',item.code,
          'prompt',item.prompt,
          'item_type',item.item_type,
          'position',item.position,
          'is_required',item.is_required,
          'options',coalesce((
            select jsonb_agg(jsonb_build_object(
              'id',option.id,'code',option.code,'label',option.label,'position',option.position
            ) order by option.position)
            from diagnostics.item_options option where option.item_id=item.id
          ),'[]'::jsonb),
          'response',(
            select jsonb_build_object('revision',response.revision,'option_code',response.response_value->>'option_code')
            from diagnostics.responses response
            where response.session_id=nullif(v_state->'d'->>'session_id','')::uuid and response.item_id=item.id
            order by response.revision desc limit 1
          )
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
      'assets',coalesce((
        select jsonb_agg(jsonb_build_object(
          'id',asset.id,
          'asset_type',asset.asset_type,
          'title',asset.title,
          'external_url',asset.external_url,
          'language_code',asset.language_code,
          'accessibility_metadata',asset.accessibility_metadata,
          'position',asset.position,
          'is_required',asset.is_required
        ) order by asset.position,asset.id)
        from catalog.content_assets asset
        where asset.activity_version_id=version.id
      ),'[]'::jsonb)
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
          'options',coalesce((
            select jsonb_agg(jsonb_build_object(
              'id',option.id,'code',option.code,'label',option.label,'position',option.position
            ) order by option.position)
            from assessment.answer_options option where option.question_id=question.id
          ),'[]'::jsonb),
          'response',(
            select jsonb_build_object('option_code',response.response_value->>'option_code')
            from assessment.responses response
            where response.attempt_id=nullif(v_state->'q'->>'attempt_id','')::uuid and response.question_id=question.id
            limit 1
          )
        ) order by question.position)
        from assessment.questions question where question.activity_version_id=v_activity_version_id
      ),'[]'::jsonb)
    ) into v_assessment
    from assessment.assessment_specs spec
    where spec.activity_version_id=v_activity_version_id;
  end if;

  return jsonb_build_object(
    'state',v_state,
    'journey',v_journey,
    'diagnostic',v_diagnostic,
    'activity',v_activity,
    'assessment',v_assessment
  );
end;
$function$;

revoke execute on function public.e14_get_participant_experience(uuid,uuid) from public,anon,authenticated;
grant execute on function public.e14_get_participant_experience(uuid,uuid) to service_role;
