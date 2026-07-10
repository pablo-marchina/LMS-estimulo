-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709001026
-- Remote name: m12e_privacy_incident_readiness_workflows
-- Remote SQL SHA-256: 85d4598f1aed0bd615a3c332e8498eabb19b99acaf3f215d939ebe42f884f8d1
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function governance.has_active_legal_hold(p_target_type text,p_target_reference text)
returns boolean
language sql
stable
security definer
set search_path=pg_catalog
as $$
  select exists(
    select 1
    from governance.legal_holds h
    join governance.legal_hold_targets t on t.legal_hold_id=h.id
    where h.status='active'
      and h.effective_from<=now()
      and (h.effective_until is null or h.effective_until>=now())
      and t.target_type=p_target_type
      and t.target_reference=p_target_reference
  );
$$;

create or replace function governance.enforce_retention_legal_hold()
returns trigger
language plpgsql
set search_path=pg_catalog
as $$
declare v_hold_id uuid;
begin
  if new.status in ('approved','executing') or new.proposed_action in ('delete','anonymize','aggregate') then
    select h.id into v_hold_id
    from governance.legal_holds h
    join governance.legal_hold_targets t on t.legal_hold_id=h.id
    where h.status='active' and h.effective_from<=now()
      and (h.effective_until is null or h.effective_until>=now())
      and t.target_type=new.target_type and t.target_reference=new.target_reference
    order by h.effective_from desc limit 1;
    if v_hold_id is not null then
      new.status:='blocked_legal_hold';
      new.legal_hold_id:=v_hold_id;
      new.reason_code:='active_legal_hold';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_retention_actions_legal_hold before insert or update on governance.retention_actions for each row execute function governance.enforce_retention_legal_hold();

create or replace function governance.write_audit_entry(
  p_action text,p_resource_type text,p_resource_id uuid,p_details jsonb default '{}'::jsonb,
  p_privacy_class text default 'internal',p_organization_id uuid default null,p_actor_user_account_id uuid default null
) returns uuid
language plpgsql
security definer
set search_path=pg_catalog
as $$
declare v_id uuid;
begin
  insert into governance.audit_log(
    occurred_at,actor_user_account_id,organization_id,action,resource_type,resource_id,
    request_id,details,privacy_class
  ) values (
    now(),coalesce(p_actor_user_account_id,app_private.current_user_account_id()),
    coalesce(p_organization_id,app_private.current_organization_id()),p_action,p_resource_type,p_resource_id,
    nullif(app_private.current_request_id(),'')::uuid,governance.redact_jsonb(coalesce(p_details,'{}'::jsonb)),p_privacy_class
  ) returning id into v_id;
  return v_id;
exception when invalid_text_representation then
  insert into governance.audit_log(
    occurred_at,actor_user_account_id,organization_id,action,resource_type,resource_id,request_id,details,privacy_class
  ) values (
    now(),coalesce(p_actor_user_account_id,app_private.current_user_account_id()),
    coalesce(p_organization_id,app_private.current_organization_id()),p_action,p_resource_type,p_resource_id,
    null,governance.redact_jsonb(coalesce(p_details,'{}'::jsonb)),p_privacy_class
  ) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.privacy_submit_request(
  p_entrepreneur_id uuid,
  p_request_type text,
  p_request_reference text,
  p_intake_channel text,
  p_scope jsonb default '{}'::jsonb,
  p_due_at timestamptz default null,
  p_requester_type text default 'data_subject'
) returns uuid
language plpgsql
security definer
set search_path=pg_catalog
as $$
declare v_id uuid;
begin
  if p_request_reference is null or length(trim(p_request_reference))<3 then raise exception 'request_reference_required' using errcode='22023'; end if;
  if p_entrepreneur_id is not null and not exists(select 1 from core.entrepreneurs where id=p_entrepreneur_id) then raise exception 'entrepreneur_not_found' using errcode='P0002'; end if;
  insert into governance.privacy_requests(
    entrepreneur_id,request_type,status,requested_at,due_at,request_reference,
    requester_type,identity_verification_status,intake_channel,scope
  ) values (
    p_entrepreneur_id,p_request_type,'received',now(),p_due_at,trim(p_request_reference),
    p_requester_type,'pending',p_intake_channel,governance.redact_jsonb(coalesce(p_scope,'{}'::jsonb))
  ) returning id into v_id;
  insert into governance.privacy_request_events(privacy_request_id,event_type,to_status,details)
  values(v_id,'received','received',jsonb_build_object('channel',p_intake_channel));
  perform governance.write_audit_entry('privacy_request.created','privacy_request',v_id,jsonb_build_object('requestType',p_request_type),'personal');
  return v_id;
end;
$$;

create or replace function public.privacy_record_event(
  p_privacy_request_id uuid,
  p_event_type text,
  p_to_status text,
  p_details jsonb default '{}'::jsonb,
  p_evidence_reference text default null,
  p_resolution_summary text default null
) returns boolean
language plpgsql
security definer
set search_path=pg_catalog
as $$
declare v_old_status text;
begin
  select status into v_old_status from governance.privacy_requests where id=p_privacy_request_id for update;
  if not found then raise exception 'privacy_request_not_found' using errcode='P0002'; end if;
  update governance.privacy_requests
  set status=p_to_status,
      completed_at=case when p_to_status in ('fulfilled','partially_fulfilled','rejected','cancelled') then now() else completed_at end,
      resolution_summary=coalesce(p_resolution_summary,resolution_summary),
      identity_verification_status=case when p_event_type='identity_verified' then 'verified' when p_event_type='identity_failed' then 'failed' else identity_verification_status end,
      identity_verified_at=case when p_event_type='identity_verified' then now() else identity_verified_at end
  where id=p_privacy_request_id;
  insert into governance.privacy_request_events(
    privacy_request_id,event_type,from_status,to_status,actor_user_account_id,details,evidence_reference
  ) values (
    p_privacy_request_id,p_event_type,v_old_status,p_to_status,app_private.current_user_account_id(),
    governance.redact_jsonb(coalesce(p_details,'{}'::jsonb)),p_evidence_reference
  );
  perform governance.write_audit_entry('privacy_request.status_changed','privacy_request',p_privacy_request_id,jsonb_build_object('from',v_old_status,'to',p_to_status,'eventType',p_event_type),'personal');
  return true;
end;
$$;

create or replace function public.consent_record_decision(
  p_entrepreneur_id uuid,
  p_purpose_code text,
  p_status text,
  p_policy_version text,
  p_channel text,
  p_evidence_reference text,
  p_consent_text_hash text,
  p_presented_data_categories text[] default '{}'::text[],
  p_collection_context jsonb default '{}'::jsonb,
  p_expires_at timestamptz default null
) returns uuid
language plpgsql
security definer
set search_path=pg_catalog
as $$
declare v_purpose governance.purposes%rowtype; v_previous uuid; v_id uuid;
begin
  select * into v_purpose from governance.purposes where code=p_purpose_code and status in ('approved','active');
  if not found then raise exception 'purpose_not_approved' using errcode='55000'; end if;
  if not v_purpose.requires_consent then raise exception 'purpose_does_not_use_consent' using errcode='22023'; end if;
  select id into v_previous from governance.consent_records
  where entrepreneur_id=p_entrepreneur_id and purpose_id=v_purpose.id
  order by captured_at desc limit 1;
  insert into governance.consent_records(
    entrepreneur_id,purpose_id,policy_version,status,captured_at,channel,evidence_reference,
    supersedes_consent_id,policy_document_id,consent_text_hash,presented_data_categories,
    collection_context,expires_at
  ) values (
    p_entrepreneur_id,v_purpose.id,p_policy_version,p_status,now(),p_channel,p_evidence_reference,
    v_previous,v_purpose.policy_document_id,p_consent_text_hash,coalesce(p_presented_data_categories,'{}'::text[]),
    governance.redact_jsonb(coalesce(p_collection_context,'{}'::jsonb)),p_expires_at
  ) returning id into v_id;
  perform governance.write_audit_entry('consent.decision_recorded','consent_record',v_id,jsonb_build_object('purposeCode',p_purpose_code,'status',p_status),'personal');
  return v_id;
end;
$$;

create or replace function public.security_open_incident(
  p_code text,p_title text,p_incident_type text,p_severity text,p_detected_at timestamptz,
  p_owner_role text,p_personal_data_involved boolean default false,
  p_sensitive_personal_data_involved boolean default false,p_impact_summary text default null
) returns uuid
language plpgsql
security definer
set search_path=pg_catalog
as $$
declare v_id uuid;
begin
  insert into governance.security_incidents(
    code,title,incident_type,severity,status,detected_at,personal_data_involved,
    sensitive_personal_data_involved,impact_summary,owner_role,created_by
  ) values (
    upper(trim(p_code)),p_title,p_incident_type,p_severity,'detected',p_detected_at,
    p_personal_data_involved,p_sensitive_personal_data_involved,p_impact_summary,p_owner_role,
    app_private.current_user_account_id()
  ) returning id into v_id;
  insert into governance.security_incident_events(security_incident_id,event_type,actor_user_account_id,details)
  values(v_id,'detected',app_private.current_user_account_id(),jsonb_build_object('severity',p_severity));
  perform governance.write_audit_entry('security_incident.opened','security_incident',v_id,jsonb_build_object('severity',p_severity),'confidential');
  return v_id;
end;
$$;

create or replace function public.security_record_incident_event(
  p_security_incident_id uuid,p_event_type text,p_to_status text,p_details jsonb default '{}'::jsonb,p_evidence_reference text default null
) returns boolean
language plpgsql
security definer
set search_path=pg_catalog
as $$
begin
  update governance.security_incidents
  set status=p_to_status,
      contained_at=case when p_event_type='contained' then now() else contained_at end,
      eradicated_at=case when p_event_type='eradicated' then now() else eradicated_at end,
      recovered_at=case when p_event_type='recovered' then now() else recovered_at end,
      closed_at=case when p_event_type='closed' then now() else closed_at end
  where id=p_security_incident_id;
  if not found then raise exception 'security_incident_not_found' using errcode='P0002'; end if;
  insert into governance.security_incident_events(security_incident_id,event_type,actor_user_account_id,details,evidence_reference)
  values(p_security_incident_id,p_event_type,app_private.current_user_account_id(),governance.redact_jsonb(coalesce(p_details,'{}'::jsonb)),p_evidence_reference);
  perform governance.write_audit_entry('security_incident.status_changed','security_incident',p_security_incident_id,jsonb_build_object('to',p_to_status,'eventType',p_event_type),'confidential');
  return true;
end;
$$;

create or replace function public.production_readiness_status(p_environment text default 'production')
returns jsonb
language sql
security definer
set search_path=pg_catalog
as $$
  select jsonb_build_object(
    'environment',p_environment,
    'ready',count(*) filter(where blocking and status not in ('passed','not_applicable','accepted_risk'))=0,
    'blockingOpen',count(*) filter(where blocking and status not in ('passed','not_applicable','accepted_risk')),
    'passed',count(*) filter(where status='passed'),
    'acceptedRisk',count(*) filter(where status='accepted_risk'),
    'controls',coalesce(jsonb_agg(to_jsonb(c) order by blocking desc,control_domain,control_code),'[]'::jsonb)
  )
  from governance.production_readiness_controls c
  where c.environment=p_environment;
$$;

revoke all on function public.privacy_submit_request(uuid,text,text,text,jsonb,timestamptz,text) from public,anon,authenticated;
revoke all on function public.privacy_record_event(uuid,text,text,jsonb,text,text) from public,anon,authenticated;
revoke all on function public.consent_record_decision(uuid,text,text,text,text,text,text,text[],jsonb,timestamptz) from public,anon,authenticated;
revoke all on function public.security_open_incident(text,text,text,text,timestamptz,text,boolean,boolean,text) from public,anon,authenticated;
revoke all on function public.security_record_incident_event(uuid,text,text,jsonb,text) from public,anon,authenticated;
revoke all on function public.production_readiness_status(text) from public,anon,authenticated;

grant execute on function public.privacy_submit_request(uuid,text,text,text,jsonb,timestamptz,text) to service_role;
grant execute on function public.privacy_record_event(uuid,text,text,jsonb,text,text) to service_role;
grant execute on function public.consent_record_decision(uuid,text,text,text,text,text,text,text[],jsonb,timestamptz) to service_role;
grant execute on function public.security_open_incident(text,text,text,text,timestamptz,text,boolean,boolean,text) to service_role;
grant execute on function public.security_record_incident_event(uuid,text,text,jsonb,text) to service_role;
grant execute on function public.production_readiness_status(text) to service_role;
