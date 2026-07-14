-- Materialized from Supabase migration 20260714184752.
-- Remote name: activity_comments_participant_api
-- Corrections require a new migration.

create or replace function public.create_activity_comment(
  p_actor_user_account_id uuid,
  p_step_instance_id uuid,
  p_body text,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_body text := btrim(coalesce(p_body, ''));
  v_request_hash text;
  v_comment engagement.activity_comments%rowtype;
  v_journey_instance_id uuid;
  v_organization_id uuid;
  v_enrolled_entrepreneur_id uuid;
  v_actor_entrepreneur_id uuid;
  v_event_id uuid;
  v_comment_id uuid;
  v_created_at timestamptz;
  v_author_name text;
  v_snapshot jsonb;
begin
  perform app_private.e14_validate_idempotency_key(p_idempotency_key);
  if char_length(v_body) < 1 or char_length(v_body) > 2000 then
    raise exception 'ACTIVITY_COMMENT_BODY_INVALID' using errcode = '22023';
  end if;

  select ji.id, app_private.journey_owner_organization_id(ji.id), en.entrepreneur_id
  into v_journey_instance_id, v_organization_id, v_enrolled_entrepreneur_id
  from orchestration.step_instances si
  join orchestration.path_assignments pa on pa.id = si.path_assignment_id
  join orchestration.journey_instances ji on ji.id = pa.journey_instance_id
  join orchestration.enrollments en on en.id = ji.enrollment_id
  where si.id = p_step_instance_id;

  if v_journey_instance_id is null or v_organization_id is null then
    raise exception 'ACTIVITY_STEP_NOT_FOUND' using errcode = 'P0002';
  end if;

  v_actor_entrepreneur_id := app_private.e14_entrepreneur_for_account(p_actor_user_account_id);
  if v_actor_entrepreneur_id is null or v_actor_entrepreneur_id <> v_enrolled_entrepreneur_id then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  v_request_hash := app_private.e14_request_hash(jsonb_build_object('step_instance_id',p_step_instance_id,'body',v_body));
  select * into v_comment from engagement.activity_comments
  where author_user_account_id = p_actor_user_account_id and idempotency_key = p_idempotency_key;

  if found then
    if v_comment.request_hash <> v_request_hash then
      raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode = '23505';
    end if;
    return jsonb_build_object(
      'request_id',app_private.e14_command_event_id('create_activity_comment',p_actor_user_account_id,p_step_instance_id,p_idempotency_key),
      'idempotency_key',p_idempotency_key,'replayed',true,'data',v_comment.creation_snapshot
    );
  end if;

  select coalesce(e.preferred_name,e.legal_name,split_part(ua.email_normalized,'@',1),'Participante')
  into v_author_name
  from iam.user_accounts ua left join core.entrepreneurs e on e.user_account_id=ua.id
  where ua.id=p_actor_user_account_id;

  v_comment_id := app_private.e14_deterministic_uuid('activity-comment:'||p_actor_user_account_id::text||':'||p_idempotency_key);
  v_created_at := clock_timestamp();
  v_snapshot := jsonb_build_object(
    'id',v_comment_id,'step_instance_id',p_step_instance_id,'author_name',v_author_name,
    'body',v_body,'status','visible','created_at',v_created_at,'is_own',true
  );

  insert into engagement.activity_comments(
    id,organization_id,journey_instance_id,step_instance_id,author_user_account_id,
    body,status,aggregate_version,idempotency_key,request_hash,creation_snapshot,created_at,updated_at
  ) values (
    v_comment_id,v_organization_id,v_journey_instance_id,p_step_instance_id,p_actor_user_account_id,
    v_body,'visible',1,p_idempotency_key,v_request_hash,v_snapshot,v_created_at,v_created_at
  ) returning * into v_comment;

  v_event_id := app_private.e14_command_event_id('create_activity_comment',p_actor_user_account_id,p_step_instance_id,p_idempotency_key);
  perform app_private.e14_append_event(
    v_event_id,'learning.activity.comment.created','user_account',p_actor_user_account_id,
    'user_account',p_actor_user_account_id,v_organization_id,v_journey_instance_id,
    'activity_comment',v_comment.id,v_comment.aggregate_version,v_event_id,null,
    jsonb_build_object('comment_id',v_comment.id,'step_instance_id',p_step_instance_id,'body_length',char_length(v_body),'status','visible')
  );

  return jsonb_build_object('request_id',v_event_id,'idempotency_key',p_idempotency_key,'replayed',false,'data',v_snapshot);
end;
$$;

create or replace function public.list_activity_comments(
  p_actor_user_account_id uuid,
  p_step_instance_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  v_journey_instance_id uuid;
  v_organization_id uuid;
  v_enrolled_entrepreneur_id uuid;
  v_actor_entrepreneur_id uuid;
  v_comments jsonb;
begin
  select ji.id, app_private.journey_owner_organization_id(ji.id), en.entrepreneur_id
  into v_journey_instance_id, v_organization_id, v_enrolled_entrepreneur_id
  from orchestration.step_instances si
  join orchestration.path_assignments pa on pa.id = si.path_assignment_id
  join orchestration.journey_instances ji on ji.id = pa.journey_instance_id
  join orchestration.enrollments en on en.id = ji.enrollment_id
  where si.id = p_step_instance_id;

  if v_journey_instance_id is null or v_organization_id is null then
    raise exception 'ACTIVITY_STEP_NOT_FOUND' using errcode = 'P0002';
  end if;

  v_actor_entrepreneur_id := app_private.e14_entrepreneur_for_account(p_actor_user_account_id);
  if not (v_actor_entrepreneur_id is not null and v_actor_entrepreneur_id=v_enrolled_entrepreneur_id)
     and not app_private.e14_actor_has_permission(p_actor_user_account_id,v_organization_id,'journey.execution.read') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',c.id,'step_instance_id',c.step_instance_id,
    'author_name',coalesce(e.preferred_name,e.legal_name,split_part(ua.email_normalized,'@',1),'Participante'),
    'body',c.body,'status',c.status,'created_at',c.created_at,
    'is_own',c.author_user_account_id=p_actor_user_account_id
  ) order by c.created_at,c.id),'[]'::jsonb)
  into v_comments
  from engagement.activity_comments c
  join iam.user_accounts ua on ua.id=c.author_user_account_id
  left join core.entrepreneurs e on e.user_account_id=ua.id
  where c.step_instance_id=p_step_instance_id and c.status='visible';

  return jsonb_build_object('step_instance_id',p_step_instance_id,'comments',v_comments);
end;
$$;

revoke all on function public.create_activity_comment(uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.list_activity_comments(uuid,uuid) from public,anon,authenticated;
grant execute on function public.create_activity_comment(uuid,uuid,text,text) to service_role,app_worker;
grant execute on function public.list_activity_comments(uuid,uuid) to service_role,app_worker;
