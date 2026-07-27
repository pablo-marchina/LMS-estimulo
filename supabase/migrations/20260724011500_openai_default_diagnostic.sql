-- The published OpenAI journey predates the official archetype diagnostic and is immutable.
-- This participant-facing read preserves the published journey while supplying the current
-- official diagnostic when the journey has no explicit diagnostic_version_id.

create or replace function public.get_participant_experience_with_default_diagnostic(
  p_actor_user_account_id uuid,
  p_journey_instance_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_base jsonb;
  v_journey_code text;
  v_diagnostic_version_id uuid;
  v_session_id uuid;
  v_diagnostic jsonb;
begin
  v_base := public.e14_get_participant_experience(
    p_actor_user_account_id,
    p_journey_instance_id
  );

  if coalesce(jsonb_typeof(v_base->'diagnostic'),'null') <> 'null' then
    return v_base;
  end if;

  select definition.code
  into v_journey_code
  from catalog.journey_versions version
  join catalog.journey_definitions definition
    on definition.id=version.journey_definition_id
  where version.id=(v_base->'state'->>'journey_version_id')::uuid;

  if v_journey_code <> 'capacitacao_ia_mei_openai' then
    return v_base;
  end if;

  select version.id
  into v_diagnostic_version_id
  from diagnostics.diagnostic_versions version
  join diagnostics.diagnostic_definitions definition
    on definition.id=version.diagnostic_definition_id
  where definition.code='entrepreneur_archetype_diagnostic'
    and version.status='published'
    and version.published_at is not null
  order by version.version_number desc,version.published_at desc
  limit 1;

  if v_diagnostic_version_id is null then
    return v_base;
  end if;

  v_session_id := nullif(v_base->'state'->'d'->>'session_id','')::uuid;

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
            'id',option.id,
            'code',option.code,
            'label',option.label,
            'position',option.position
          ) order by option.position)
          from diagnostics.item_options option
          where option.item_id=item.id
        ),'[]'::jsonb),
        'response',(
          select jsonb_build_object(
            'revision',response.revision,
            'option_code',response.response_value->>'option_code'
          )
          from diagnostics.responses response
          where response.session_id=v_session_id
            and response.item_id=item.id
          order by response.revision desc
          limit 1
        )
      ) order by item.position)
      from diagnostics.items item
      where item.diagnostic_version_id=version.id
    ),'[]'::jsonb)
  )
  into v_diagnostic
  from diagnostics.diagnostic_versions version
  where version.id=v_diagnostic_version_id;

  return jsonb_set(v_base,'{diagnostic}',v_diagnostic,true);
end;
$function$;

revoke all on function public.get_participant_experience_with_default_diagnostic(uuid,uuid)
  from public,anon,authenticated;
grant execute on function public.get_participant_experience_with_default_diagnostic(uuid,uuid)
  to service_role;
