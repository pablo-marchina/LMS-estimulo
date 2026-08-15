begin;

do $repair$
declare
  v_badge record;
  v_target_path_id uuid;
  v_target_count integer;
  v_new_rule_version_id uuid;
  v_new_badge_version_id uuid;
  v_next_rule_version integer;
  v_next_badge_version integer;
  v_expression jsonb;
begin
  for v_badge in
    select bd.id as badge_definition_id,
           bd.code as badge_code,
           bv.id as badge_version_id,
           bv.title,
           bv.description,
           bv.asset_file_object_id,
           rd.id as rule_definition_id,
           rd.code as rule_code,
           rv.id as rule_version_id,
           rv.language,
           rv.expression,
           rv.input_schema,
           rv.output_schema
    from engagement.badge_definitions bd
    join engagement.badge_versions bv on bv.badge_definition_id=bd.id
    join orchestration.rule_versions rv on rv.id=bv.criteria_rule_version_id
    join orchestration.rule_definitions rd on rd.id=rv.rule_definition_id
    where bd.status='active'
      and bv.status='published'
      and rd.status='active'
      and rd.rule_type='credential'
      and rd.code like 'cred\_%' escape '\'
      and rv.status='published'
      and rv.expression->>'scope'='path'
      and not exists (
        select 1 from orchestration.path_templates current_path
        where current_path.id::text=rv.expression->>'path_template_id'
          and current_path.status='published'
      )
  loop
    select count(*), (array_agg(path.id order by path.id::text))[1]
      into v_target_count, v_target_path_id
    from orchestration.path_templates path
    where path.status='published'
      and path.code=substring(v_badge.rule_code from 6);

    if v_target_count <> 1 then
      raise exception 'ORPHANED_BADGE_PATH_MAPPING_AMBIGUOUS:%:%', v_badge.rule_code, v_target_count using errcode='22023';
    end if;

    v_expression := v_badge.expression || jsonb_build_object('scope','path','path_template_id',v_target_path_id::text);
    select coalesce(max(version_number),0)+1 into v_next_rule_version
      from orchestration.rule_versions where rule_definition_id=v_badge.rule_definition_id;
    v_new_rule_version_id := app_private.e14_deterministic_uuid('rebound-rule:'||v_badge.rule_definition_id::text||':'||v_target_path_id::text);

    insert into orchestration.rule_versions(
      id,rule_definition_id,version_number,status,language,expression,input_schema,output_schema,published_at,content_hash,created_at
    ) values (
      v_new_rule_version_id,v_badge.rule_definition_id,v_next_rule_version,'published',v_badge.language,v_expression,
      v_badge.input_schema,v_badge.output_schema,now(),
      app_private.e14_request_hash(jsonb_build_object('expression',v_expression,'input_schema',v_badge.input_schema,'output_schema',v_badge.output_schema)),now()
    ) on conflict (id) do nothing;

    select coalesce(max(version_number),0)+1 into v_next_badge_version
      from engagement.badge_versions where badge_definition_id=v_badge.badge_definition_id;
    v_new_badge_version_id := app_private.e14_deterministic_uuid('rebound-badge:'||v_badge.badge_definition_id::text||':'||v_target_path_id::text);

    insert into engagement.badge_versions(
      id,badge_definition_id,version_number,status,title,description,criteria_rule_version_id,asset_file_object_id,published_at
    ) values (
      v_new_badge_version_id,v_badge.badge_definition_id,v_next_badge_version,'published',v_badge.title,v_badge.description,
      v_new_rule_version_id,v_badge.asset_file_object_id,now()
    ) on conflict (id) do nothing;
  end loop;
end;
$repair$;

commit;
