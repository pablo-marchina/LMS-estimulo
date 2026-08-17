begin;

-- The path -> badge link is administrative configuration, not participant data.
-- Keep it closed to direct client/worker access; SECURITY DEFINER routines owned
-- by postgres remain the only mutation/read path used by the application.
alter table engagement.path_badge_links enable row level security;
revoke all on table engagement.path_badge_links from public, anon, authenticated, app_worker;
grant select, insert, update, delete on table engagement.path_badge_links to service_role;

comment on table engagement.path_badge_links is
  'Administrative mapping between a path template and the published badge awarded when that path is completed. Direct client access is denied; managed through security-definer runtime functions.';

create or replace function app_private.learning_badge_candidates(p_context jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path='pg_catalog'
as $function$
declare
  v_badges jsonb:='[]'::jsonb;
  v_record record;
  v_award_id uuid;
  v_entrepreneur_id uuid:=(p_context->>'entrepreneur_id')::uuid;
  v_journey_instance_id uuid:=(p_context->>'journey_instance_id')::uuid;
  v_journey_version_id uuid:=(p_context->>'journey_version_id')::uuid;
  v_step_instance_id uuid:=(p_context->>'step_instance_id')::uuid;
  v_step_activity_version_id uuid:=(p_context->>'step_activity_version_id')::uuid;
begin
  if v_step_instance_id is not null then
    for v_record in
      select bv.id,bv.title,bv.description,bv.criteria_rule_version_id
      from engagement.badge_versions bv
      join engagement.badge_definitions bd on bd.id=bv.badge_definition_id
      where bv.status='published' and bd.status='active'
        and app_private.credential_rule_matches(
          bv.criteria_rule_version_id,'activity',v_journey_version_id,
          v_step_activity_version_id,(p_context->>'step_completed')::boolean,
          true,(p_context->>'step_assessment_passed')::boolean
        )
      order by bv.id
    loop
      v_award_id:=app_private.e14_deterministic_uuid(
        'badge-award:'||v_entrepreneur_id::text||':'||v_journey_instance_id::text||':'||v_record.id::text
      );
      v_badges:=v_badges||jsonb_build_array(jsonb_build_object(
        'award_id',v_award_id,'badge_version_id',v_record.id,'title',v_record.title,
        'description',v_record.description,'scope','activity',
        'step_instance_id',v_step_instance_id,'rule_version_id',v_record.criteria_rule_version_id,
        'source','criteria_rule'
      ));
    end loop;
  end if;

  if p_context->>'journey_status'='completed' then
    for v_record in
      select bv.id,bv.title,bv.description,bv.criteria_rule_version_id
      from engagement.badge_versions bv
      join engagement.badge_definitions bd on bd.id=bv.badge_definition_id
      where bv.status='published' and bd.status='active'
        and app_private.credential_rule_matches(
          bv.criteria_rule_version_id,'journey',v_journey_version_id,null,true,
          (p_context->>'required_steps_completed')::boolean,
          (p_context->>'required_assessments_passed')::boolean
        )
      order by bv.id
    loop
      v_award_id:=app_private.e14_deterministic_uuid(
        'badge-award:'||v_entrepreneur_id::text||':'||v_journey_instance_id::text||':'||v_record.id::text
      );
      v_badges:=v_badges||jsonb_build_array(jsonb_build_object(
        'award_id',v_award_id,'badge_version_id',v_record.id,'title',v_record.title,
        'description',v_record.description,'scope','journey','step_instance_id',null,
        'rule_version_id',v_record.criteria_rule_version_id,'source','criteria_rule'
      ));
    end loop;
  end if;

  if (p_context->>'path_completed')::boolean is true then
    for v_record in
      with path_candidates as (
        select
          bv.id,bv.title,bv.description,bv.criteria_rule_version_id,
          'path_badge_link'::text as source,
          0 as priority
        from engagement.path_badge_links link
        join engagement.badge_versions bv on bv.id=link.badge_version_id
        join engagement.badge_definitions bd on bd.id=bv.badge_definition_id
        where link.path_template_id=(p_context->>'path_template_id')::uuid
          and link.badge_version_id is not null
          and bv.status='published'
          and bd.status='active'

        union all

        select
          bv.id,bv.title,bv.description,bv.criteria_rule_version_id,
          'criteria_rule'::text as source,
          1 as priority
        from engagement.badge_versions bv
        join engagement.badge_definitions bd on bd.id=bv.badge_definition_id
        where bv.status='published' and bd.status='active'
          and app_private.credential_rule_matches(
            bv.criteria_rule_version_id,'path',v_journey_version_id,null,true,
            (p_context->>'path_required_steps_completed')::boolean,
            (p_context->>'path_required_assessments_passed')::boolean,
            (p_context->>'path_template_id')::uuid
          )
      ), deduplicated as (
        select distinct on (id)
          id,title,description,criteria_rule_version_id,source,priority
        from path_candidates
        order by id,priority
      )
      select id,title,description,criteria_rule_version_id,source
      from deduplicated
      order by id
    loop
      v_award_id:=app_private.e14_deterministic_uuid(
        'badge-award:'||v_entrepreneur_id::text||':'||v_journey_instance_id::text||':'||v_record.id::text
      );
      v_badges:=v_badges||jsonb_build_array(jsonb_build_object(
        'award_id',v_award_id,'badge_version_id',v_record.id,'title',v_record.title,
        'description',v_record.description,'scope','path',
        'path_template_id',p_context->>'path_template_id',
        'rule_version_id',v_record.criteria_rule_version_id,
        'source',v_record.source
      ));
    end loop;
  end if;

  return v_badges;
end;
$function$;

commit;