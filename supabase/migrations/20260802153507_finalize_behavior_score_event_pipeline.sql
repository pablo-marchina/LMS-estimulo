begin;

create index if not exists ix_eventing_events_organization_actor_occurred
  on eventing.events(organization_id,actor_id,occurred_at desc)
  where actor_id is not null;

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

  select score_version.id into v_score_version_id
    from intelligence.score_versions score_version
    join intelligence.score_definitions score_definition
      on score_definition.id=score_version.score_definition_id
    where score_definition.owner_organization_id=p_organization_id
      and score_definition.code='behavioral_engagement_v1'
      and score_version.status='published'
    order by score_version.version_number desc
    limit 1;
  if v_score_version_id is null then
    raise exception 'BEHAVIOR_SCORE_MODEL_NOT_FOUND' using errcode='P0002';
  end if;

  v_formula:=v_configuration->>'formula';
  v_norm_min:=(v_configuration#>>'{normalization,minimum}')::numeric;
  v_norm_max:=(v_configuration#>>'{normalization,maximum}')::numeric;
  v_confidence_events:=(v_configuration#>>'{confidence,events_for_full_confidence}')::numeric;

  for rec in
    with target_entrepreneurs as (
      select entrepreneur.id,entrepreneur.user_account_id
      from core.entrepreneurs entrepreneur
      where entrepreneur.status='active'
        and (p_entrepreneur_id is null or entrepreneur.id=p_entrepreneur_id)
    ),
    normalized_events as (
      select
        event.event_id,
        event.actor_id,
        event.occurred_at,
        app_private.behavior_score_interaction_type(event.event_name,event.payload) as interaction_type
      from target_entrepreneurs target
      join eventing.events event
        on event.actor_id=target.user_account_id
       and event.organization_id=p_organization_id
    ),
    scored_events as (
      select * from normalized_events where interaction_type is not null
    )
    select
      target.id as entrepreneur_id,
      target.user_account_id,
      count(scored_event.event_id)::bigint as event_count,
      min(scored_event.occurred_at) as coverage_started_at,
      max(scored_event.occurred_at) as latest_event_at,
      count(distinct scored_event.occurred_at::date)::numeric as active_days,
      count(*) filter(where scored_event.interaction_type in ('page_view','content_view','video_progress','library_open','discussion_contribution'))::numeric as depth_events,
      count(*) filter(where scored_event.interaction_type in ('content_complete','activity_complete','delivery_submit','diagnostic_complete','path_complete','journey_complete','external_credential_complete'))::numeric as completion_events,
      count(*) filter(where scored_event.interaction_type in ('search','library_open','b2b_open','reward_view','discussion_contribution','feedback_submit'))::numeric as autonomy_events,
      count(distinct date_trunc('week',scored_event.occurred_at))::numeric as active_weeks,
      coalesce((
        select avg(submission.final_score)
        from assessment.delivery_submissions submission
        where submission.entrepreneur_id=target.id and submission.final_score is not null
      ),0)::numeric as quality_average
    from target_entrepreneurs target
    left join scored_events scored_event on scored_event.actor_id=target.user_account_id
    group by target.id,target.user_account_id
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
      v_value:=least((v_dimension->>'cap')::numeric,greatest(0,v_metric*(v_dimension->>'multiplier')::numeric+coalesce((v_dimension->>'offset')::numeric,0)));
      v_weight:=(v_dimension->>'weight')::numeric;
      v_dimensions:=v_dimensions||jsonb_build_object(v_dimension->>'code',round(v_value,2));
      v_weighted_sum:=v_weighted_sum+(v_value*v_weight);
      v_weight_total:=v_weight_total+v_weight;
    end loop;

    if v_weight_total<=0 then raise exception 'BEHAVIOR_WEIGHT_TOTAL_INVALID' using errcode='22023'; end if;
    v_raw_score:=case when v_formula='weighted_sum' then v_weighted_sum else v_weighted_sum/v_weight_total end;
    v_total_score:=least(100,greatest(0,((v_raw_score-v_norm_min)/(v_norm_max-v_norm_min))*100));
    select classification->>'label' into v_classification
      from jsonb_array_elements(v_configuration->'classifications') classification
      where v_total_score between (classification->>'minimum')::numeric and (classification->>'maximum')::numeric
      order by (classification->>'minimum')::numeric desc limit 1;
    v_hash:=encode(extensions.digest(convert_to(jsonb_build_object(
      'entrepreneur_id',rec.entrepreneur_id,'event_count',rec.event_count,
      'coverage_started_at',rec.coverage_started_at,'latest_event_at',rec.latest_event_at,
      'active_days',rec.active_days,'depth_events',rec.depth_events,
      'completion_events',rec.completion_events,'autonomy_events',rec.autonomy_events,
      'active_weeks',rec.active_weeks,'quality_average',rec.quality_average,
      'configuration',v_configuration
    )::text,'UTF8'),'sha256'),'hex');

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

create or replace function public.perform_participant_extension(
  p_actor_user_account_id uuid,
  p_action text,
  p_payload jsonb,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
begin
  return public.perform_participant_extension_before_continuous_behavior_score(
    p_actor_user_account_id,p_action,p_payload,p_idempotency_key
  );
end;
$function$;

create or replace function app_private.recalculate_behavior_score_after_domain_event()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_entrepreneur_id uuid;
begin
  if new.organization_id is null
    or new.actor_id is null
    or app_private.behavior_score_interaction_type(new.event_name,new.payload) is null then
    return new;
  end if;

  select entrepreneur.id into v_entrepreneur_id
    from core.entrepreneurs entrepreneur
    where entrepreneur.user_account_id=new.actor_id and entrepreneur.status='active'
    order by entrepreneur.created_at
    limit 1;

  if v_entrepreneur_id is null then return new; end if;

  begin
    perform app_private.recalculate_behavior_scores(new.organization_id,v_entrepreneur_id);
  exception
    when others then
      raise warning 'BEHAVIOR_SCORE_RECALCULATION_FAILED event_id=% event_name=% sqlstate=% message=%',
        new.event_id,new.event_name,sqlstate,sqlerrm;
  end;
  return new;
end;
$function$;

revoke all on function public.perform_participant_extension(uuid,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.perform_participant_extension(uuid,text,jsonb,text) to service_role;
revoke all on function app_private.recalculate_behavior_score_after_domain_event() from public,anon,authenticated;
grant execute on function app_private.recalculate_behavior_score_after_domain_event() to service_role;

commit;
