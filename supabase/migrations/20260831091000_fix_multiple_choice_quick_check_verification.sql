-- Fix quick-check verification for multiple-choice questions without changing
-- the frozen public RPC surface or adding a new opaque helper.
--
-- The participant form serializes a multiple-choice answer as comma-separated
-- option codes. The existing e14_context_g helper validates d as one option
-- code, so a valid answer such as "a,c" is rejected. Replace that helper
-- semantically: preserve the original path for every other question type and
-- validate multiple-choice answers as an exact set of option codes.

create or replace function app_private.e14_context_g(a uuid,b uuid,c uuid,d text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare
  x app_private.e14_attempt_context%rowtype;
  o uuid;
  v jsonb;
  ok boolean;
  v_question_type text;
  v_selected_codes text[];
  v_selected_count integer;
  v_invalid_count integer;
  v_correct_count integer;
  v_matching_correct_count integer;
begin
  select * into x from app_private.e14_attempt_context where attempt_id=b;
  if not found then raise exception 'RESOURCE_NOT_FOUND' using errcode='P0002'; end if;
  if app_private.e14_entrepreneur_for_account(a) is distinct from x.entrepreneur_id then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if x.attempt_status<>'in_progress' then raise exception 'ATTEMPT_NOT_IN_PROGRESS' using errcode='P0001'; end if;

  select q.question_type
    into v_question_type
    from assessment.questions q
   where q.id=c
     and q.activity_version_id=x.activity_version_id;

  if not found then
    raise exception 'RESOURCE_NOT_FOUND' using errcode='P0002';
  end if;

  if v_question_type <> 'multiple_choice' then
    select ao.id,ao.value,ao.is_correct
      into o,v,ok
      from assessment.answer_options ao
      join assessment.questions q on q.id=ao.question_id
     where ao.question_id=c
       and ao.code=d
       and q.activity_version_id=x.activity_version_id;

    if not found then raise exception 'INVALID_ASSESSMENT_OPTION' using errcode='22023'; end if;

    return jsonb_build_object(
      'person',x.entrepreneur_id,
      'step',x.step_instance_id,
      'version',x.activity_version_id,
      'instance',x.instance_id,
      'org',x.org_id,
      'attempt_version',x.attempt_version,
      'option_id',o,
      'option_value',v,
      'correct',ok
    );
  end if;

  select coalesce(array_agg(code order by code), array[]::text[])
    into v_selected_codes
    from (
      select distinct btrim(code) as code
        from unnest(string_to_array(coalesce(d, ''), ',')) as selected(code)
       where btrim(code) <> ''
    ) normalized;

  v_selected_count := coalesce(array_length(v_selected_codes, 1), 0);
  if v_selected_count = 0 then
    raise exception 'ASSESSMENT_ANSWER_REQUIRED' using errcode='22023';
  end if;

  select count(*)::integer
    into v_invalid_count
    from unnest(v_selected_codes) selected(code)
    left join assessment.answer_options ao
      on ao.question_id=c
     and ao.code=selected.code
   where ao.id is null;

  if v_invalid_count > 0 then
    raise exception 'INVALID_ASSESSMENT_OPTION' using errcode='22023';
  end if;

  select
    count(*) filter (where coalesce(ao.is_correct,false))::integer,
    count(*) filter (
      where coalesce(ao.is_correct,false)
        and ao.code=any(v_selected_codes)
    )::integer
    into v_correct_count,v_matching_correct_count
    from assessment.answer_options ao
   where ao.question_id=c;

  ok := v_correct_count > 0
    and v_selected_count = v_correct_count
    and v_matching_correct_count = v_correct_count;

  return jsonb_build_object(
    'person',x.entrepreneur_id,
    'step',x.step_instance_id,
    'version',x.activity_version_id,
    'instance',x.instance_id,
    'org',x.org_id,
    'attempt_version',x.attempt_version,
    'option_id',null,
    'option_value',to_jsonb(v_selected_codes),
    'selected_codes',to_jsonb(v_selected_codes),
    'correct',ok
  );
end;$$;
