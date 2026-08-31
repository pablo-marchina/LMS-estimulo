-- Fix participant diagnostic classification semantics.
--
-- The admin configures decimal score limits per archetype/dimension. Those limits
-- are score-band upper bounds (for example 1.0-1.9), while the runtime previously
-- compared raw dimension totals as minimum thresholds and stopped at visual
-- priority order. That made low scores match broader profiles incorrectly.
--
-- Keep the persisted configuration shape backwards-compatible, but align runtime
-- semantics with the admin/business contract:
--   1. dimension scores are averages on the same scale as each answer score;
--   2. rule thresholds are inclusive upper bounds;
--   3. narrower/lower bands are evaluated before broader/higher bands;
--   4. configured priority is only a deterministic tie-breaker.

create or replace function app_private.e14_dimension_scores_c(
  p_session_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog
as $$
  with latest_responses as (
    select distinct on (response.item_id)
      response.item_id,
      response.response_value
    from diagnostics.responses response
    where response.session_id = p_session_id
    order by response.item_id, response.revision desc
  ), dimension_scores as (
    select
      dimension.code,
      round(avg((latest_response.response_value ->> 'score')::numeric), 4) as score
    from latest_responses latest_response
    join diagnostics.items item on item.id = latest_response.item_id
    join diagnostics.dimensions dimension on dimension.id = item.dimension_id
    where latest_response.response_value ? 'score'
      and nullif(latest_response.response_value ->> 'score', '') is not null
    group by dimension.code
  )
  select coalesce(
    jsonb_object_agg(dimension_scores.code, dimension_scores.score),
    '{}'::jsonb
  )
  from dimension_scores;
$$;

revoke all on function app_private.e14_dimension_scores_c(uuid)
  from public, anon, authenticated;
grant execute on function app_private.e14_dimension_scores_c(uuid)
  to postgres, service_role, app_worker;

comment on function app_private.e14_dimension_scores_c(uuid) is
  'Returns latest diagnostic average score by dimension on the configured answer-score scale.';

create or replace function app_private.e14_archetype_c(
  p_session_id uuid,
  p_diagnostic_version_id uuid,
  p_organization_id uuid,
  p_entrepreneur_id uuid,
  p_journey_instance_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_scores jsonb;
  v_rules jsonb;
  v_default text;
  v_rule jsonb;
  v_code text;
  v_ok boolean;
  v_dimension text;
  v_max numeric;
  v_definition_id uuid;
  v_version_id uuid;
  v_name text;
  v_assignment_id uuid;
begin
  select
    diagnostic_version.configuration -> 'classification_rules' -> 'rules',
    diagnostic_version.configuration -> 'classification_rules' ->> 'default_archetype_code'
  into v_rules, v_default
  from diagnostics.diagnostic_versions diagnostic_version
  where diagnostic_version.id = p_diagnostic_version_id;

  if v_default is null then
    return null;
  end if;

  v_scores := app_private.e14_dimension_scores_c(p_session_id);
  v_code := null;

  for v_rule in
    select rule_entry.value
    from jsonb_array_elements(coalesce(v_rules, '[]'::jsonb)) as rule_entry(value)
    where jsonb_typeof(rule_entry.value -> 'thresholds') = 'object'
      and exists (
        select 1
        from jsonb_object_keys(rule_entry.value -> 'thresholds') as threshold_key
      )
    order by
      (
        select max(threshold_entry.value::numeric)
        from jsonb_each_text(rule_entry.value -> 'thresholds') as threshold_entry(key, value)
      ) asc nulls last,
      coalesce((rule_entry.value ->> 'priority')::integer, 2147483647) asc
  loop
    v_ok := true;

    for v_dimension, v_max in
      select threshold_entry.key, threshold_entry.value::numeric
      from jsonb_each_text(v_rule -> 'thresholds') as threshold_entry(key, value)
    loop
      if not (v_scores ? v_dimension)
        or (v_scores ->> v_dimension)::numeric > v_max then
        v_ok := false;
        exit;
      end if;
    end loop;

    if v_ok then
      v_code := v_rule ->> 'archetype_code';
      exit;
    end if;
  end loop;

  if v_code is null then
    v_code := v_default;
  end if;

  select archetype_definition.id, archetype_version.id, archetype_definition.name
  into v_definition_id, v_version_id, v_name
  from diagnostics.archetype_definitions archetype_definition
  join diagnostics.archetype_versions archetype_version
    on archetype_version.archetype_definition_id = archetype_definition.id
   and archetype_version.status = 'published'
  where archetype_definition.owner_organization_id = p_organization_id
    and archetype_definition.code = v_code
  order by archetype_version.version_number desc
  limit 1;

  if v_version_id is null then
    raise exception 'ARCHETYPE_VERSION_NOT_PUBLISHED' using errcode = 'P0002';
  end if;

  v_assignment_id := app_private.e14_deterministic_uuid(
    'e14:archetype-assignment|' || p_session_id::text
  );

  insert into diagnostics.archetype_assignments(
    id,
    entrepreneur_id,
    journey_instance_id,
    model_version_reference,
    primary_archetype_version_id,
    classification_status,
    assigned_at
  )
  values (
    v_assignment_id,
    p_entrepreneur_id,
    p_journey_instance_id,
    p_diagnostic_version_id::text,
    v_version_id,
    'classified',
    now()
  )
  on conflict (id) do nothing;

  return jsonb_build_object(
    'archetype_code', v_code,
    'archetype_name', v_name,
    'archetype_version_id', v_version_id
  );
end;
$$;

revoke all on function app_private.e14_archetype_c(uuid, uuid, uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function app_private.e14_archetype_c(uuid, uuid, uuid, uuid, uuid)
  to postgres, service_role, app_worker;

comment on function app_private.e14_archetype_c(uuid, uuid, uuid, uuid, uuid) is
  'Classifies diagnostic averages into inclusive upper-bound archetype score bands, independent of visual profile order.';
