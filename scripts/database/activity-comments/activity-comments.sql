\set ON_ERROR_STOP on

create table engagement.activity_comments (
  id uuid primary key,
  organization_id uuid not null references iam.organizations(id),
  journey_instance_id uuid not null references orchestration.journey_instances(id),
  step_instance_id uuid not null references orchestration.step_instances(id),
  author_user_account_id uuid not null references iam.user_accounts(id),
  body text not null,
  status text not null default 'visible',
  aggregate_version bigint not null default 1,
  idempotency_key text not null,
  request_hash text not null,
  creation_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  moderated_by_user_account_id uuid references iam.user_accounts(id),
  moderated_at timestamptz,
  moderation_reason text,
  constraint activity_comments_status_check check (status in ('visible', 'hidden')),
  constraint activity_comments_body_check check (
    char_length(body) between 1 and 2000
    and body = btrim(body)
  ),
  constraint activity_comments_aggregate_version_check check (aggregate_version > 0),
  constraint activity_comments_idempotency_unique unique (author_user_account_id, idempotency_key)
);

create index activity_comments_step_created_idx
  on engagement.activity_comments(step_instance_id, created_at, id);
create index activity_comments_organization_status_created_idx
  on engagement.activity_comments(organization_id, status, created_at desc);

alter table engagement.activity_comments enable row level security;
alter table engagement.activity_comments force row level security;
revoke all on engagement.activity_comments from public, anon, authenticated;

create table engagement.activity_comment_moderations (
  id uuid primary key,
  comment_id uuid not null references engagement.activity_comments(id),
  organization_id uuid not null references iam.organizations(id),
  actor_user_account_id uuid not null references iam.user_accounts(id),
  from_status text not null,
  to_status text not null,
  reason text,
  changed boolean not null,
  idempotency_key text not null,
  request_hash text not null,
  result_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  constraint activity_comment_moderations_status_check check (
    from_status in ('visible', 'hidden') and to_status in ('visible', 'hidden')
  ),
  constraint activity_comment_moderations_reason_check check (
    to_status <> 'hidden' or nullif(btrim(reason), '') is not null
  ),
  constraint activity_comment_moderations_idempotency_unique unique (actor_user_account_id, idempotency_key)
);

create index activity_comment_moderations_comment_created_idx
  on engagement.activity_comment_moderations(comment_id, created_at desc);

alter table engagement.activity_comment_moderations enable row level security;
alter table engagement.activity_comment_moderations force row level security;
revoke all on engagement.activity_comment_moderations from public, anon, authenticated;

with schemas(event_name, schema_document) as (
  values
  (
    'learning.activity.comment.created',
    '{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","additionalProperties":true,"required":["comment_id","step_instance_id","body_length","status"],"properties":{"comment_id":{"type":"string","format":"uuid"},"step_instance_id":{"type":"string","format":"uuid"},"body_length":{"type":"integer","minimum":1,"maximum":2000},"status":{"const":"visible"}}}'::jsonb
  ),
  (
    'learning.activity.comment.moderated',
    '{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","additionalProperties":true,"required":["comment_id","from_status","to_status","changed","reason_present"],"properties":{"comment_id":{"type":"string","format":"uuid"},"from_status":{"enum":["visible","hidden"]},"to_status":{"enum":["visible","hidden"]},"changed":{"type":"boolean"},"reason_present":{"type":"boolean"}}}'::jsonb
  )
)
insert into eventing.event_schemas(
  id, event_name, event_version, schema_uri, schema_document, schema_hash, status, published_at
)
select
  app_private.e14_deterministic_uuid('event-schema:' || event_name || ':1'),
  event_name,
  1,
  'urn:estimulo:event:' || event_name || ':1',
  schema_document,
  app_private.e14_request_hash(schema_document),
  'published',
  now()
from schemas
on conflict (event_name, event_version) do nothing;

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

  select
    ji.id,
    app_private.journey_owner_organization_id(ji.id),
    en.entrepreneur_id
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

  v_request_hash := app_private.e14_request_hash(jsonb_build_object(
    'step_instance_id', p_step_instance_id,
    'body', v_body
  ));

  select * into v_comment
  from engagement.activity_comments
  where author_user_account_id = p_actor_user_account_id
    and idempotency_key = p_idempotency_key;

  if found then
    if v_comment.request_hash <> v_request_hash then
      raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode = '23505';
    end if;
    return jsonb_build_object(
      'request_id', app_private.e14_command_event_id(
        'create_activity_comment', p_actor_user_account_id, p_step_instance_id, p_idempotency_key
      ),
      'idempotency_key', p_idempotency_key,
      'replayed', true,
      'data', v_comment.creation_snapshot
    );
  end if;

  select coalesce(
    e.preferred_name,
    e.legal_name,
    split_part(ua.email_normalized, '@', 1),
    'Participante'
  ) into v_author_name
  from iam.user_accounts ua
  left join core.entrepreneurs e on e.user_account_id = ua.id
  where ua.id = p_actor_user_account_id;

  v_comment_id := app_private.e14_deterministic_uuid(
    'activity-comment:' || p_actor_user_account_id::text || ':' || p_idempotency_key
  );
  v_created_at := clock_timestamp();
  v_snapshot := jsonb_build_object(
    'id', v_comment_id,
    'step_instance_id', p_step_instance_id,
    'author_name', v_author_name,
    'body', v_body,
    'status', 'visible',
    'created_at', v_created_at,
    'is_own', true
  );

  insert into engagement.activity_comments(
    id, organization_id, journey_instance_id, step_instance_id,
    author_user_account_id, body, status, aggregate_version,
    idempotency_key, request_hash, creation_snapshot, created_at, updated_at
  ) values (
    v_comment_id, v_organization_id, v_journey_instance_id, p_step_instance_id,
    p_actor_user_account_id, v_body, 'visible', 1,
    p_idempotency_key, v_request_hash, v_snapshot, v_created_at, v_created_at
  ) returning * into v_comment;

  v_event_id := app_private.e14_command_event_id(
    'create_activity_comment', p_actor_user_account_id, p_step_instance_id, p_idempotency_key
  );
  perform app_private.e14_append_event(
    v_event_id,
    'learning.activity.comment.created',
    'user_account',
    p_actor_user_account_id,
    'user_account',
    p_actor_user_account_id,
    v_organization_id,
    v_journey_instance_id,
    'activity_comment',
    v_comment.id,
    v_comment.aggregate_version,
    v_event_id,
    null,
    jsonb_build_object(
      'comment_id', v_comment.id,
      'step_instance_id', p_step_instance_id,
      'body_length', char_length(v_body),
      'status', 'visible'
    )
  );

  return jsonb_build_object(
    'request_id', v_event_id,
    'idempotency_key', p_idempotency_key,
    'replayed', false,
    'data', v_snapshot
  );
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
  select
    ji.id,
    app_private.journey_owner_organization_id(ji.id),
    en.entrepreneur_id
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
  if not (
    v_actor_entrepreneur_id is not null
    and v_actor_entrepreneur_id = v_enrolled_entrepreneur_id
  ) and not app_private.e14_actor_has_permission(
    p_actor_user_account_id,
    v_organization_id,
    'journey.execution.read'
  ) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', c.id,
      'step_instance_id', c.step_instance_id,
      'author_name', coalesce(
        e.preferred_name,
        e.legal_name,
        split_part(ua.email_normalized, '@', 1),
        'Participante'
      ),
      'body', c.body,
      'status', c.status,
      'created_at', c.created_at,
      'is_own', c.author_user_account_id = p_actor_user_account_id
    ) order by c.created_at, c.id
  ), '[]'::jsonb)
  into v_comments
  from engagement.activity_comments c
  join iam.user_accounts ua on ua.id = c.author_user_account_id
  left join core.entrepreneurs e on e.user_account_id = ua.id
  where c.step_instance_id = p_step_instance_id
    and c.status = 'visible';

  return jsonb_build_object(
    'step_instance_id', p_step_instance_id,
    'comments', v_comments
  );
end;
$$;

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
  if not app_private.e14_actor_has_permission(
    p_actor_user_account_id,
    p_organization_id,
    'engagement.manage'
  ) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(x.comment order by x.created_at desc), '[]'::jsonb)
  into v_comments
  from (
    select
      c.created_at,
      jsonb_build_object(
        'id', c.id,
        'organization_id', c.organization_id,
        'journey_instance_id', c.journey_instance_id,
        'step_instance_id', c.step_instance_id,
        'activity_title', av.title,
        'author_name', coalesce(
          e.preferred_name,
          e.legal_name,
          split_part(ua.email_normalized, '@', 1),
          'Participante'
        ),
        'body', c.body,
        'status', c.status,
        'aggregate_version', c.aggregate_version,
        'created_at', c.created_at,
        'moderated_at', c.moderated_at,
        'moderation_reason', c.moderation_reason
      ) as comment
    from engagement.activity_comments c
    join orchestration.step_instances si on si.id = c.step_instance_id
    join catalog.activity_versions av on av.id = si.activity_version_id
    join iam.user_accounts ua on ua.id = c.author_user_account_id
    left join core.entrepreneurs e on e.user_account_id = ua.id
    where c.organization_id = p_organization_id
    order by c.created_at desc
    limit v_limit
  ) x;

  return jsonb_build_object(
    'organization_id', p_organization_id,
    'comments', v_comments
  );
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
  v_target_status text := lower(btrim(coalesce(p_status, '')));
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
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

  if v_target_status not in ('visible', 'hidden') then
    raise exception 'ACTIVITY_COMMENT_STATUS_INVALID' using errcode = '22023';
  end if;
  if v_target_status = 'hidden' and v_reason is null then
    raise exception 'ACTIVITY_COMMENT_MODERATION_REASON_REQUIRED' using errcode = '22023';
  end if;
  if v_reason is not null and char_length(v_reason) > 500 then
    raise exception 'ACTIVITY_COMMENT_MODERATION_REASON_INVALID' using errcode = '22023';
  end if;

  if not app_private.e14_actor_has_permission(
    p_actor_user_account_id,
    p_organization_id,
    'engagement.manage'
  ) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  v_request_hash := app_private.e14_request_hash(jsonb_build_object(
    'comment_id', p_comment_id,
    'status', v_target_status,
    'reason', v_reason
  ));

  select * into v_moderation
  from engagement.activity_comment_moderations
  where actor_user_account_id = p_actor_user_account_id
    and idempotency_key = p_idempotency_key;

  if found then
    if v_moderation.request_hash <> v_request_hash then
      raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode = '23505';
    end if;
    return jsonb_build_object(
      'request_id', app_private.e14_command_event_id(
        'moderate_activity_comment', p_actor_user_account_id, p_comment_id, p_idempotency_key
      ),
      'idempotency_key', p_idempotency_key,
      'replayed', true,
      'data', v_moderation.result_snapshot
    );
  end if;

  select * into v_comment
  from engagement.activity_comments
  where id = p_comment_id
    and organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'ACTIVITY_COMMENT_NOT_FOUND' using errcode = 'P0002';
  end if;

  select coalesce(
    e.preferred_name,
    e.legal_name,
    split_part(ua.email_normalized, '@', 1),
    'Participante'
  ) into v_author_name
  from iam.user_accounts ua
  left join core.entrepreneurs e on e.user_account_id = ua.id
  where ua.id = v_comment.author_user_account_id;

  v_from_status := v_comment.status;
  v_changed := v_from_status <> v_target_status;

  if v_changed then
    update engagement.activity_comments
    set
      status = v_target_status,
      aggregate_version = aggregate_version + 1,
      updated_at = clock_timestamp(),
      moderated_by_user_account_id = p_actor_user_account_id,
      moderated_at = clock_timestamp(),
      moderation_reason = case when v_target_status = 'hidden' then v_reason else null end
    where id = p_comment_id
    returning * into v_comment;
  end if;

  v_result := jsonb_build_object(
    'id', v_comment.id,
    'author_name', v_author_name,
    'body', v_comment.body,
    'status', v_comment.status,
    'aggregate_version', v_comment.aggregate_version,
    'created_at', v_comment.created_at,
    'moderated_at', v_comment.moderated_at,
    'moderation_reason', v_comment.moderation_reason,
    'changed', v_changed
  );

  v_moderation_id := app_private.e14_deterministic_uuid(
    'activity-comment-moderation:' || p_actor_user_account_id::text || ':' || p_idempotency_key
  );
  insert into engagement.activity_comment_moderations(
    id, comment_id, organization_id, actor_user_account_id,
    from_status, to_status, reason, changed,
    idempotency_key, request_hash, result_snapshot
  ) values (
    v_moderation_id, p_comment_id, p_organization_id, p_actor_user_account_id,
    v_from_status, v_target_status, v_reason, v_changed,
    p_idempotency_key, v_request_hash, v_result
  );

  v_event_id := app_private.e14_command_event_id(
    'moderate_activity_comment', p_actor_user_account_id, p_comment_id, p_idempotency_key
  );
  perform app_private.e14_append_event(
    v_event_id,
    'learning.activity.comment.moderated',
    'user_account',
    v_comment.author_user_account_id,
    'user_account',
    p_actor_user_account_id,
    v_comment.organization_id,
    v_comment.journey_instance_id,
    'activity_comment',
    v_comment.id,
    v_comment.aggregate_version,
    v_event_id,
    null,
    jsonb_build_object(
      'comment_id', v_comment.id,
      'from_status', v_from_status,
      'to_status', v_target_status,
      'changed', v_changed,
      'reason_present', v_reason is not null
    )
  );

  return jsonb_build_object(
    'request_id', v_event_id,
    'idempotency_key', p_idempotency_key,
    'replayed', false,
    'data', v_result
  );
end;
$$;

revoke all on function public.create_activity_comment(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.list_activity_comments(uuid, uuid) from public, anon, authenticated;
revoke all on function public.list_operator_activity_comments(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.moderate_activity_comment(uuid, uuid, uuid, text, text, text) from public, anon, authenticated;

grant execute on function public.create_activity_comment(uuid, uuid, text, text) to service_role, app_worker;
grant execute on function public.list_activity_comments(uuid, uuid) to service_role, app_worker;
grant execute on function public.list_operator_activity_comments(uuid, uuid, integer) to service_role, app_worker;
grant execute on function public.moderate_activity_comment(uuid, uuid, uuid, text, text, text) to service_role, app_worker;
