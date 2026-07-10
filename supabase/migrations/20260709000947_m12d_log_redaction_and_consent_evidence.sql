-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709000947
-- Remote name: m12d_log_redaction_and_consent_evidence
-- Remote SQL SHA-256: 1bde842a58aff3d1f56ac469e3f2103f1b7ce11d819fdc6a27c5373963ae6520
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function governance.redact_jsonb(p_value jsonb)
returns jsonb
language plpgsql
immutable
set search_path=pg_catalog
as $$
declare
  v_type text;
  v_result jsonb;
  v_key text;
  v_item jsonb;
begin
  if p_value is null then return null; end if;
  v_type:=jsonb_typeof(p_value);
  if v_type='object' then
    v_result:='{}'::jsonb;
    for v_key,v_item in select key,value from jsonb_each(p_value) loop
      if lower(v_key) ~ '(password|passwd|secret|client_secret|api_?key|access_?token|refresh_?token|authorization|cookie|set-cookie|signed_?url|upload_?url|download_?url|private_?key|credential|session_?token|dispatch_?token)' then
        v_result:=v_result||jsonb_build_object(v_key,'[REDACTED]');
      else
        v_result:=v_result||jsonb_build_object(v_key,governance.redact_jsonb(v_item));
      end if;
    end loop;
    return v_result;
  elsif v_type='array' then
    select coalesce(jsonb_agg(governance.redact_jsonb(value)),'[]'::jsonb) into v_result from jsonb_array_elements(p_value);
    return v_result;
  end if;
  return p_value;
end;
$$;

create or replace function governance.redact_jsonb_column()
returns trigger
language plpgsql
set search_path=pg_catalog
as $$
declare
  v_column text:=tg_argv[0];
  v_row jsonb;
begin
  v_row:=to_jsonb(new);
  if v_row ? v_column then
    new:=jsonb_populate_record(new,jsonb_build_object(v_column,governance.redact_jsonb(v_row->v_column)));
  end if;
  return new;
end;
$$;

alter table governance.consent_records
  add column if not exists policy_document_id uuid references governance.policy_documents(id),
  add column if not exists consent_text_hash text,
  add column if not exists presented_data_categories text[] not null default '{}'::text[],
  add column if not exists collection_context jsonb not null default '{}'::jsonb,
  add column if not exists expires_at timestamptz;

alter table governance.consent_records
  add constraint ck_consent_status check (status in ('granted','refused','withdrawn','expired','superseded')),
  add constraint ck_consent_hash check (consent_text_hash is null or consent_text_hash ~ '^[a-f0-9]{64}$'),
  add constraint ck_consent_expiry check (expires_at is null or expires_at>=captured_at);

alter table governance.purposes
  add constraint ck_governance_purposes_status check (status in ('draft','under_review','approved','active','suspended','retired')),
  add constraint ck_governance_purposes_approval check ((status in ('approved','active','suspended','retired'))=(approved_at is not null));

create trigger trg_audit_log_redact before insert on governance.audit_log for each row execute function governance.redact_jsonb_column('details');
create trigger trg_privacy_request_events_redact before insert on governance.privacy_request_events for each row execute function governance.redact_jsonb_column('details');
create trigger trg_retention_actions_redact before insert or update on governance.retention_actions for each row execute function governance.redact_jsonb_column('details');
create trigger trg_security_incident_events_redact before insert on governance.security_incident_events for each row execute function governance.redact_jsonb_column('details');
create trigger trg_processing_activities_redact before insert or update on governance.processing_activities for each row execute function governance.redact_jsonb_column('limitations');
create trigger trg_eventing_events_redact before insert or update on eventing.events for each row execute function governance.redact_jsonb_column('payload');
create trigger trg_eventing_queue_jobs_redact before insert or update on eventing.queue_jobs for each row execute function governance.redact_jsonb_column('payload');
create trigger trg_eventing_queue_jobs_error_redact before insert or update on eventing.queue_jobs for each row execute function governance.redact_jsonb_column('last_error_details');
create trigger trg_eventing_queue_attempts_redact before insert or update on eventing.queue_attempts for each row execute function governance.redact_jsonb_column('details');
create trigger trg_eventing_queue_dead_letters_reason_redact before insert or update on eventing.queue_dead_letters for each row execute function governance.redact_jsonb_column('reason_details');
create trigger trg_eventing_queue_dead_letters_message_redact before insert or update on eventing.queue_dead_letters for each row execute function governance.redact_jsonb_column('message_snapshot');
create trigger trg_eventing_scheduler_runs_redact before insert or update on eventing.scheduler_runs for each row execute function governance.redact_jsonb_column('details');
create trigger trg_eventing_operational_alerts_redact before insert or update on eventing.operational_alerts for each row execute function governance.redact_jsonb_column('details');

comment on function governance.redact_jsonb(jsonb) is 'Defense-in-depth redaction for secret-like JSON keys before persistence. It does not replace payload minimization or schema validation.';
