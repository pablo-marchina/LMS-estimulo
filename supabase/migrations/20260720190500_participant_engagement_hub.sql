set lock_timeout = '5s';
set statement_timeout = '5min';

create table if not exists engagement.announcements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references iam.organizations(id) on delete restrict,
  title text not null,
  body text not null,
  cta_label text,
  cta_url text,
  status text not null default 'draft',
  priority integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid not null references iam.user_accounts(id) on delete restrict,
  updated_by uuid not null references iam.user_accounts(id) on delete restrict,
  aggregate_version bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_engagement_announcements_title check (length(trim(title)) between 2 and 120),
  constraint ck_engagement_announcements_body check (length(trim(body)) between 2 and 1200),
  constraint ck_engagement_announcements_cta_pair check ((cta_label is null)=(cta_url is null)),
  constraint ck_engagement_announcements_cta_label check (cta_label is null or length(trim(cta_label)) between 1 and 60),
  constraint ck_engagement_announcements_cta_url check (cta_url is null or cta_url ~ '^(https://|/)[^[:space:]]+$'),
  constraint ck_engagement_announcements_status check (status in ('draft','published','retired')),
  constraint ck_engagement_announcements_priority check (priority between -1000 and 1000),
  constraint ck_engagement_announcements_window check (ends_at is null or starts_at is null or ends_at>starts_at)
);

create index if not exists ix_engagement_announcements_active
  on engagement.announcements(organization_id,status,priority desc,starts_at,ends_at)
  where status='published';

alter table engagement.announcements enable row level security;

with schemas(event_name) as (
  values ('engagement.announcement.saved')
), documents as (
  select event_name,jsonb_build_object(
    '$schema','https://json-schema.org/draft/2020-12/schema',
    'title',event_name,
    'type','object',
    'additionalProperties',false,
    'required',jsonb_build_array('request_hash','result'),
    'properties',jsonb_build_object(
      'request_hash',jsonb_build_object('type','string'),
      'result',jsonb_build_object(
        'type','object',
        'additionalProperties',false,
        'required',jsonb_build_array('announcement_id','organization_id','status','aggregate_version'),
        'properties',jsonb_build_object(
          'announcement_id',jsonb_build_object('type','string','format','uuid'),
          'organization_id',jsonb_build_object('type','string','format','uuid'),
          'status',jsonb_build_object('type','string'),
          'aggregate_version',jsonb_build_object('type','integer','minimum',1)
        )
      )
    )
  ) as schema_document
  from schemas
)
insert into eventing.event_schemas(
  id,event_name,event_version,schema_uri,schema_document,schema_hash,status,published_at
)
select
  app_private.e14_deterministic_uuid('event-schema:'||event_name||':1'),event_name,1,
  'urn:estimulo:event:'||event_name||':1',schema_document,
  app_private.e14_request_hash(schema_document),'published',now()
from documents
on conflict (event_name,event_version) do nothing;

create or replace function public.get_participant_engagement_hub(
  p_actor_user_account_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  v_entrepreneur_id uuid;
  v_preferred_name text;
  v_email text;
  v_organizations uuid[];
  v_announcements jsonb;
  v_ranking jsonb;
  v_own_rank jsonb;
  v_point_history jsonb;
  v_rewards jsonb;
  v_archetype jsonb;
begin
  select entrepreneur.id,entrepreneur.preferred_name,account.email_normalized
  into v_entrepreneur_id,v_preferred_name,v_email
  from core.entrepreneurs entrepreneur
  join iam.user_accounts account on account.id=entrepreneur.user_account_id
  where entrepreneur.user_account_id=p_actor_user_account_id
    and entrepreneur.status='active'
    and account.status='active';
  if v_entrepreneur_id is null then raise exception 'PARTICIPANT_NOT_FOUND' using errcode='P0002'; end if;

  select coalesce(array_agg(distinct definition.owner_organization_id),'{}'::uuid[])
  into v_organizations
  from orchestration.enrollments enrollment
  join catalog.journey_versions version on version.id=enrollment.journey_version_id
  join catalog.journey_definitions definition on definition.id=version.journey_definition_id
  where enrollment.entrepreneur_id=v_entrepreneur_id
    and enrollment.status in ('assigned','accepted','active','completed');

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',announcement.id,
    'title',announcement.title,
    'body',announcement.body,
    'cta_label',announcement.cta_label,
    'cta_url',announcement.cta_url,
    'priority',announcement.priority,
    'starts_at',announcement.starts_at,
    'ends_at',announcement.ends_at
  ) order by announcement.priority desc,announcement.starts_at desc nulls last,announcement.created_at desc),'[]'::jsonb)
  into v_announcements
  from engagement.announcements announcement
  where announcement.organization_id=any(v_organizations)
    and announcement.status='published'
    and (announcement.starts_at is null or announcement.starts_at<=now())
    and (announcement.ends_at is null or announcement.ends_at>now());

  with participant_organizations as (
    select unnest(v_organizations) as organization_id
  ), balances as (
    select enrollment.entrepreneur_id,coalesce(sum(balance.balance),0)::bigint as points
    from orchestration.journey_instances instance
    join orchestration.enrollments enrollment on enrollment.id=instance.enrollment_id
    join catalog.journey_versions version on version.id=enrollment.journey_version_id
    join catalog.journey_definitions definition on definition.id=version.journey_definition_id
    left join engagement.point_balance_projections balance on balance.journey_instance_id=instance.id
    where definition.owner_organization_id in (select organization_id from participant_organizations)
      and enrollment.status in ('assigned','accepted','active','completed')
    group by enrollment.entrepreneur_id
  ), ranked as (
    select balance.entrepreneur_id,balance.points,
      dense_rank() over(order by balance.points desc,balance.entrepreneur_id) as position
    from balances balance
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'position',ranked.position,
      'participant',case when ranked.entrepreneur_id=v_entrepreneur_id then 'Você'
        else 'Empreendedor '||upper(substr(md5(ranked.entrepreneur_id::text),1,4)) end,
      'points',ranked.points,
      'is_current',ranked.entrepreneur_id=v_entrepreneur_id
    ) order by ranked.position,ranked.entrepreneur_id) filter(where ranked.position<=10),'[]'::jsonb),
    coalesce(max(jsonb_build_object('position',ranked.position,'points',ranked.points)) filter(where ranked.entrepreneur_id=v_entrepreneur_id),'null'::jsonb)
  into v_ranking,v_own_rank
  from ranked;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',ledger.id,
    'amount',ledger.amount,
    'reason',ledger.reason,
    'occurred_at',ledger.occurred_at,
    'journey_instance_id',ledger.journey_instance_id
  ) order by ledger.occurred_at desc,ledger.id desc),'[]'::jsonb)
  into v_point_history
  from (
    select item.*
    from engagement.point_ledger item
    where item.entrepreneur_id=v_entrepreneur_id
    order by item.occurred_at desc,item.id desc
    limit 30
  ) ledger;

  with reward_rows as (
    select
      'badge'::text as reward_type,version.id as version_id,version.title,
      version.description,definition.owner_organization_id,
      exists(select 1 from engagement.badge_awards award
        where award.entrepreneur_id=v_entrepreneur_id and award.badge_version_id=version.id and award.revoked_at is null) as earned
    from engagement.badge_versions version
    join engagement.badge_definitions definition on definition.id=version.badge_definition_id
    where definition.owner_organization_id=any(v_organizations)
      and version.status='published'
      and version.published_at is not null
    union all
    select
      'certificate'::text,version.id,definition.name,
      'Certificado de conclusão da jornada'::text,definition.owner_organization_id,
      exists(select 1 from engagement.certificate_issuances issuance
        where issuance.entrepreneur_id=v_entrepreneur_id and issuance.certificate_version_id=version.id and issuance.status='issued' and issuance.revoked_at is null)
    from engagement.certificate_versions version
    join engagement.certificate_definitions definition on definition.id=version.certificate_definition_id
    where definition.owner_organization_id=any(v_organizations)
      and version.status='published'
      and version.published_at is not null
      and exists(select 1 from orchestration.enrollments enrollment
        where enrollment.entrepreneur_id=v_entrepreneur_id and enrollment.journey_version_id=version.journey_version_id)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'type',reward_type,'version_id',version_id,'title',title,'description',description,'earned',earned
  ) order by earned desc,reward_type,title),'[]'::jsonb)
  into v_rewards
  from reward_rows;

  select jsonb_build_object(
    'assignment_id',assignment.id,
    'name',definition.name,
    'description',definition.description,
    'classification_status',assignment.classification_status,
    'probability',assignment.probability,
    'assigned_at',assignment.assigned_at
  ) into v_archetype
  from diagnostics.archetype_assignments assignment
  left join diagnostics.archetype_versions version on version.id=assignment.primary_archetype_version_id
  left join diagnostics.archetype_definitions definition on definition.id=version.archetype_definition_id
  where assignment.entrepreneur_id=v_entrepreneur_id
  order by assignment.assigned_at desc
  limit 1;

  return jsonb_build_object(
    'entrepreneur_id',v_entrepreneur_id,
    'preferred_name',v_preferred_name,
    'email',v_email,
    'announcements',v_announcements,
    'ranking',v_ranking,
    'own_rank',v_own_rank,
    'point_history',v_point_history,
    'rewards',v_rewards,
    'archetype',v_archetype
  );
end;
$$;

create or replace function public.list_operator_announcements(
  p_actor_user_account_id uuid,
  p_organization_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  v_items jsonb;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'engagement.manage') then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',item.id,'title',item.title,'body',item.body,'cta_label',item.cta_label,'cta_url',item.cta_url,
    'status',item.status,'priority',item.priority,'starts_at',item.starts_at,'ends_at',item.ends_at,
    'aggregate_version',item.aggregate_version,'created_at',item.created_at,'updated_at',item.updated_at
  ) order by item.priority desc,item.created_at desc),'[]'::jsonb)
  into v_items
  from engagement.announcements item
  where item.organization_id=p_organization_id;
  return jsonb_build_object('organization_id',p_organization_id,'announcements',v_items);
end;
$$;

create or replace function public.save_operator_announcement(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_announcement_id uuid,
  p_expected_version bigint,
  p_title text,
  p_body text,
  p_cta_label text,
  p_cta_url text,
  p_status text,
  p_priority integer,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_key text:=app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_id uuid:=coalesce(p_announcement_id,gen_random_uuid());
  v_title text:=trim(coalesce(p_title,''));
  v_body text:=trim(coalesce(p_body,''));
  v_cta_label text:=nullif(trim(coalesce(p_cta_label,'')),'');
  v_cta_url text:=nullif(trim(coalesce(p_cta_url,'')),'');
  v_status text:=lower(trim(coalesce(p_status,'')));
  v_priority integer:=coalesce(p_priority,0);
  v_request_hash text;
  v_event_id uuid;
  v_version bigint;
  v_result jsonb;
begin
  if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'engagement.manage') then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  if length(v_title) not between 2 and 120 then raise exception 'ANNOUNCEMENT_TITLE_INVALID' using errcode='22023'; end if;
  if length(v_body) not between 2 and 1200 then raise exception 'ANNOUNCEMENT_BODY_INVALID' using errcode='22023'; end if;
  if v_status not in ('draft','published','retired') then raise exception 'ANNOUNCEMENT_STATUS_INVALID' using errcode='22023'; end if;
  if v_priority not between -1000 and 1000 then raise exception 'ANNOUNCEMENT_PRIORITY_INVALID' using errcode='22023'; end if;
  if (v_cta_label is null)<>(v_cta_url is null) then raise exception 'ANNOUNCEMENT_CTA_PAIR_REQUIRED' using errcode='22023'; end if;
  if v_cta_label is not null and length(v_cta_label)>60 then raise exception 'ANNOUNCEMENT_CTA_LABEL_INVALID' using errcode='22023'; end if;
  if v_cta_url is not null and v_cta_url !~ '^(https://|/)[^[:space:]]+$' then raise exception 'ANNOUNCEMENT_CTA_URL_INVALID' using errcode='22023'; end if;
  if p_ends_at is not null and p_starts_at is not null and p_ends_at<=p_starts_at then raise exception 'ANNOUNCEMENT_WINDOW_INVALID' using errcode='22023'; end if;

  v_request_hash:=app_private.e14_request_hash(jsonb_build_object(
    'organization_id',p_organization_id,'announcement_id',p_announcement_id,
    'expected_version',p_expected_version,'title',v_title,'body',v_body,
    'cta_label',v_cta_label,'cta_url',v_cta_url,'status',v_status,'priority',v_priority,
    'starts_at',p_starts_at,'ends_at',p_ends_at
  ));
  v_event_id:=app_private.e14_command_event_id('save_operator_announcement',p_actor_user_account_id,v_id,v_key);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('announcement:'||v_id::text,0));
  if app_private.e14_assert_idempotency(v_event_id,v_request_hash) then
    select event.payload->'result' into v_result from eventing.events event where event.event_id=v_event_id;
    return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',true,'data',v_result);
  end if;

  if p_announcement_id is null then
    insert into engagement.announcements(
      id,organization_id,title,body,cta_label,cta_url,status,priority,starts_at,ends_at,
      created_by,updated_by,aggregate_version
    ) values(
      v_id,p_organization_id,v_title,v_body,v_cta_label,v_cta_url,v_status,v_priority,p_starts_at,p_ends_at,
      p_actor_user_account_id,p_actor_user_account_id,1
    );
    v_version:=1;
  else
    update engagement.announcements
    set title=v_title,body=v_body,cta_label=v_cta_label,cta_url=v_cta_url,status=v_status,
        priority=v_priority,starts_at=p_starts_at,ends_at=p_ends_at,updated_by=p_actor_user_account_id,
        aggregate_version=aggregate_version+1,updated_at=now()
    where id=v_id and organization_id=p_organization_id and aggregate_version=p_expected_version
    returning aggregate_version into v_version;
    if v_version is null then raise exception 'ANNOUNCEMENT_VERSION_CONFLICT' using errcode='40001'; end if;
  end if;

  v_result:=jsonb_build_object(
    'announcement_id',v_id,'organization_id',p_organization_id,'status',v_status,'aggregate_version',v_version
  );
  perform app_private.e14_append_event(
    v_event_id,'engagement.announcement.saved','announcement',v_id,
    'user',p_actor_user_account_id,p_organization_id,null,
    'announcement',v_id,v_version,v_event_id,null,
    jsonb_build_object('request_hash',v_request_hash,'result',v_result)
  );
  return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',false,'data',v_result);
end;
$$;

revoke all on table engagement.announcements from public,anon,authenticated;
revoke all on function public.get_participant_engagement_hub(uuid) from public,anon,authenticated;
revoke all on function public.list_operator_announcements(uuid,uuid) from public,anon,authenticated;
revoke all on function public.save_operator_announcement(uuid,uuid,uuid,bigint,text,text,text,text,text,integer,timestamptz,timestamptz,text) from public,anon,authenticated;
grant execute on function public.get_participant_engagement_hub(uuid) to postgres,service_role,app_worker;
grant execute on function public.list_operator_announcements(uuid,uuid) to postgres,service_role,app_worker;
grant execute on function public.save_operator_announcement(uuid,uuid,uuid,bigint,text,text,text,text,text,integer,timestamptz,timestamptz,text) to postgres,service_role,app_worker;
