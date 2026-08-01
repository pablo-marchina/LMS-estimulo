-- Corrige avaliação de utilidade e verificação rápida conforme o progresso real da aula.

create or replace function app_private.e14_validate_f(a uuid, b uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  x jsonb;
  v_required_assets integer;
  v_completed_required_assets integer;
begin
  x := app_private.e14_context_f(b);
  if x is null then
    raise exception 'RESOURCE_NOT_FOUND' using errcode='P0002';
  end if;
  if app_private.e14_entrepreneur_for_account(a) is distinct from (x->>'person')::uuid then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  if x->>'state' not in ('in_progress','completed') then
    raise exception 'ACTIVITY_INCOMPLETE' using errcode='P0001';
  end if;

  select
    count(*) filter (where ca.is_required),
    count(*) filter (where ca.is_required and aap.completed_at is not null)
  into v_required_assets, v_completed_required_assets
  from orchestration.step_instances si
  left join catalog.content_assets ca on ca.activity_version_id = si.activity_version_id
  left join orchestration.activity_asset_progress aap
    on aap.step_instance_id = si.id
   and aap.content_asset_id = ca.id
  where si.id = b;

  if coalesce(v_completed_required_assets, 0) < coalesce(v_required_assets, 0) then
    raise exception 'ACTIVITY_REQUIRED_CONTENT_INCOMPLETE' using errcode='P0001';
  end if;

  return x;
end;
$function$;

create or replace function public.rate_activity_utility(
  p_actor_user_account_id uuid,
  p_step_instance_id uuid,
  p_rating integer,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_journey_instance_id uuid;
  v_organization_id uuid;
  v_entrepreneur_id uuid;
  v_actor_entrepreneur_id uuid;
  v_activity_version_id uuid;
  v_step_status text;
  v_request_hash text;
  v_prior engagement.activity_utility_rating_revisions%rowtype;
  v_revision integer;
  v_event_id uuid;
  v_revision_id uuid;
  v_created_at timestamptz:=clock_timestamp();
  v_context jsonb;
  v_snapshot jsonb;
begin
  perform app_private.e14_validate_idempotency_key(p_idempotency_key);
  if p_rating is null or p_rating not between 1 and 5 then
    raise exception 'ACTIVITY_UTILITY_RATING_INVALID' using errcode='22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('activity-utility:'||p_actor_user_account_id::text||':'||p_step_instance_id::text,0));

  select pa.journey_instance_id,app_private.journey_owner_organization_id(pa.journey_instance_id),en.entrepreneur_id,si.activity_version_id,si.status
  into v_journey_instance_id,v_organization_id,v_entrepreneur_id,v_activity_version_id,v_step_status
  from orchestration.step_instances si
  join orchestration.path_assignments pa on pa.id=si.path_assignment_id
  join orchestration.journey_instances ji on ji.id=pa.journey_instance_id
  join orchestration.enrollments en on en.id=ji.enrollment_id
  where si.id=p_step_instance_id;

  if v_journey_instance_id is null then raise exception 'ACTIVITY_STEP_NOT_FOUND' using errcode='P0002'; end if;
  v_actor_entrepreneur_id:=app_private.e14_entrepreneur_for_account(p_actor_user_account_id);
  if v_actor_entrepreneur_id is null or v_actor_entrepreneur_id<>v_entrepreneur_id then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if v_step_status not in ('in_progress','completed') then raise exception 'ACTIVITY_UTILITY_RATING_NOT_AVAILABLE' using errcode='55000'; end if;

  v_request_hash:=app_private.e14_request_hash(jsonb_build_object('step_instance_id',p_step_instance_id,'rating',p_rating));
  select * into v_prior from engagement.activity_utility_rating_revisions where actor_user_account_id=p_actor_user_account_id and idempotency_key=p_idempotency_key;
  if found then
    if v_prior.request_hash<>v_request_hash then raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode='23505'; end if;
    return jsonb_build_object('request_id',v_prior.event_id,'idempotency_key',p_idempotency_key,'replayed',true,'data',v_prior.result_snapshot);
  end if;

  select coalesce(max(r.revision),0)+1 into v_revision from engagement.activity_utility_rating_revisions r where r.step_instance_id=p_step_instance_id and r.actor_user_account_id=p_actor_user_account_id;
  v_event_id:=app_private.e14_command_event_id('rate_activity_utility',p_actor_user_account_id,p_step_instance_id,p_idempotency_key);
  v_revision_id:=app_private.e14_deterministic_uuid('activity-utility-rating:'||p_actor_user_account_id::text||':'||p_idempotency_key);
  v_context:=jsonb_build_object('surface','activity','step_status',v_step_status,'collection_purpose','perceived_utility','credit_use','forbidden','crm_sync_status','not_synced_pending_signal_catalog_approval');
  v_snapshot:=jsonb_build_object('step_instance_id',p_step_instance_id,'activity_version_id',v_activity_version_id,'rating',p_rating,'revision',v_revision,'updated_at',v_created_at);

  perform app_private.e14_append_event(
    v_event_id,'learning.activity.utility.rated','entrepreneur',v_entrepreneur_id,
    'user_account',p_actor_user_account_id,v_organization_id,v_journey_instance_id,
    'activity_utility_rating',app_private.e14_deterministic_uuid('activity-utility-rating-current:'||p_actor_user_account_id::text||':'||p_step_instance_id::text),
    v_revision,v_event_id,null,
    jsonb_build_object('step_instance_id',p_step_instance_id,'activity_version_id',v_activity_version_id,'rating',p_rating,'revision',v_revision,'crm_sync_status','not_synced_pending_signal_catalog_approval')
  );

  insert into engagement.activity_utility_rating_revisions(
    id,step_instance_id,actor_user_account_id,organization_id,journey_instance_id,
    entrepreneur_id,activity_version_id,rating,revision,idempotency_key,request_hash,
    event_id,context,result_snapshot,created_at
  ) values(
    v_revision_id,p_step_instance_id,p_actor_user_account_id,v_organization_id,v_journey_instance_id,
    v_entrepreneur_id,v_activity_version_id,p_rating,v_revision,p_idempotency_key,v_request_hash,
    v_event_id,v_context,v_snapshot,v_created_at
  );

  insert into engagement.activity_utility_ratings(
    step_instance_id,actor_user_account_id,organization_id,journey_instance_id,
    entrepreneur_id,activity_version_id,rating,revision,latest_event_id,updated_at
  ) values(
    p_step_instance_id,p_actor_user_account_id,v_organization_id,v_journey_instance_id,
    v_entrepreneur_id,v_activity_version_id,p_rating,v_revision,v_event_id,v_created_at
  )
  on conflict (step_instance_id,actor_user_account_id) do update
    set rating=excluded.rating,revision=excluded.revision,latest_event_id=excluded.latest_event_id,updated_at=excluded.updated_at;

  return jsonb_build_object('request_id',v_event_id,'idempotency_key',p_idempotency_key,'replayed',false,'data',v_snapshot);
end;
$function$;
