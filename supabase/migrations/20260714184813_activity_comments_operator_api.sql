-- Materialized from Supabase migration 20260714184813.
-- Remote name: activity_comments_operator_api
-- Corrections require a new migration.

create or replace function public.list_operator_activity_comments(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_limit integer default 50
) returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  v_comments jsonb;
  v_limit integer := greatest(1, least(coalesce(p_limit, 50), 200));
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'engagement.manage') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(x.comment order by x.created_at desc),'[]'::jsonb)
  into v_comments
  from (
    select c.created_at,jsonb_build_object(
      'id',c.id,'organization_id',c.organization_id,'journey_instance_id',c.journey_instance_id,
      'step_instance_id',c.step_instance_id,'activity_title',av.title,
      'author_name',coalesce(e.preferred_name,e.legal_name,split_part(ua.email_normalized,'@',1),'Participante'),
      'body',c.body,'status',c.status,'aggregate_version',c.aggregate_version,'created_at',c.created_at,
      'moderated_at',c.moderated_at,'moderation_reason',c.moderation_reason
    ) as comment
    from engagement.activity_comments c
    join orchestration.step_instances si on si.id=c.step_instance_id
    join catalog.activity_versions av on av.id=si.activity_version_id
    join iam.user_accounts ua on ua.id=c.author_user_account_id
    left join core.entrepreneurs e on e.user_account_id=ua.id
    where c.organization_id=p_organization_id
    order by c.created_at desc
    limit v_limit
  ) x;

  return jsonb_build_object('organization_id',p_organization_id,'comments',v_comments);
end;
$$;

create or replace function public.moderate_activity_comment(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_comment_id uuid,
  p_status text,
  p_reason text,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_target_status text := lower(btrim(coalesce(p_status,'')));
  v_reason text := nullif(btrim(coalesce(p_reason,'')),'');
  v_request_hash text;
  v_comment engagement.activity_comments%rowtype;
  v_moderation engagement.activity_comment_moderations%rowtype;
  v_moderation_id uuid;
  v_event_id uuid;
  v_changed boolean;
  v_from_status text;
  v_author_name text;
  v_result jsonb;
begin
  perform app_private.e14_validate_idempotency_key(p_idempotency_key);
  if v_target_status not in ('visible','hidden') then
    raise exception 'ACTIVITY_COMMENT_STATUS_INVALID' using errcode='22023';
  end if;
  if v_target_status='hidden' and v_reason is null then
    raise exception 'ACTIVITY_COMMENT_MODERATION_REASON_REQUIRED' using errcode='22023';
  end if;
  if v_reason is not null and char_length(v_reason)>500 then
    raise exception 'ACTIVITY_COMMENT_MODERATION_REASON_INVALID' using errcode='22023';
  end if;
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'engagement.manage') then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;

  v_request_hash := app_private.e14_request_hash(jsonb_build_object('comment_id',p_comment_id,'status',v_target_status,'reason',v_reason));
  select * into v_moderation from engagement.activity_comment_moderations
  where actor_user_account_id=p_actor_user_account_id and idempotency_key=p_idempotency_key;

  if found then
    if v_moderation.request_hash<>v_request_hash then
      raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode='23505';
    end if;
    return jsonb_build_object(
      'request_id',app_private.e14_command_event_id('moderate_activity_comment',p_actor_user_account_id,p_comment_id,p_idempotency_key),
      'idempotency_key',p_idempotency_key,'replayed',true,'data',v_moderation.result_snapshot
    );
  end if;

  select * into v_comment from engagement.activity_comments
  where id=p_comment_id and organization_id=p_organization_id for update;
  if not found then
    raise exception 'ACTIVITY_COMMENT_NOT_FOUND' using errcode='P0002';
  end if;

  select coalesce(e.preferred_name,e.legal_name,split_part(ua.email_normalized,'@',1),'Participante')
  into v_author_name
  from iam.user_accounts ua left join core.entrepreneurs e on e.user_account_id=ua.id
  where ua.id=v_comment.author_user_account_id;

  v_from_status:=v_comment.status;
  v_changed:=v_from_status<>v_target_status;
  if v_changed then
    update engagement.activity_comments set
      status=v_target_status,
      aggregate_version=aggregate_version+1,
      updated_at=clock_timestamp(),
      moderated_by_user_account_id=p_actor_user_account_id,
      moderated_at=clock_timestamp(),
      moderation_reason=case when v_target_status='hidden' then v_reason else null end
    where id=p_comment_id returning * into v_comment;
  end if;

  v_result:=jsonb_build_object(
    'id',v_comment.id,'author_name',v_author_name,'body',v_comment.body,'status',v_comment.status,
    'aggregate_version',v_comment.aggregate_version,'created_at',v_comment.created_at,
    'moderated_at',v_comment.moderated_at,'moderation_reason',v_comment.moderation_reason,'changed',v_changed
  );

  v_moderation_id:=app_private.e14_deterministic_uuid('activity-comment-moderation:'||p_actor_user_account_id::text||':'||p_idempotency_key);
  insert into engagement.activity_comment_moderations(
    id,comment_id,organization_id,actor_user_account_id,from_status,to_status,reason,changed,
    idempotency_key,request_hash,result_snapshot
  ) values (
    v_moderation_id,p_comment_id,p_organization_id,p_actor_user_account_id,v_from_status,v_target_status,v_reason,v_changed,
    p_idempotency_key,v_request_hash,v_result
  );

  v_event_id:=app_private.e14_command_event_id('moderate_activity_comment',p_actor_user_account_id,p_comment_id,p_idempotency_key);
  perform app_private.e14_append_event(
    v_event_id,'learning.activity.comment.moderated','user_account',v_comment.author_user_account_id,
    'user_account',p_actor_user_account_id,v_comment.organization_id,v_comment.journey_instance_id,
    'activity_comment',v_comment.id,v_comment.aggregate_version,v_event_id,null,
    jsonb_build_object('comment_id',v_comment.id,'from_status',v_from_status,'to_status',v_target_status,'changed',v_changed,'reason_present',v_reason is not null)
  );

  return jsonb_build_object('request_id',v_event_id,'idempotency_key',p_idempotency_key,'replayed',false,'data',v_result);
end;
$$;

revoke all on function public.list_operator_activity_comments(uuid,uuid,integer) from public,anon,authenticated;
revoke all on function public.moderate_activity_comment(uuid,uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.list_operator_activity_comments(uuid,uuid,integer) to service_role,app_worker;
grant execute on function public.moderate_activity_comment(uuid,uuid,uuid,text,text,text) to service_role,app_worker;
