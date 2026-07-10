-- Canonical reconstruction of the E14 runtime migration range.
-- Generated deterministically from the Supabase migration history export.
-- This file is documentation/replay evidence; executable history remains
-- represented by the timestamped files under supabase/migrations.

-- BEGIN 20260709183504_m14_step5_application_read_surfaces
-- Remote SQL SHA-256: 464263feab785f9ae35d95ad89c215e9794f473e89f5d7d36a0f1c371d1c328d
-- E14.1 Step 5: application identity bridge and read surfaces.
-- Server-only. No credit score, archetype or risk inference is produced.

create or replace function public.e14_resolve_identity(
  p_provider text,
  p_issuer text,
  p_subject text,
  p_email_normalized text,
  p_email_verified boolean,
  p_claims_fingerprint text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_user_account_id uuid;
  v_entrepreneur_id uuid;
  v_organizations jsonb;
begin
  v_user_account_id := iam.resolve_external_identity(
    p_provider,
    p_issuer,
    p_subject,
    p_email_normalized,
    p_email_verified,
    p_claims_fingerprint
  );
  v_entrepreneur_id := app_private.e14_entrepreneur_for_account(v_user_account_id);

  select coalesce(jsonb_agg(org_context order by org_context->>'display_name'), '[]'::jsonb)
    into v_organizations
  from (
    select jsonb_build_object(
      'organization_id', o.id,
      'display_name', o.display_name,
      'roles', coalesce((
        select jsonb_agg(distinct rd.code order by rd.code)
        from iam.membership_roles mr
        join iam.role_definitions rd on rd.id = mr.role_id and rd.status = 'active'
        where mr.membership_id = om.id
          and mr.valid_from <= now()
          and (mr.valid_until is null or mr.valid_until > now())
      ), '[]'::jsonb),
      'permissions', coalesce((
        select jsonb_agg(distinct pd.code order by pd.code)
        from iam.membership_roles mr
        join iam.role_definitions rd on rd.id = mr.role_id and rd.status = 'active'
        join iam.role_permissions rp on rp.role_id = rd.id
        join iam.permission_definitions pd on pd.id = rp.permission_id
        where mr.membership_id = om.id
          and mr.valid_from <= now()
          and (mr.valid_until is null or mr.valid_until > now())
      ), '[]'::jsonb)
    ) as org_context
    from iam.organization_memberships om
    join iam.organizations o on o.id = om.organization_id and o.status = 'active'
    where om.user_account_id = v_user_account_id
      and om.status = 'active'
      and om.valid_from <= now()
      and (om.valid_until is null or om.valid_until > now())
  ) x;

  return jsonb_build_object(
    'user_account_id', v_user_account_id,
    'entrepreneur_id', v_entrepreneur_id,
    'organizations', v_organizations
  );
end;
$$;

create or replace function public.e14_list_participant_journeys(p_actor_user_account_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  v_entrepreneur_id uuid;
  v_journeys jsonb;
begin
  v_entrepreneur_id := app_private.e14_entrepreneur_for_account(p_actor_user_account_id);
  if v_entrepreneur_id is null then
    return jsonb_build_object(
      'actor_user_account_id', p_actor_user_account_id,
      'entrepreneur_id', null,
      'journeys', '[]'::jsonb
    );
  end if;

  select coalesce(jsonb_agg(
    app_private.e14_state_all(ji.id) || jsonb_build_object(
      'journey_title', jv.title,
      'journey_description', jv.description,
      'journey_slug', jd.slug
    ) order by ji.updated_at desc
  ), '[]'::jsonb)
  into v_journeys
  from orchestration.journey_instances ji
  join orchestration.enrollments en on en.id = ji.enrollment_id
  join catalog.journey_versions jv on jv.id = en.journey_version_id
  join catalog.journey_definitions jd on jd.id = jv.journey_definition_id
  where en.entrepreneur_id = v_entrepreneur_id;

  return jsonb_build_object(
    'actor_user_account_id', p_actor_user_account_id,
    'entrepreneur_id', v_entrepreneur_id,
    'journeys', v_journeys
  );
end;
$$;

create or replace function public.e14_get_participant_experience(
  p_actor_user_account_id uuid,
  p_journey_instance_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
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
  v_state := app_private.e14_q1(p_actor_user_account_id, p_journey_instance_id);
  v_journey_version_id := (v_state->>'journey_version_id')::uuid;
  v_activity_version_id := nullif(v_state->'s'->>'version_id', '')::uuid;

  select (jv.configuration->>'diagnostic_version_id')::uuid,
         jsonb_build_object('title', jv.title, 'description', jv.description, 'purpose', jd.purpose)
    into v_diagnostic_version_id, v_journey
  from catalog.journey_versions jv
  join catalog.journey_definitions jd on jd.id = jv.journey_definition_id
  where jv.id = v_journey_version_id;

  if v_diagnostic_version_id is not null then
    select jsonb_build_object(
      'version_id', dv.id,
      'items', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', i.id,
          'code', i.code,
          'prompt', i.prompt,
          'item_type', i.item_type,
          'position', i.position,
          'is_required', i.is_required,
          'options', coalesce((
            select jsonb_agg(jsonb_build_object(
              'id', io.id,
              'code', io.code,
              'label', io.label,
              'position', io.position
            ) order by io.position)
            from diagnostics.item_options io
            where io.item_id = i.id
          ), '[]'::jsonb),
          'response', (
            select jsonb_build_object(
              'revision', r.revision,
              'option_code', r.response_value->>'option_code'
            )
            from diagnostics.responses r
            where r.session_id = nullif(v_state->'d'->>'session_id', '')::uuid
              and r.item_id = i.id
            order by r.revision desc
            limit 1
          )
        ) order by i.position)
        from diagnostics.items i
        where i.diagnostic_version_id = dv.id
      ), '[]'::jsonb)
    ) into v_diagnostic
    from diagnostics.diagnostic_versions dv
    where dv.id = v_diagnostic_version_id and dv.status = 'published';
  end if;

  if v_activity_version_id is not null then
    select jsonb_build_object(
      'version_id', av.id,
      'title', av.title,
      'description', av.description,
      'estimated_minutes', av.estimated_minutes,
      'sections', coalesce(av.configuration->'content_sections', '[]'::jsonb)
    ) into v_activity
    from catalog.activity_versions av
    where av.id = v_activity_version_id and av.status = 'published';

    select jsonb_build_object(
      'passing_score', spec.passing_score,
      'max_attempts', spec.max_attempts,
      'questions', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', q.id,
          'code', q.code,
          'prompt', q.prompt,
          'question_type', q.question_type,
          'position', q.position,
          'options', coalesce((
            select jsonb_agg(jsonb_build_object(
              'id', ao.id,
              'code', ao.code,
              'label', ao.label,
              'position', ao.position
            ) order by ao.position)
            from assessment.answer_options ao
            where ao.question_id = q.id
          ), '[]'::jsonb),
          'response', (
            select jsonb_build_object('option_code', r.response_value->>'option_code')
            from assessment.responses r
            where r.attempt_id = nullif(v_state->'q'->>'attempt_id', '')::uuid
              and r.question_id = q.id
            limit 1
          )
        ) order by q.position)
        from assessment.questions q
        where q.activity_version_id = v_activity_version_id
      ), '[]'::jsonb)
    ) into v_assessment
    from assessment.assessment_specs spec
    where spec.activity_version_id = v_activity_version_id;
  end if;

  return jsonb_build_object(
    'state', v_state,
    'journey', v_journey,
    'diagnostic', v_diagnostic,
    'activity', v_activity,
    'assessment', v_assessment
  );
end;
$$;

create or replace function public.e14_list_operator_instances(
  p_actor_user_account_id uuid,
  p_organization_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  v_instances jsonb;
begin
  if not app_private.e14_actor_has_permission(
    p_actor_user_account_id,
    p_organization_id,
    'journey.execution.read'
  ) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(
    app_private.e14_state_all(x.journey_instance_id) || jsonb_build_object(
      'journey_title', x.journey_title,
      'journey_description', x.journey_description,
      'journey_slug', x.journey_slug
    ) order by x.updated_at desc
  ), '[]'::jsonb)
  into v_instances
  from (
    select ji.id as journey_instance_id, ji.updated_at, jv.title as journey_title,
           jv.description as journey_description, jd.slug as journey_slug
    from orchestration.journey_instances ji
    join orchestration.enrollments en on en.id = ji.enrollment_id
    join catalog.journey_versions jv on jv.id = en.journey_version_id
    join catalog.journey_definitions jd on jd.id = jv.journey_definition_id
    where jd.owner_organization_id = p_organization_id
    order by ji.updated_at desc
    limit 100
  ) x;

  return jsonb_build_object('organization_id', p_organization_id, 'instances', v_instances);
end;
$$;

revoke all on function public.e14_resolve_identity(text,text,text,text,boolean,text) from public, anon, authenticated;
revoke all on function public.e14_list_participant_journeys(uuid) from public, anon, authenticated;
revoke all on function public.e14_get_participant_experience(uuid,uuid) from public, anon, authenticated;
revoke all on function public.e14_list_operator_instances(uuid,uuid) from public, anon, authenticated;

grant execute on function public.e14_resolve_identity(text,text,text,text,boolean,text) to service_role, app_worker;
grant execute on function public.e14_list_participant_journeys(uuid) to service_role, app_worker;
grant execute on function public.e14_get_participant_experience(uuid,uuid) to service_role, app_worker;
grant execute on function public.e14_list_operator_instances(uuid,uuid) to service_role, app_worker;
-- END 20260709183504_m14_step5_application_read_surfaces

-- BEGIN 20260709184749_m14b_step5_operator_workspace
-- Remote SQL SHA-256: 9b4b9b387778ee174c01aaf700d638e6df157065a167c585624e8a1ad3e1fe69
create or replace function public.e14_get_operator_workspace(
  p_actor_user_account_id uuid,
  p_organization_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  v_versions jsonb;
  v_participants jsonb;
begin
  if not app_private.e14_actor_has_permission(
    p_actor_user_account_id,
    p_organization_id,
    'journey.execution.manage'
  ) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'journey_version_id', jv.id,
    'journey_definition_id', jd.id,
    'journey_code', jd.code,
    'title', jv.title,
    'version_number', jv.version_number,
    'status', jv.status,
    'content_hash', jv.content_hash,
    'published_at', jv.published_at
  ) order by jv.created_at desc), '[]'::jsonb)
  into v_versions
  from catalog.journey_versions jv
  join catalog.journey_definitions jd on jd.id = jv.journey_definition_id
  where jd.owner_organization_id = p_organization_id
    and jd.status = 'active';

  select coalesce(jsonb_agg(jsonb_build_object(
    'entrepreneur_id', e.id,
    'display_name', coalesce(e.preferred_name, e.legal_name, e.email_normalized),
    'email', e.email_normalized
  ) order by coalesce(e.preferred_name, e.legal_name, e.email_normalized)), '[]'::jsonb)
  into v_participants
  from core.entrepreneurs e
  where e.status = 'active'
    and e.profile_data->>'synthetic' = 'true'
    and e.profile_data->>'owner_organization_id' = p_organization_id::text;

  return jsonb_build_object(
    'organization_id', p_organization_id,
    'journey_versions', v_versions,
    'participants', v_participants
  );
end;
$$;

revoke all on function public.e14_get_operator_workspace(uuid,uuid) from public, anon, authenticated;
grant execute on function public.e14_get_operator_workspace(uuid,uuid) to service_role, app_worker;
-- END 20260709184749_m14b_step5_operator_workspace
