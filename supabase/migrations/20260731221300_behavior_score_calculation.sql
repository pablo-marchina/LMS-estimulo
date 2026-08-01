begin;

create or replace function app_private.recalculate_behavior_scores(
  p_organization_id uuid,
  p_entrepreneur_id uuid default null
)
returns bigint
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_score_version_id uuid;
  v_configuration_id uuid;
  v_configuration jsonb;
  v_formula text;
  v_norm_min numeric;
  v_norm_max numeric;
  v_confidence_events numeric;
  v_dimension jsonb;
  v_dimensions jsonb;
  v_metric numeric;
  v_value numeric;
  v_weight numeric;
  v_weighted_sum numeric;
  v_weight_total numeric;
  v_raw_score numeric;
  v_total_score numeric;
  v_classification text;
  v_hash text;
  v_count bigint:=0;
  rec record;
begin
  select config.id,app_private.validate_behavior_score_configuration(config.configuration)
    into v_configuration_id,v_configuration
    from intelligence.behavior_score_configurations config
    where config.owner_organization_id=p_organization_id and config.status='active';

  if v_configuration is null then
    v_configuration:=app_private.default_behavior_score_configuration();
  end if;

  select sv.id into v_score_version_id
    from intelligence.score_versions sv
    join intelligence.score_definitions sd on sd.id=sv.score_definition_id
    where sd.owner_organization_id=p_organization_id
      and sd.code='behavioral_engagement_v1'
      and sv.status='published'
    order by sv.version_number desc limit 1;
  if v_score_version_id is null then raise exception 'BEHAVIOR_SCORE_MODEL_NOT_FOUND' using errcode='P0002'; end if;

  v_formula:=v_configuration->>'formula';
  v_norm_min:=(v_configuration#>>'{normalization,minimum}')::numeric;
  v_norm_max:=(v_configuration#>>'{normalization,maximum}')::numeric;
  v_confidence_events:=(v_configuration#>>'{confidence,events_for_full_confidence}')::numeric;

  for rec in
    select e.id as entrepreneur_id,e.user_account_id,
      count(ev.event_id)::bigint as event_count,
      min(ev.occurred_at) as coverage_started_at,
      count(distinct ev.occurred_at::date)::numeric as active_days,
      count(*) filter(where ev.payload->>'interaction_type' in ('page_view','content_view','video_progress','library_open'))::numeric as depth_events,
      count(*) filter(where ev.payload->>'interaction_type' in ('content_complete','activity_complete','delivery_submit','diagnostic_complete'))::numeric as completion_events,
      count(*) filter(where ev.payload->>'interaction_type' in ('search','library_open','b2b_open','reward_view'))::numeric as autonomy_events,
      count(distinct date_trunc('week',ev.occurred_at))::numeric as active_weeks,
      coalesce((
        select avg(submission.final_score)
        from assessment.delivery_submissions submission
        where submission.entrepreneur_id=e.id and submission.final_score is not null
      ),0)::numeric as quality_average
    from core.entrepreneurs e
    left join eventing.events ev
      on ev.actor_id=e.user_account_id
      and ev.event_name='behavior.interaction.recorded'
      and ev.organization_id=p_organization_id
    where e.status='active' and (p_entrepreneur_id is null or e.id=p_entrepreneur_id)
    group by e.id,e.user_account_id
  loop
    v_dimensions:='{}'::jsonb;
    v_weighted_sum:=0;
    v_weight_total:=0;

    for v_dimension in select value from jsonb_array_elements(v_configuration->'dimensions')
    loop
      v_metric:=case v_dimension->>'metric'
        when 'event_count' then rec.event_count
        when 'active_days' then rec.active_days
        when 'depth_events' then rec.depth_events
        when 'completion_events' then rec.completion_events
        when 'autonomy_events' then rec.autonomy_events
        when 'quality_average' then rec.quality_average
        when 'active_weeks' then rec.active_weeks
        else 0 end;
      v_value:=least(
        (v_dimension->>'cap')::numeric,
        greatest(0,v_metric*(v_dimension->>'multiplier')::numeric+coalesce((v_dimension->>'offset')::numeric,0))
      );
      v_weight:=(v_dimension->>'weight')::numeric;
      v_dimensions:=v_dimensions||jsonb_build_object(v_dimension->>'code',round(v_value,2));
      v_weighted_sum:=v_weighted_sum+(v_value*v_weight);
      v_weight_total:=v_weight_total+v_weight;
    end loop;

    if v_weight_total<=0 then raise exception 'BEHAVIOR_WEIGHT_TOTAL_INVALID' using errcode='22023'; end if;
    v_raw_score:=case when v_formula='weighted_sum' then v_weighted_sum else v_weighted_sum/v_weight_total end;
    v_total_score:=least(100,greatest(0,((v_raw_score-v_norm_min)/(v_norm_max-v_norm_min))*100));
    select item->>'label' into v_classification
      from jsonb_array_elements(v_configuration->'classifications') item
      where v_total_score between (item->>'minimum')::numeric and (item->>'maximum')::numeric
      order by (item->>'minimum')::numeric desc limit 1;
    v_hash:=encode(
      extensions.digest(
        convert_to(
          rec.entrepreneur_id::text||':'||rec.event_count::text||':'||
          coalesce(rec.coverage_started_at::text,'')||':'||v_configuration::text,
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    );

    insert into intelligence.behavior_score_snapshots(
      owner_organization_id,entrepreneur_id,score_version_id,raw_score,total_score,dimensions,
      classification,confidence,event_count,coverage_started_at,calculated_at,input_snapshot_hash,
      configuration_id,configuration_snapshot
    ) values (
      p_organization_id,rec.entrepreneur_id,v_score_version_id,round(v_raw_score,2),round(v_total_score,2),
      v_dimensions,v_classification,least(1.0,rec.event_count/v_confidence_events),rec.event_count,
      coalesce(rec.coverage_started_at,now()),now(),v_hash,v_configuration_id,v_configuration
    )
    on conflict(entrepreneur_id,score_version_id) do update set
      raw_score=excluded.raw_score,total_score=excluded.total_score,dimensions=excluded.dimensions,
      classification=excluded.classification,confidence=excluded.confidence,event_count=excluded.event_count,
      coverage_started_at=excluded.coverage_started_at,calculated_at=excluded.calculated_at,
      input_snapshot_hash=excluded.input_snapshot_hash,configuration_id=excluded.configuration_id,
      configuration_snapshot=excluded.configuration_snapshot;

    insert into intelligence.behavior_score_history(
      owner_organization_id,entrepreneur_id,score_version_id,configuration_id,raw_score,total_score,
      dimensions,classification,confidence,event_count,input_snapshot_hash
    ) values (
      p_organization_id,rec.entrepreneur_id,v_score_version_id,v_configuration_id,round(v_raw_score,2),
      round(v_total_score,2),v_dimensions,v_classification,
      least(1.0,rec.event_count/v_confidence_events),rec.event_count,v_hash
    );
    v_count:=v_count+1;
  end loop;
  return v_count;
end;
$function$;

insert into intelligence.behavior_score_configurations(owner_organization_id,configuration,updated_by)
select sd.owner_organization_id,app_private.default_behavior_score_configuration(),
  coalesce((
    select membership.user_account_id
    from iam.organization_memberships membership
    where membership.organization_id=sd.owner_organization_id and membership.status='active'
    order by membership.created_at limit 1
  ),(
    select id from iam.user_accounts where status='active' order by created_at limit 1
  ))
from intelligence.score_definitions sd
where sd.code='behavioral_engagement_v1'
on conflict(owner_organization_id) do nothing;

commit;
