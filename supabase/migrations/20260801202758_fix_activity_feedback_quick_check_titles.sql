begin;

create or replace function app_private.e14_state_base(a uuid)
returns jsonb
language sql
stable
security definer
set search_path to 'pg_catalog'
as $function$
  select jsonb_build_object(
    'journey_instance_id',context.journey_instance_id,
    'journey_code',context.journey_code,
    'journey_title',coalesce(nullif(definition.name,''),version.title,context.journey_code),
    'journey_description',coalesce(definition.purpose,version.description),
    'journey_presentation',coalesce(version.configuration->'presentation','{}'::jsonb),
    'journey_version_number',context.version_number,
    'journey_version_id',context.journey_version_id,
    'journey_content_hash',context.content_hash,
    'journey_status',context.journey_status,
    'journey_aggregate_version',context.journey_version,
    'enrollment_status',context.enrollment_status,
    'entrepreneur_id',context.entrepreneur_id,
    'organization_id',context.owner_organization_id,
    'progress',coalesce(context.completion_ratio,0),
    'completed_required_steps',coalesce(context.completed_required_steps,0),
    'total_required_steps',coalesce(context.total_required_steps,0)
  )
  from app_private.e14_instance_context context
  join catalog.journey_versions version on version.id=context.journey_version_id
  join catalog.journey_definitions definition on definition.id=version.journey_definition_id
  where context.journey_instance_id=a
$function$;

create or replace function app_private.e14_validate_f(a uuid,b uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  x jsonb;
begin
  x:=app_private.e14_context_f(b);
  if x is null then
    raise exception 'RESOURCE_NOT_FOUND' using errcode='P0002';
  end if;
  if app_private.e14_entrepreneur_for_account(a) is distinct from (x->>'person')::uuid then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  if x->>'state'<>'in_progress' then
    raise exception 'ACTIVITY_INCOMPLETE' using errcode='P0001';
  end if;
  if exists(
    select 1
    from catalog.content_assets asset
    where asset.activity_version_id=(x->>'version')::uuid
      and asset.is_required
      and not exists(
        select 1
        from orchestration.activity_asset_progress progress
        where progress.step_instance_id=b
          and progress.content_asset_id=asset.id
          and progress.completed_at is not null
      )
  ) then
    raise exception 'ACTIVITY_INCOMPLETE' using errcode='P0001';
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

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('activity-utility:'||p_actor_user_account_id::text||':'||p_step_instance_id::text,0)
  );

  select assignment.journey_instance_id,
         app_private.journey_owner_organization_id(assignment.journey_instance_id),
         enrollment.entrepreneur_id,
         step.activity_version_id,
         step.status
  into v_journey_instance_id,v_organization_id,v_entrepreneur_id,v_activity_version_id,v_step_status
  from orchestration.step_instances step
  join orchestration.path_assignments assignment on assignment.id=step.path_assignment_id
  join orchestration.journey_instances instance on instance.id=assignment.journey_instance_id
  join orchestration.enrollments enrollment on enrollment.id=instance.enrollment_id
  where step.id=p_step_instance_id;

  if v_journey_instance_id is null then
    raise exception 'ACTIVITY_STEP_NOT_FOUND' using errcode='P0002';
  end if;
  v_actor_entrepreneur_id:=app_private.e14_entrepreneur_for_account(p_actor_user_account_id);
  if v_actor_entrepreneur_id is null or v_actor_entrepreneur_id<>v_entrepreneur_id then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  if v_step_status not in ('in_progress','completed') then
    raise exception 'ACTIVITY_UTILITY_RATING_NOT_AVAILABLE' using errcode='55000';
  end if;

  v_request_hash:=app_private.e14_request_hash(jsonb_build_object(
    'step_instance_id',p_step_instance_id,'rating',p_rating
  ));
  select * into v_prior
  from engagement.activity_utility_rating_revisions
  where actor_user_account_id=p_actor_user_account_id and idempotency_key=p_idempotency_key;
  if found then
    if v_prior.request_hash<>v_request_hash then
      raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode='23505';
    end if;
    return jsonb_build_object(
      'request_id',v_prior.event_id,'idempotency_key',p_idempotency_key,
      'replayed',true,'data',v_prior.result_snapshot
    );
  end if;

  select coalesce(max(revision.revision),0)+1 into v_revision
  from engagement.activity_utility_rating_revisions revision
  where revision.step_instance_id=p_step_instance_id
    and revision.actor_user_account_id=p_actor_user_account_id;
  v_event_id:=app_private.e14_command_event_id(
    'rate_activity_utility',p_actor_user_account_id,p_step_instance_id,p_idempotency_key
  );
  v_revision_id:=app_private.e14_deterministic_uuid(
    'activity-utility-rating:'||p_actor_user_account_id::text||':'||p_idempotency_key
  );
  v_context:=jsonb_build_object(
    'surface','activity',
    'step_status',v_step_status,
    'collection_purpose','perceived_utility',
    'credit_use','forbidden',
    'crm_sync_status','not_synced_pending_signal_catalog_approval'
  );
  v_snapshot:=jsonb_build_object(
    'step_instance_id',p_step_instance_id,
    'activity_version_id',v_activity_version_id,
    'rating',p_rating,
    'revision',v_revision,
    'updated_at',v_created_at
  );

  perform app_private.e14_append_event(
    v_event_id,'learning.activity.utility.rated','entrepreneur',v_entrepreneur_id,
    'user_account',p_actor_user_account_id,v_organization_id,v_journey_instance_id,
    'activity_utility_rating',app_private.e14_deterministic_uuid(
      'activity-utility-rating-current:'||p_actor_user_account_id::text||':'||p_step_instance_id::text
    ),v_revision,v_event_id,null,
    jsonb_build_object(
      'step_instance_id',p_step_instance_id,
      'activity_version_id',v_activity_version_id,
      'rating',p_rating,
      'revision',v_revision,
      'crm_sync_status','not_synced_pending_signal_catalog_approval'
    )
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
    set rating=excluded.rating,
        revision=excluded.revision,
        latest_event_id=excluded.latest_event_id,
        updated_at=excluded.updated_at;

  return jsonb_build_object(
    'request_id',v_event_id,'idempotency_key',p_idempotency_key,
    'replayed',false,'data',v_snapshot
  );
end;
$function$;

commit;
