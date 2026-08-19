begin;

-- The admin lesson form regenerates positional question/option codes on submit.
-- Those generated codes are not editable assessment content, so they must not
-- force question replacement when an operator changes only passing metadata.
create or replace function app_private.e14_assessment_questions_match_payload(
  p_activity_version_id uuid,
  p_questions jsonb
) returns boolean
language sql
stable
security invoker
set search_path to 'pg_catalog'
as $function$
with db_questions as (
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'prompt', btrim(q.prompt),
      'question_type', q.question_type,
      'position', q.position,
      'options', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'label', btrim(ao.label),
            'is_correct', ao.is_correct,
            'position', ao.position
          ) order by ao.position, ao.id
        )
        from assessment.answer_options ao
        where ao.question_id = q.id
      ), '[]'::jsonb)
    ) order by q.position, q.id
  ), '[]'::jsonb) as value
  from assessment.questions q
  where q.activity_version_id = p_activity_version_id
), payload_questions as (
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'prompt', btrim(item.value->>'prompt'),
      'question_type', coalesce(nullif(item.value->>'question_type', ''), 'single_choice'),
      'position', coalesce(nullif(item.value->>'position', '')::integer, item.ordinality::integer),
      'options', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'label', btrim(opt.value->>'label'),
            'is_correct', coalesce((opt.value->>'is_correct')::boolean, false),
            'position', coalesce(nullif(opt.value->>'position', '')::integer, opt.ordinality::integer)
          ) order by coalesce(nullif(opt.value->>'position', '')::integer, opt.ordinality::integer), opt.ordinality
        )
        from jsonb_array_elements(
          case when jsonb_typeof(item.value->'options') = 'array'
            then item.value->'options'
            else '[]'::jsonb
          end
        ) with ordinality opt(value, ordinality)
      ), '[]'::jsonb)
    ) order by coalesce(nullif(item.value->>'position', '')::integer, item.ordinality::integer), item.ordinality
  ), '[]'::jsonb) as value
  from jsonb_array_elements(
    case when jsonb_typeof(p_questions) = 'array'
      then p_questions
      else '[]'::jsonb
    end
  ) with ordinality item(value, ordinality)
)
select db_questions.value = payload_questions.value
from db_questions
cross join payload_questions;
$function$;

revoke all on function app_private.e14_assessment_questions_match_payload(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function app_private.e14_assessment_questions_match_payload(uuid, jsonb)
  to service_role, app_worker;

commit;
