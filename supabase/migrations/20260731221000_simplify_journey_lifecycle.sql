begin;

-- A journey now has one operational record. Keep the existing table name only as
-- a compatibility boundary for participant RPCs that already use its UUID.
create temporary table _journey_canonical on commit drop as
select journey_definition_id,id as journey_id
from (
  select jv.journey_definition_id,jv.id,
    row_number() over (
      partition by jv.journey_definition_id
      order by case jv.status when 'published' then 0 when 'draft' then 1 else 2 end,
        jv.version_number desc,jv.created_at desc
    ) as rn
  from catalog.journey_versions jv
) ranked
where rn=1;

create temporary table _journey_obsolete on commit drop as
select jv.id,jv.journey_definition_id
from catalog.journey_versions jv
join _journey_canonical selected using(journey_definition_id)
where jv.id<>selected.journey_id;

create temporary table _journey_obsolete_paths on commit drop as
select pt.id,pt.code,obsolete.journey_definition_id
from orchestration.path_templates pt
join _journey_obsolete obsolete on obsolete.id=pt.journey_version_id;

-- An old assignment can coexist with the equivalent assignment of the selected
-- journey. Remove that duplicate history, then remap any remaining assignment by
-- stable path code.
create temporary table _journey_duplicate_assignments on commit drop as
select assignment.id
from orchestration.path_assignments assignment
join _journey_obsolete_paths old_path on old_path.id=assignment.path_template_id
join _journey_canonical selected on selected.journey_definition_id=old_path.journey_definition_id
join orchestration.path_templates current_path
  on current_path.journey_version_id=selected.journey_id and current_path.code=old_path.code
where exists (
  select 1
  from orchestration.path_assignments existing
  where existing.journey_instance_id=assignment.journey_instance_id
    and existing.path_template_id=current_path.id
    and existing.id<>assignment.id
);

create temporary table _journey_duplicate_steps on commit drop as
select id from orchestration.step_instances
where path_assignment_id in (select id from _journey_duplicate_assignments);

create temporary table _journey_duplicate_attempts on commit drop as
select id from assessment.attempts
where step_instance_id in (select id from _journey_duplicate_steps);

create temporary table _journey_duplicate_submissions on commit drop as
select id from assessment.submissions
where step_instance_id in (select id from _journey_duplicate_steps);

delete from assessment.responses where attempt_id in (select id from _journey_duplicate_attempts);
delete from assessment.results where attempt_id in (select id from _journey_duplicate_attempts);
delete from assessment.attempts where id in (select id from _journey_duplicate_attempts);
delete from assessment.reviews where submission_id in (select id from _journey_duplicate_submissions);
delete from assessment.submission_evidence where submission_id in (select id from _journey_duplicate_submissions);
delete from assessment.submissions where id in (select id from _journey_duplicate_submissions);
delete from engagement.activity_utility_rating_revisions where step_instance_id in (select id from _journey_duplicate_steps);
delete from engagement.activity_utility_ratings where step_instance_id in (select id from _journey_duplicate_steps);
delete from engagement.activity_comments where step_instance_id in (select id from _journey_duplicate_steps);
delete from orchestration.activity_asset_progress where step_instance_id in (select id from _journey_duplicate_steps);
delete from orchestration.activity_sessions where step_instance_id in (select id from _journey_duplicate_steps);
delete from orchestration.step_instances where id in (select id from _journey_duplicate_steps);
delete from orchestration.path_assignments where id in (select id from _journey_duplicate_assignments);

update orchestration.path_assignments assignment
set path_template_id=current_path.id
from _journey_obsolete_paths old_path
join _journey_canonical selected on selected.journey_definition_id=old_path.journey_definition_id
join orchestration.path_templates current_path
  on current_path.journey_version_id=selected.journey_id and current_path.code=old_path.code
where assignment.path_template_id=old_path.id;

do $block$
begin
  if exists(select 1 from orchestration.enrollments where journey_version_id in (select id from _journey_obsolete))
    or exists(select 1 from orchestration.cohorts where journey_version_id in (select id from _journey_obsolete))
    or exists(select 1 from orchestration.assignment_policies where journey_version_id in (select id from _journey_obsolete))
    or exists(select 1 from orchestration.path_assignments where path_template_id in (select id from _journey_obsolete_paths)) then
    raise exception 'OBSOLETE_JOURNEY_HAS_UNMIGRATABLE_RUNTIME_DATA';
  end if;
end;
$block$;

delete from engagement.certificate_issuances
where certificate_version_id in (
  select id from engagement.certificate_versions
  where journey_version_id in (select id from _journey_obsolete)
);
delete from engagement.certificate_versions where journey_version_id in (select id from _journey_obsolete);
delete from catalog.library_item_journey_links where journey_version_id in (select id from _journey_obsolete);
delete from catalog.journey_competencies where journey_version_id in (select id from _journey_obsolete);
delete from orchestration.path_transitions where path_template_id in (select id from _journey_obsolete_paths);
delete from orchestration.path_steps where path_template_id in (select id from _journey_obsolete_paths);
delete from orchestration.path_templates where id in (select id from _journey_obsolete_paths);
delete from experience.admin_content_revisions where resource_type='journey_version';
delete from catalog.journey_versions where id in (select id from _journey_obsolete);

update catalog.journey_versions set version_number=1,retired_at=null where version_number<>1;
alter table catalog.journey_versions drop constraint if exists uq_catalog_journey_versions_journey_definition_id_v_2e8961d1;
alter table catalog.journey_versions drop constraint if exists uq_catalog_journey_versions_journey_definition_id_c_280c122a;
alter table catalog.journey_versions drop constraint if exists ck_catalog_journey_versions_version_number_single;
alter table catalog.journey_versions
  add constraint ck_catalog_journey_versions_version_number_single check(version_number=1);
create unique index if not exists uq_catalog_single_journey_per_definition
  on catalog.journey_versions(journey_definition_id);

create or replace function public.save_admin_journey(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_payload jsonb,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_request_hash text:=app_private.e14_request_hash(jsonb_build_object('organization_id',p_organization_id,'payload',p_payload));
  v_event_id uuid:=app_private.e14_command_event_id('save_admin_journey',p_actor_user_account_id,p_organization_id,v_key);
  v_existing_hash text;
  v_existing_result jsonb;
  v_definition_id uuid:=nullif(p_payload->>'definition_id','')::uuid;
  v_journey_id uuid:=coalesce(nullif(p_payload->>'journey_id','')::uuid,nullif(p_payload->>'version_id','')::uuid);
  v_status text;
  v_code text:=lower(btrim(coalesce(p_payload->>'code','')));
  v_configuration jsonb;
  v_result jsonb;
  v_aggregate_version bigint;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'journey.definition.manage') then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  if jsonb_typeof(p_payload)<>'object' then raise exception 'JOURNEY_PAYLOAD_INVALID' using errcode='22023'; end if;
  if v_code!~'^[a-z][a-z0-9_\-]{1,79}$' then raise exception 'ADMIN_CODE_INVALID' using errcode='22023'; end if;
  if nullif(btrim(p_payload->>'title'),'') is null then raise exception 'JOURNEY_TITLE_REQUIRED' using errcode='22023'; end if;

  select payload->>'request_hash',payload->'result'
  into v_existing_hash,v_existing_result
  from eventing.events where event_id=v_event_id;
  if found then
    if v_existing_hash is distinct from v_request_hash then raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode='23505'; end if;
    return coalesce(v_existing_result,'{}'::jsonb)||jsonb_build_object('replayed',true);
  end if;

  v_configuration:=coalesce(p_payload->'configuration','{}'::jsonb);
  v_configuration:=v_configuration||jsonb_build_object(
    '_editor',coalesce(v_configuration->'_editor','{}'::jsonb)||jsonb_build_object('saved_at',now())
  );

  if v_journey_id is null and v_definition_id is not null then
    select id,status into v_journey_id,v_status
    from catalog.journey_versions where journey_definition_id=v_definition_id for update;
  end if;

  if v_journey_id is null then
    if v_definition_id is null then
      insert into catalog.journey_definitions(
        id,program_id,owner_organization_id,code,slug,name,purpose,status,created_at,updated_at
      ) values (
        gen_random_uuid(),nullif(p_payload->>'program_id','')::uuid,p_organization_id,v_code,
        lower(btrim(coalesce(nullif(p_payload->>'slug',''),replace(v_code,'_','-')))),
        btrim(coalesce(nullif(p_payload->>'name',''),p_payload->>'title')),
        nullif(btrim(p_payload->>'purpose'),''),'active',now(),now()
      ) returning id into v_definition_id;
    else
      update catalog.journey_definitions set
        program_id=nullif(p_payload->>'program_id','')::uuid,
        code=v_code,
        slug=lower(btrim(coalesce(nullif(p_payload->>'slug',''),slug))),
        name=btrim(coalesce(nullif(p_payload->>'name',''),p_payload->>'title')),
        purpose=nullif(btrim(p_payload->>'purpose'),''),status='active',updated_at=now()
      where id=v_definition_id and owner_organization_id=p_organization_id;
      if not found then raise exception 'JOURNEY_NOT_FOUND' using errcode='P0002'; end if;
    end if;

    perform app_private.e14_lock_scope('journey-definition|'||v_definition_id::text);
    v_journey_id:=gen_random_uuid();
    insert into catalog.journey_versions(
      id,journey_definition_id,version_number,status,title,description,configuration,schema_version,
      eligible_archetype_codes,published_at,retired_at,content_hash,created_by,created_at
    ) values (
      v_journey_id,v_definition_id,1,'draft',btrim(p_payload->>'title'),nullif(btrim(p_payload->>'description'),''),
      v_configuration,'single',
      (select array_agg(value) from jsonb_array_elements_text(coalesce(p_payload->'eligible_archetype_codes','[]'::jsonb)) value),
      null,null,
      app_private.e14_request_hash(jsonb_build_object(
        'title',p_payload->>'title','description',p_payload->>'description','configuration',v_configuration,
        'eligible_archetype_codes',coalesce(p_payload->'eligible_archetype_codes','[]'::jsonb)
      )),p_actor_user_account_id,now()
    );
    v_status:='draft';
  else
    select jv.status,jv.journey_definition_id into v_status,v_definition_id
    from catalog.journey_versions jv
    join catalog.journey_definitions jd on jd.id=jv.journey_definition_id
    where jv.id=v_journey_id and jd.owner_organization_id=p_organization_id and jv.status in ('draft','published')
    for update of jv,jd;
    if not found then raise exception 'JOURNEY_NOT_FOUND' using errcode='P0002'; end if;
    if v_status='published' then perform set_config('app.admin_live_edit','on',true); end if;

    update catalog.journey_definitions set
      program_id=nullif(p_payload->>'program_id','')::uuid,
      code=v_code,
      slug=lower(btrim(coalesce(nullif(p_payload->>'slug',''),slug))),
      name=btrim(coalesce(nullif(p_payload->>'name',''),p_payload->>'title')),
      purpose=nullif(btrim(p_payload->>'purpose'),''),status='active',updated_at=now()
    where id=v_definition_id and owner_organization_id=p_organization_id;

    update catalog.journey_versions set
      title=btrim(p_payload->>'title'),
      description=nullif(btrim(p_payload->>'description'),''),
      configuration=v_configuration,
      eligible_archetype_codes=(
        select array_agg(value) from jsonb_array_elements_text(coalesce(p_payload->'eligible_archetype_codes','[]'::jsonb)) value
      ),
      content_hash=app_private.e14_request_hash(jsonb_build_object(
        'title',p_payload->>'title','description',p_payload->>'description','configuration',v_configuration,
        'eligible_archetype_codes',coalesce(p_payload->'eligible_archetype_codes','[]'::jsonb)
      ))
    where id=v_journey_id;
  end if;

  v_result:=jsonb_build_object(
    'definition_id',v_definition_id,'journey_id',v_journey_id,'version_id',v_journey_id,
    'status',v_status,'live_update',v_status='published'
  );
  perform app_private.e14_lock_scope('journey|'||v_journey_id::text);
  select coalesce(max(aggregate_version),0)+1 into v_aggregate_version
  from eventing.events where aggregate_type='journey' and aggregate_id=v_journey_id;
  perform app_private.e14_append_event(
    v_event_id,'admin.journey.saved','journey',v_journey_id,
    'user_account',p_actor_user_account_id,p_organization_id,null,
    'journey',v_journey_id,v_aggregate_version,v_event_id,null,
    jsonb_build_object('request_hash',v_request_hash,'result',v_result)
  );
  return v_result||jsonb_build_object('replayed',false);
end;
$function$;

create or replace function public.unpublish_admin_journey_to_draft(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_source_journey_version_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_hash text:=app_private.e14_request_hash(jsonb_build_object('journey_id',p_source_journey_version_id));
  v_event_id uuid:=app_private.e14_command_event_id('unpublish_admin_journey_to_draft',p_actor_user_account_id,p_source_journey_version_id,v_key);
  v_existing_hash text;
  v_existing_result jsonb;
  v_definition_id uuid;
  v_result jsonb;
  v_aggregate_version bigint;
  v_interrupted bigint;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'journey.definition.publish') then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  select payload->>'request_hash',payload->'result'
  into v_existing_hash,v_existing_result from eventing.events where event_id=v_event_id;
  if found then
    if v_existing_hash is distinct from v_hash then raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode='23505'; end if;
    return coalesce(v_existing_result,'{}'::jsonb)||jsonb_build_object('replayed',true);
  end if;

  perform app_private.e14_lock_scope('journey|'||p_source_journey_version_id::text);
  select jv.journey_definition_id into v_definition_id
  from catalog.journey_versions jv
  join catalog.journey_definitions jd on jd.id=jv.journey_definition_id
  where jv.id=p_source_journey_version_id and jv.status='published' and jd.owner_organization_id=p_organization_id
  for update of jv,jd;
  if not found then raise exception 'PUBLISHED_JOURNEY_NOT_FOUND' using errcode='P0002'; end if;

  update orchestration.journey_instances instance set
    status='ended',ended_at=coalesce(ended_at,now()),updated_at=now(),aggregate_version=aggregate_version+1
  from orchestration.enrollments enrollment
  where enrollment.id=instance.enrollment_id
    and enrollment.journey_version_id=p_source_journey_version_id
    and instance.status in ('in_progress','paused');
  get diagnostics v_interrupted=row_count;

  update orchestration.enrollments set status='cancelled',aggregate_version=aggregate_version+1
  where journey_version_id=p_source_journey_version_id and status='active';
  perform set_config('app.admin_live_edit','on',true);
  update orchestration.path_templates set status='draft'
  where journey_version_id=p_source_journey_version_id and status='published';
  update catalog.journey_versions set status='draft',published_at=null
  where id=p_source_journey_version_id;

  v_result:=jsonb_build_object(
    'source_journey_version_id',p_source_journey_version_id,
    'journey_version_id',p_source_journey_version_id,
    'journey_id',p_source_journey_version_id,
    'journey_definition_id',v_definition_id,
    'status','draft','interrupted_participants',v_interrupted
  );
  select coalesce(max(aggregate_version),0)+1 into v_aggregate_version
  from eventing.events where aggregate_type='journey' and aggregate_id=p_source_journey_version_id;
  perform app_private.e14_append_event(
    v_event_id,'admin.journey.unpublished','journey',p_source_journey_version_id,
    'user_account',p_actor_user_account_id,p_organization_id,null,
    'journey',p_source_journey_version_id,v_aggregate_version,v_event_id,null,
    jsonb_build_object('request_hash',v_hash,'result',v_result)
  );
  return v_result||jsonb_build_object('replayed',false);
end;
$function$;

create or replace function public.delete_admin_journey_draft(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_journey_version_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_hash text:=app_private.e14_request_hash(jsonb_build_object('journey_id',p_journey_version_id));
  v_event_id uuid:=app_private.e14_command_event_id('delete_admin_journey_draft',p_actor_user_account_id,p_journey_version_id,v_key);
  v_existing_hash text;
  v_existing_result jsonb;
  v_definition_id uuid;
  v_result jsonb;
  v_can_hard_delete boolean;
  v_aggregate_version bigint;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'journey.definition.manage') then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  select payload->>'request_hash',payload->'result'
  into v_existing_hash,v_existing_result from eventing.events where event_id=v_event_id;
  if found then
    if v_existing_hash is distinct from v_hash then raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode='23505'; end if;
    return coalesce(v_existing_result,'{}'::jsonb)||jsonb_build_object('replayed',true);
  end if;

  perform app_private.e14_lock_scope('journey|'||p_journey_version_id::text);
  select jv.journey_definition_id into v_definition_id
  from catalog.journey_versions jv
  join catalog.journey_definitions jd on jd.id=jv.journey_definition_id
  where jv.id=p_journey_version_id and jv.status='draft' and jd.owner_organization_id=p_organization_id
  for update of jv,jd;
  if not found then raise exception 'JOURNEY_DRAFT_NOT_FOUND' using errcode='P0002'; end if;

  select
    not exists(select 1 from orchestration.enrollments where journey_version_id=p_journey_version_id)
    and not exists(select 1 from orchestration.cohorts where journey_version_id=p_journey_version_id)
    and not exists(select 1 from orchestration.assignment_policies where journey_version_id=p_journey_version_id)
    and not exists(select 1 from engagement.certificate_versions where journey_version_id=p_journey_version_id)
    and not exists(
      select 1 from orchestration.path_assignments assignment
      join orchestration.path_templates path on path.id=assignment.path_template_id
      where path.journey_version_id=p_journey_version_id
    )
  into v_can_hard_delete;

  if v_can_hard_delete then
    delete from catalog.library_item_journey_links where journey_version_id=p_journey_version_id;
    delete from catalog.journey_competencies where journey_version_id=p_journey_version_id;
    delete from orchestration.path_transitions
    where path_template_id in (select id from orchestration.path_templates where journey_version_id=p_journey_version_id);
    delete from orchestration.path_steps
    where path_template_id in (select id from orchestration.path_templates where journey_version_id=p_journey_version_id);
    delete from orchestration.path_templates where journey_version_id=p_journey_version_id;
    delete from catalog.journey_versions where id=p_journey_version_id;
    delete from catalog.journey_theme_links where journey_definition_id=v_definition_id;
    delete from catalog.journey_definitions where id=v_definition_id;
  else
    perform set_config('app.admin_live_edit','on',true);
    update catalog.journey_versions set status='retired',retired_at=now() where id=p_journey_version_id;
    update catalog.journey_definitions set status='retired',updated_at=now() where id=v_definition_id;
  end if;

  v_result:=jsonb_build_object(
    'journey_id',p_journey_version_id,'journey_version_id',p_journey_version_id,
    'journey_definition_id',v_definition_id,'status','deleted','hard_deleted',v_can_hard_delete
  );
  select coalesce(max(aggregate_version),0)+1 into v_aggregate_version
  from eventing.events where aggregate_type='journey' and aggregate_id=p_journey_version_id;
  perform app_private.e14_append_event(
    v_event_id,'admin.journey.deleted','journey',p_journey_version_id,
    'user_account',p_actor_user_account_id,p_organization_id,null,
    'journey',p_journey_version_id,v_aggregate_version,v_event_id,null,
    jsonb_build_object('request_hash',v_hash,'result',v_result)
  );
  return v_result||jsonb_build_object('replayed',false);
end;
$function$;

revoke all on function public.unpublish_admin_journey_to_draft(uuid,uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.delete_admin_journey_draft(uuid,uuid,uuid,text) from public,anon,authenticated;

commit;
