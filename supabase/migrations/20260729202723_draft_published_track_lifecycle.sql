create or replace function app_private.e14_reject_published_row_mutation()
returns trigger
language plpgsql
set search_path to 'pg_catalog'
as $function$
begin
  if old.status='published'
    and not (current_user='postgres' and current_setting('app.admin_live_edit',true)='on') then
    raise exception 'PUBLISHED_VERSION_IMMUTABLE' using errcode='55000';
  end if;
  return case when tg_op='DELETE' then old else new end;
end;
$function$;

create or replace function app_private.e14_reject_published_path_child()
returns trigger
language plpgsql
set search_path to 'pg_catalog'
as $function$
declare v_template_id uuid; v_status text;
begin
  if current_user='postgres' and current_setting('app.admin_live_edit',true)='on' then
    return case when tg_op='DELETE' then old else new end;
  end if;
  if tg_table_name='path_templates' then
    if tg_op='INSERT' then
      select jv.status into v_status from catalog.journey_versions jv where jv.id=new.journey_version_id;
      if v_status='published' then raise exception 'PUBLISHED_JOURNEY_IMMUTABLE' using errcode='55000'; end if;
    end if;
    return case when tg_op='DELETE' then old else new end;
  end if;
  v_template_id:=coalesce(new.path_template_id,old.path_template_id);
  select pt.status into v_status from orchestration.path_templates pt where pt.id=v_template_id;
  if v_status='published' then raise exception 'PUBLISHED_PATH_IMMUTABLE' using errcode='55000'; end if;
  return case when tg_op='DELETE' then old else new end;
end;
$function$;

create or replace function app_private.e14_reject_published_assessment_child()
returns trigger
language plpgsql
set search_path to 'pg_catalog'
as $function$
declare v_activity_version_id uuid; v_status text;
begin
  if current_user='postgres' and current_setting('app.admin_live_edit',true)='on' then
    return case when tg_op='DELETE' then old else new end;
  end if;
  if tg_table_name='assessment_specs' then
    v_activity_version_id:=coalesce(new.activity_version_id,old.activity_version_id);
  elsif tg_table_name='questions' then
    v_activity_version_id:=coalesce(new.activity_version_id,old.activity_version_id);
  else
    select q.activity_version_id into v_activity_version_id from assessment.questions q where q.id=coalesce(new.question_id,old.question_id);
  end if;
  select av.status into v_status from catalog.activity_versions av where av.id=v_activity_version_id;
  if v_status='published' then raise exception 'PUBLISHED_ASSESSMENT_IMMUTABLE' using errcode='55000'; end if;
  return case when tg_op='DELETE' then old else new end;
end;
$function$;

with document as (
  select jsonb_build_object(
    '$schema','https://json-schema.org/draft/2020-12/schema',
    'title','admin.track.saved',
    'type','object',
    'additionalProperties',true
  ) schema_document
)
insert into eventing.event_schemas(id,event_name,event_version,schema_uri,schema_document,schema_hash,status,published_at)
select gen_random_uuid(),'admin.track.saved',1,'urn:estimulo:event:admin.track.saved:1',schema_document,app_private.e14_request_hash(schema_document),'published',now()
from document
on conflict(event_name,event_version) do nothing;
