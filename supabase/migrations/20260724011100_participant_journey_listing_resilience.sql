create or replace function public.e14_list_participant_journeys(
  p_actor_user_account_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_entrepreneur_id uuid;
  v_journeys jsonb := '[]'::jsonb;
  v_state jsonb;
  v_row record;
  v_skipped integer := 0;
begin
  v_entrepreneur_id := app_private.e14_entrepreneur_for_account(p_actor_user_account_id);
  if v_entrepreneur_id is null then
    return jsonb_build_object(
      'actor_user_account_id', p_actor_user_account_id,
      'entrepreneur_id', null,
      'journeys', '[]'::jsonb,
      'skipped_invalid_journeys', 0
    );
  end if;

  for v_row in
    select
      ji.id as journey_instance_id,
      ji.updated_at,
      jv.title,
      jv.description,
      jv.status as version_status,
      jd.slug,
      jd.code
    from orchestration.journey_instances ji
    join orchestration.enrollments en on en.id = ji.enrollment_id
    join catalog.journey_versions jv on jv.id = en.journey_version_id
    join catalog.journey_definitions jd on jd.id = jv.journey_definition_id
    where en.entrepreneur_id = v_entrepreneur_id
      and en.status in ('assigned','active','paused','completed')
      and jv.status in ('published','retired')
      and coalesce(jv.configuration->>'visibility','') <> 'internal_test_only'
      and coalesce((jv.configuration->>'publishable_to_real_participants')::boolean, true)
    order by ji.updated_at desc
  loop
    begin
      v_state := app_private.e14_state_all(v_row.journey_instance_id);
      v_journeys := v_journeys || jsonb_build_array(
        v_state || jsonb_build_object(
          'journey_title', v_row.title,
          'journey_description', v_row.description,
          'journey_slug', v_row.slug
        )
      );
    exception
      when others then
        -- One corrupted or legacy runtime instance must never make every real
        -- participant journey disappear. It remains in the database for
        -- operations/audit while the participant surface skips it.
        v_skipped := v_skipped + 1;
    end;
  end loop;

  return jsonb_build_object(
    'actor_user_account_id', p_actor_user_account_id,
    'entrepreneur_id', v_entrepreneur_id,
    'journeys', v_journeys,
    'skipped_invalid_journeys', v_skipped
  );
end;
$function$;

revoke all on function public.e14_list_participant_journeys(uuid) from public;
grant execute on function public.e14_list_participant_journeys(uuid) to authenticated, service_role;
