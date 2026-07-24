create or replace function app_private.e14_archetype_c(
  p_session_id uuid,
  p_diagnostic_version_id uuid,
  p_organization_id uuid,
  p_entrepreneur_id uuid,
  p_journey_instance_id uuid
) returns jsonb
language plpgsql
security definer
set search_path=pg_catalog
as $$
declare
  v_scores jsonb;
  v_rules jsonb;
  v_default text;
  v_rule jsonb;
  v_code text;
  v_ok boolean;
  v_dimension text;
  v_min numeric;
  v_definition_id uuid;
  v_version_id uuid;
  v_name text;
  v_assignment_id uuid;
begin
  select dv.configuration->'classification_rules'->'rules', dv.configuration->'classification_rules'->>'default_archetype_code'
    into v_rules, v_default
    from diagnostics.diagnostic_versions dv where dv.id = p_diagnostic_version_id;
  if v_default is null then return null; end if;
  v_scores := app_private.e14_dimension_scores_c(p_session_id);

  v_code := null;
  for v_rule in select value from jsonb_array_elements(coalesce(v_rules,'[]'::jsonb)) order by (value->>'priority')::integer asc loop
    v_ok := true;
    for v_dimension, v_min in select key, value::numeric from jsonb_each_text(v_rule->'thresholds') loop
      if coalesce((v_scores->>v_dimension)::numeric, 0) < v_min then v_ok := false; end if;
    end loop;
    if v_ok then v_code := v_rule->>'archetype_code'; exit; end if;
  end loop;
  if v_code is null then v_code := v_default; end if;

  select ad.id, av.id, ad.name into v_definition_id, v_version_id, v_name
    from diagnostics.archetype_definitions ad
    join diagnostics.archetype_versions av on av.archetype_definition_id = ad.id and av.status = 'published'
   where ad.owner_organization_id = p_organization_id and ad.code = v_code
   order by av.version_number desc limit 1;
  if v_version_id is null then raise exception 'ARCHETYPE_VERSION_NOT_PUBLISHED' using errcode = 'P0002'; end if;

  v_assignment_id := app_private.e14_deterministic_uuid('e14:archetype-assignment|'||p_session_id::text);
  insert into diagnostics.archetype_assignments(id, entrepreneur_id, journey_instance_id, model_version_reference, primary_archetype_version_id, classification_status, assigned_at)
  values (v_assignment_id, p_entrepreneur_id, p_journey_instance_id, p_diagnostic_version_id::text, v_version_id, 'classified', now())
  on conflict (id) do nothing;

  return jsonb_build_object('archetype_code', v_code, 'archetype_name', v_name, 'archetype_version_id', v_version_id);
end;$$;
revoke all on function app_private.e14_archetype_c(uuid,uuid,uuid,uuid,uuid) from public,anon,authenticated;
