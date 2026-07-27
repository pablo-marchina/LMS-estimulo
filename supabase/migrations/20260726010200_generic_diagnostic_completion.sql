-- Replace the legacy four-question diagnostic completion with a dynamic implementation.
-- Parameter names remain frozen for compatibility with the existing public RPC chain.

create or replace function app_private.e14_scores_c(a uuid)
returns jsonb language sql stable security definer set search_path to 'pg_catalog'
as $function$
with latest as (
  select distinct on (response.item_id) response.item_id,response.response_value
  from diagnostics.responses response where response.session_id=a
  order by response.item_id,response.revision desc
), session_context as (
  select session.diagnostic_version_id from diagnostics.sessions session where session.id=a
), dimension_scores as (
  select dimension.position,dimension.code,
    coalesce(sum((latest.response_value->>'score')::numeric),0) score,
    count(latest.item_id)::integer answered,count(item.id)::integer total
  from diagnostics.dimensions dimension
  left join diagnostics.items item on item.dimension_id=dimension.id
  left join latest on latest.item_id=item.id
  where dimension.diagnostic_version_id=(select diagnostic_version_id from session_context)
  group by dimension.position,dimension.code
), requirement_counts as (
  select count(*) filter(where item.is_required)::integer required,
    count(latest.item_id) filter(where item.is_required)::integer answered_required
  from diagnostics.items item left join latest on latest.item_id=item.id
  where item.diagnostic_version_id=(select diagnostic_version_id from session_context)
)
select jsonb_build_object(
  'n',(select count(*) from latest),
  'required',(select required from requirement_counts),
  'answered_required',(select answered_required from requirement_counts),
  'u',(select count(*) from latest where coalesce((response_value->>'uncertain')::boolean,false)),
  'x',coalesce((select score from dimension_scores where position=1),0),
  'y',coalesce((select score from dimension_scores where position=2),0),
  'dimensions',coalesce((select jsonb_object_agg(code,score) from dimension_scores),'{}'::jsonb)
)
$function$;

create or replace function app_private.e14_path_c(a uuid,b jsonb)
returns jsonb language sql stable security definer set search_path to 'pg_catalog'
as $function$
with preferred_code as (
  select case
    when exists(select 1 from orchestration.path_templates where journey_version_id=a and status='published' and code in ('standard','guided'))
      then case when (b->>'u')::integer<2 and (b->>'x')::numeric>=3 and (b->>'y')::numeric>=3 then 'standard' else 'guided' end
    else null end code
), chosen as (
  select template.id,template.code from orchestration.path_templates template
  where template.journey_version_id=a and template.status='published'
  order by case when template.code=(select code from preferred_code) then 0 else 1 end,
    template.is_default desc,template.position,template.id limit 1
), first_step as (
  select step.id,step.activity_version_id from orchestration.path_steps step
  where step.path_template_id=(select id from chosen)
  order by step.position_hint,step.id limit 1
)
select jsonb_build_object('p',chosen.code,'t',chosen.id,'s',first_step.id,'v',first_step.activity_version_id,'l',((b->>'u')::integer>=2))
from chosen join first_step on true
$function$;

create or replace function app_private.e14_write_c1(a uuid,b jsonb,c jsonb,d uuid)
returns uuid language plpgsql security definer set search_path to 'pg_catalog'
as $function$
declare v_result_id uuid;
begin
  v_result_id:=app_private.e14_deterministic_uuid(a::text||'r');
  insert into diagnostics.results(id,session_id,calculation_version,status,operational_readiness,data_quality,recommended_start,calculated_at,source_event_high_watermark)
  values(
    v_result_id,a,'v1','completed',jsonb_build_object('dimensions',coalesce(c->'dimensions','{}'::jsonb)),
    jsonb_build_object('answered',coalesce((c->>'n')::integer,0),'required',coalesce((c->>'required')::integer,0),
      'answered_required',coalesce((c->>'answered_required')::integer,0),'uncertain',coalesce((c->>'u')::integer,0)),
    jsonb_build_object('path_code',b->>'p'),now(),d
  ) on conflict(session_id,calculation_version) do update set
    status='completed',operational_readiness=excluded.operational_readiness,data_quality=excluded.data_quality,
    recommended_start=excluded.recommended_start,calculated_at=excluded.calculated_at,source_event_high_watermark=excluded.source_event_high_watermark;
  return v_result_id;
end;
$function$;

create or replace function app_private.e14_write_step(a jsonb,b uuid)
returns uuid language plpgsql security definer set search_path to 'pg_catalog'
as $function$
declare v_first_path_step_id uuid:=(a->>'s')::uuid; v_first_step_instance_id uuid; v_required_count integer;
begin
  insert into orchestration.step_instances(id,path_assignment_id,path_step_id,activity_version_id,status,available_at,started_at,completed_at,attempt_count,aggregate_version)
  select app_private.e14_deterministic_uuid(b::text||step.id::text),b,step.id,step.activity_version_id,
    case when step.id=v_first_path_step_id then 'available' else 'locked' end,
    case when step.id=v_first_path_step_id then now() else null end,null,null,0,0
  from orchestration.path_steps step where step.path_template_id=(a->>'t')::uuid
  order by step.position_hint,step.id on conflict(path_assignment_id,path_step_id) do nothing;
  select instance.id into v_first_step_instance_id from orchestration.step_instances instance
  where instance.path_assignment_id=b and instance.path_step_id=v_first_path_step_id;
  select count(*) filter(where step.is_required) into v_required_count from orchestration.path_steps step where step.path_template_id=(a->>'t')::uuid;
  update orchestration.progress_projections set total_required_steps=greatest(coalesce(v_required_count,0),1),
    current_step_id=coalesce(current_step_id,v_first_path_step_id),last_activity_at=coalesce(last_activity_at,now()),
    projection_version=projection_version+1,updated_at=now()
  where journey_instance_id=(select assignment.journey_instance_id from orchestration.path_assignments assignment where assignment.id=b);
  return v_first_step_instance_id;
end;
$function$;

create or replace function app_private.e14_apply_c(a uuid,b jsonb,c jsonb,d jsonb,e uuid)
returns jsonb language plpgsql security definer set search_path to 'pg_catalog'
as $function$
declare v_session_version bigint; v_result_id uuid; v_decision_id uuid; v_assignment_id uuid; v_step_instance_id uuid; v_dimension record;
begin
  if coalesce((c->>'answered_required')::integer,0)<coalesce((c->>'required')::integer,0) or d is null then
    raise exception 'DIAGNOSTIC_INCOMPLETE' using errcode='P0001';
  end if;
  v_session_version:=app_private.e14_complete_session(a);
  v_result_id:=app_private.e14_write_c1(a,d,c,e);
  for v_dimension in
    with latest as (
      select distinct on (response.item_id) response.item_id,response.response_value
      from diagnostics.responses response where response.session_id=a order by response.item_id,response.revision desc
    )
    select dimension.id,coalesce(sum((latest.response_value->>'score')::numeric),0) score,
      case when count(item.id)=0 then 0 else count(latest.item_id)::numeric/count(item.id)::numeric end answered_ratio,
      count(latest.item_id)::integer answered,count(item.id)::integer total
    from diagnostics.dimensions dimension left join diagnostics.items item on item.dimension_id=dimension.id
    left join latest on latest.item_id=item.id
    where dimension.diagnostic_version_id=(b->>'version_id')::uuid group by dimension.id
  loop
    insert into diagnostics.dimension_results(result_id,dimension_id,score,answered_ratio,evidence_status,details)
    values(v_result_id,v_dimension.id,v_dimension.score,v_dimension.answered_ratio,
      case when v_dimension.answered=v_dimension.total then 'observed' else 'partial' end,
      jsonb_build_object('answered',v_dimension.answered,'total',v_dimension.total))
    on conflict(result_id,dimension_id) do update set score=excluded.score,answered_ratio=excluded.answered_ratio,
      evidence_status=excluded.evidence_status,details=excluded.details;
  end loop;
  v_decision_id:=app_private.e14_write_c3(b,c,d);
  v_assignment_id:=app_private.e14_write_c4(b,d,v_result_id);
  v_step_instance_id:=app_private.e14_write_step(d,v_assignment_id);
  perform app_private.e14_set_current_step((b->>'instance_id')::uuid,(d->>'s')::uuid);
  return jsonb_build_object('result_id',v_result_id,'decision_id',v_decision_id,'assignment_id',v_assignment_id,
    'step_instance_id',v_step_instance_id,'session_aggregate_version',v_session_version,'path_code',d->>'p','low_confidence',(d->>'l')::boolean);
end;
$function$;

create or replace function app_private.e14_snapshot_c(a uuid)
returns jsonb language sql stable security definer set search_path to 'pg_catalog'
as $function$
select jsonb_build_object('session_id',session.id,'session_status',session.status,'session_aggregate_version',session.aggregate_version,
  'result_id',result.id,'path_code',template.code,'assignment_id',assignment.id,'step_instance_id',step_instance.id,'step_status',step_instance.status)
from diagnostics.sessions session
left join diagnostics.results result on result.session_id=session.id and result.calculation_version='v1'
left join orchestration.path_assignments assignment on assignment.journey_instance_id=session.journey_instance_id and assignment.status in('active','completed')
left join orchestration.path_templates template on template.id=assignment.path_template_id
left join lateral (
  select item.id,item.status from orchestration.step_instances item where item.path_assignment_id=assignment.id
  order by item.available_at nulls last,item.created_at,item.id limit 1
) step_instance on true
where session.id=a order by assignment.created_at desc limit 1
$function$;
