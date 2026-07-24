-- Frente 6: durable, auditable identity-resolution queue for ambiguous HubSpot matching.

create table if not exists integration.identity_resolution_cases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references iam.organizations(id),
  user_account_id uuid not null references iam.user_accounts(id),
  entrepreneur_id uuid null references core.entrepreneurs(id),
  status text not null default 'pending'
    check (status in ('pending','awaiting_integration','queued','resolved','dismissed')),
  reason_code text not null
    check (reason_code in ('no_match','multiple_matches','conflict_blocked','manual_review')),
  candidate_contacts jsonb not null default '[]'::jsonb
    check (jsonb_typeof(candidate_contacts) = 'array'),
  matched_identifiers jsonb not null default '{}'::jsonb
    check (jsonb_typeof(matched_identifiers) = 'object'),
  source_event_id uuid null references eventing.events(event_id),
  resolution_action text null
    check (resolution_action is null or resolution_action in ('link_existing','create_new','dismiss')),
  selected_external_object_id text null,
  queued_sync_job_id uuid null references integration.sync_jobs(id),
  resolved_by_user_account_id uuid null references iam.user_accounts(id),
  resolution_note text null check (resolution_note is null or length(resolution_note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz null
);

create unique index if not exists identity_resolution_one_open_case_per_account
  on integration.identity_resolution_cases(organization_id, user_account_id)
  where status in ('pending','awaiting_integration','queued');

create index if not exists identity_resolution_cases_queue_idx
  on integration.identity_resolution_cases(organization_id, status, created_at desc);

alter table integration.identity_resolution_cases enable row level security;
revoke all on integration.identity_resolution_cases from public, anon, authenticated;

create or replace function public.enqueue_identity_resolution_case(
  p_organization_id uuid,
  p_user_account_id uuid,
  p_entrepreneur_id uuid,
  p_reason_code text,
  p_candidate_contacts jsonb,
  p_matched_identifiers jsonb,
  p_source_event_id uuid,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_key text := app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_case_id uuid;
  v_event_id uuid;
  v_request_hash text;
  v_result jsonb;
begin
  if p_reason_code not in ('no_match','multiple_matches','conflict_blocked','manual_review') then
    raise exception 'IDENTITY_RESOLUTION_REASON_INVALID' using errcode='22023';
  end if;
  if jsonb_typeof(coalesce(p_candidate_contacts,'[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_matched_identifiers,'{}'::jsonb)) <> 'object' then
    raise exception 'IDENTITY_RESOLUTION_PAYLOAD_INVALID' using errcode='22023';
  end if;
  if not exists(select 1 from iam.user_accounts where id=p_user_account_id) then
    raise exception 'USER_ACCOUNT_NOT_FOUND' using errcode='P0002';
  end if;
  if p_entrepreneur_id is not null and not exists(
    select 1 from core.entrepreneurs where id=p_entrepreneur_id and user_account_id=p_user_account_id
  ) then
    raise exception 'ENTREPRENEUR_ACCOUNT_MISMATCH' using errcode='22023';
  end if;

  v_event_id := app_private.e14_command_event_id(
    'enqueue_identity_resolution_case', p_user_account_id, p_user_account_id, v_key
  );
  v_request_hash := app_private.e14_request_hash(jsonb_build_object(
    'organization_id',p_organization_id,
    'user_account_id',p_user_account_id,
    'entrepreneur_id',p_entrepreneur_id,
    'reason_code',p_reason_code,
    'candidate_contacts',coalesce(p_candidate_contacts,'[]'::jsonb),
    'matched_identifiers',coalesce(p_matched_identifiers,'{}'::jsonb),
    'source_event_id',p_source_event_id
  ));

  if app_private.e14_assert_idempotency(v_event_id,v_request_hash) then
    select e.payload->'result' into v_result from eventing.events e where e.event_id=v_event_id;
    return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',true,'data',v_result);
  end if;

  select id into v_case_id
  from integration.identity_resolution_cases
  where organization_id=p_organization_id
    and user_account_id=p_user_account_id
    and status in ('pending','awaiting_integration','queued')
  order by created_at desc
  limit 1
  for update;

  if v_case_id is null then
    insert into integration.identity_resolution_cases(
      organization_id,user_account_id,entrepreneur_id,status,reason_code,
      candidate_contacts,matched_identifiers,source_event_id
    ) values (
      p_organization_id,p_user_account_id,p_entrepreneur_id,'pending',p_reason_code,
      coalesce(p_candidate_contacts,'[]'::jsonb),coalesce(p_matched_identifiers,'{}'::jsonb),p_source_event_id
    ) returning id into v_case_id;
  else
    update integration.identity_resolution_cases
       set entrepreneur_id=coalesce(p_entrepreneur_id,entrepreneur_id),
           status='pending',
           reason_code=p_reason_code,
           candidate_contacts=coalesce(p_candidate_contacts,'[]'::jsonb),
           matched_identifiers=coalesce(p_matched_identifiers,'{}'::jsonb),
           source_event_id=coalesce(p_source_event_id,source_event_id),
           resolution_action=null,
           selected_external_object_id=null,
           queued_sync_job_id=null,
           resolved_by_user_account_id=null,
           resolution_note=null,
           resolved_at=null,
           updated_at=now()
     where id=v_case_id;
  end if;

  v_result := jsonb_build_object('case_id',v_case_id,'status','pending');
  perform app_private.e14_append_event(
    v_event_id,'integration.identity_resolution.queued','identity_resolution_case',v_case_id,
    'system',p_user_account_id,p_organization_id,null,'identity_resolution_case',v_case_id,1,
    v_event_id,p_source_event_id,jsonb_build_object('request_hash',v_request_hash,'result',v_result)
  );
  return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',false,'data',v_result);
end;
$function$;

create or replace function public.list_admin_identity_resolution_cases(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_status text default null
) returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_cases jsonb;
  v_pending integer;
  v_waiting integer;
  v_queued integer;
begin
  if not (
    app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'iam.accounts.manage')
    or app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'integration.manage')
  ) then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  if p_status is not null and p_status not in ('pending','awaiting_integration','queued','resolved','dismissed') then
    raise exception 'IDENTITY_RESOLUTION_STATUS_INVALID' using errcode='22023';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',c.id,
    'user_account_id',c.user_account_id,
    'entrepreneur_id',c.entrepreneur_id,
    'email',ua.email_normalized,
    'preferred_name',e.preferred_name,
    'legal_name',e.legal_name,
    'phone_e164',e.phone_e164,
    'status',c.status,
    'reason_code',c.reason_code,
    'candidate_contacts',c.candidate_contacts,
    'matched_identifiers',c.matched_identifiers,
    'resolution_action',c.resolution_action,
    'selected_external_object_id',c.selected_external_object_id,
    'queued_sync_job_id',c.queued_sync_job_id,
    'resolution_note',c.resolution_note,
    'created_at',c.created_at,
    'updated_at',c.updated_at,
    'resolved_at',c.resolved_at
  ) order by c.created_at desc),'[]'::jsonb)
  into v_cases
  from integration.identity_resolution_cases c
  join iam.user_accounts ua on ua.id=c.user_account_id
  left join core.entrepreneurs e on e.id=c.entrepreneur_id
  where c.organization_id=p_organization_id
    and (p_status is null or c.status=p_status);

  select count(*) filter(where status='pending'),
         count(*) filter(where status='awaiting_integration'),
         count(*) filter(where status='queued')
    into v_pending,v_waiting,v_queued
  from integration.identity_resolution_cases
  where organization_id=p_organization_id;

  return jsonb_build_object(
    'organization_id',p_organization_id,
    'counts',jsonb_build_object('pending',v_pending,'awaiting_integration',v_waiting,'queued',v_queued),
    'cases',v_cases
  );
end;
$function$;

create or replace function public.resolve_admin_identity_resolution_case(
  p_actor_user_account_id uuid,
  p_organization_id uuid,
  p_case_id uuid,
  p_action text,
  p_external_object_id text,
  p_note text,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_key text := app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_event_id uuid := app_private.e14_command_event_id('resolve_admin_identity_case',p_actor_user_account_id,p_case_id,v_key);
  v_request_hash text;
  v_case integration.identity_resolution_cases%rowtype;
  v_connection_id uuid;
  v_mapping_version_id uuid;
  v_internal_entity_type text;
  v_internal_entity_id uuid;
  v_sync_job_id uuid;
  v_result jsonb;
  v_target_status text;
begin
  if not (
    app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'iam.accounts.manage')
    or app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'integration.manage')
  ) then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  if p_action not in ('link_existing','create_new','dismiss') then
    raise exception 'IDENTITY_RESOLUTION_ACTION_INVALID' using errcode='22023';
  end if;
  if p_action='link_existing' and nullif(trim(coalesce(p_external_object_id,'')),'') is null then
    raise exception 'EXTERNAL_CONTACT_REQUIRED' using errcode='22023';
  end if;
  if length(trim(coalesce(p_note,''))) > 1000 then
    raise exception 'IDENTITY_RESOLUTION_NOTE_TOO_LONG' using errcode='22023';
  end if;

  v_request_hash := app_private.e14_request_hash(jsonb_build_object(
    'organization_id',p_organization_id,'case_id',p_case_id,'action',p_action,
    'external_object_id',nullif(trim(coalesce(p_external_object_id,'')),''),'note',nullif(trim(coalesce(p_note,'')),'')
  ));
  if app_private.e14_assert_idempotency(v_event_id,v_request_hash) then
    select e.payload->'result' into v_result from eventing.events e where e.event_id=v_event_id;
    return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',true,'data',v_result);
  end if;

  select * into v_case
  from integration.identity_resolution_cases
  where id=p_case_id and organization_id=p_organization_id
  for update;
  if not found then raise exception 'IDENTITY_RESOLUTION_CASE_NOT_FOUND' using errcode='P0002'; end if;
  if v_case.status in ('resolved','dismissed') then
    raise exception 'IDENTITY_RESOLUTION_CASE_CLOSED' using errcode='22023';
  end if;

  v_internal_entity_type := case when v_case.entrepreneur_id is null then 'user_account' else 'entrepreneur' end;
  v_internal_entity_id := coalesce(v_case.entrepreneur_id,v_case.user_account_id);

  if p_action='dismiss' then
    v_target_status := 'dismissed';
  else
    select id into v_connection_id
    from integration.connections
    where organization_id=p_organization_id and lower(provider)='hubspot' and status='active'
    order by updated_at desc limit 1;

    if v_connection_id is null then
      v_target_status := 'awaiting_integration';
    elsif p_action='link_existing' then
      begin
        insert into integration.external_object_mappings(
          connection_id,internal_entity_type,internal_entity_id,external_object_type,
          external_object_id,status,first_synced_at,last_synced_at,metadata
        ) values (
          v_connection_id,v_internal_entity_type,v_internal_entity_id,'contact',trim(p_external_object_id),
          'active',now(),now(),jsonb_build_object('manual_resolution_case_id',p_case_id,'resolved_by',p_actor_user_account_id)
        )
        on conflict (connection_id,internal_entity_type,internal_entity_id,external_object_type)
        do update set external_object_id=excluded.external_object_id,status='active',last_synced_at=now(),metadata=excluded.metadata;
      exception when unique_violation then
        raise exception 'EXTERNAL_CONTACT_ALREADY_LINKED' using errcode='23505';
      end;
      v_target_status := 'resolved';
    else
      select mv.id into v_mapping_version_id
      from integration.mapping_versions mv
      join integration.mapping_definitions md on md.id=mv.mapping_definition_id
      where md.connection_id=v_connection_id and mv.status='published'
      order by case when md.code in ('entrepreneur_contact','participant_contact','contact') then 0 else 1 end,
               mv.version_number desc
      limit 1;
      if v_mapping_version_id is null then
        v_target_status := 'awaiting_integration';
      else
        v_sync_job_id := gen_random_uuid();
        insert into integration.sync_jobs(
          id,connection_id,mapping_version_id,source_event_id,operation,
          internal_entity_type,internal_entity_id,idempotency_key,status,scheduled_at,attempt_count
        ) values (
          v_sync_job_id,v_connection_id,v_mapping_version_id,null,'create',
          v_internal_entity_type,v_internal_entity_id,v_key||':hubspot-contact','queued',now(),0
        );
        v_target_status := 'queued';
      end if;
    end if;
  end if;

  update integration.identity_resolution_cases
     set status=v_target_status,
         resolution_action=p_action,
         selected_external_object_id=nullif(trim(coalesce(p_external_object_id,'')),''),
         queued_sync_job_id=v_sync_job_id,
         resolved_by_user_account_id=p_actor_user_account_id,
         resolution_note=nullif(trim(coalesce(p_note,'')),''),
         resolved_at=case when v_target_status in ('resolved','dismissed') then now() else null end,
         updated_at=now()
   where id=p_case_id;

  v_result := jsonb_build_object(
    'case_id',p_case_id,'status',v_target_status,'action',p_action,
    'external_object_id',nullif(trim(coalesce(p_external_object_id,'')),''),'sync_job_id',v_sync_job_id
  );
  perform app_private.e14_append_event(
    v_event_id,'integration.identity_resolution.decision_recorded','identity_resolution_case',p_case_id,
    'user_account',p_actor_user_account_id,p_organization_id,null,'identity_resolution_case',p_case_id,1,
    v_event_id,v_case.source_event_id,jsonb_build_object('request_hash',v_request_hash,'result',v_result)
  );
  return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',false,'data',v_result);
end;
$function$;

revoke all on function public.enqueue_identity_resolution_case(uuid,uuid,uuid,text,jsonb,jsonb,uuid,text) from public;
revoke all on function public.list_admin_identity_resolution_cases(uuid,uuid,text) from public;
revoke all on function public.resolve_admin_identity_resolution_case(uuid,uuid,uuid,text,text,text,text) from public;

grant execute on function public.enqueue_identity_resolution_case(uuid,uuid,uuid,text,jsonb,jsonb,uuid,text) to service_role;
grant execute on function public.list_admin_identity_resolution_cases(uuid,uuid,text) to authenticated, service_role;
grant execute on function public.resolve_admin_identity_resolution_case(uuid,uuid,uuid,text,text,text,text) to authenticated, service_role;

comment on table integration.identity_resolution_cases is 'Durable manual-review queue for ambiguous or blocked external-contact identity matching.';