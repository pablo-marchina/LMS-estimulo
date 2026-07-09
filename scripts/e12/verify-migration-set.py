#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, re
from pathlib import Path

root=Path(__file__).resolve().parents[2]
migrations=root/'supabase'/'migrations'
manifest=json.loads((migrations/'MIGRATION_MANIFEST.json').read_text(encoding='utf-8'))
errors=[]; combined=''
for item in manifest['migrations']:
    path=migrations/item['file']
    if not path.exists():
        errors.append(f'missing:{item["file"]}')
        continue
    content=path.read_text(encoding='utf-8'); combined+='\n'+content
    if hashlib.sha256(content.encode()).hexdigest()!=item['sha256']:
        errors.append(f'checksum:{item["file"]}')
    if content.count(';')!=item['statement_count']:
        errors.append(f'statement_count:{item["file"]}')

expected={'tables':156,'foreign_keys':234,'indexes':94,'triggers':63}
actual={
 'tables':len(re.findall(r'(?im)^create table\s+[a-z_]+\.[a-z_]+',combined)),
 'foreign_keys':len(re.findall(r'(?i)\bforeign key\s*\(',combined)),
 'indexes':len(re.findall(r'(?im)^create\s+(?:unique\s+)?index',combined)),
 'triggers':len(re.findall(r'(?im)^create trigger',combined)),
}
for key,value in expected.items():
    if actual[key]!=value: errors.append(f'{key}:{actual[key]}!={value}')

hardening={
 'qualified_pgcrypto':'extensions.digest(' in combined,
 'policy_command_split':'split FOR ALL policies into command-specific' in combined,
 'fk_covering_indexes':'ix_eventing_worker_dispatch_tokens_schedule_code' in combined and 'ix_eventing_worker_schedules_queue_code' in combined,
 'storage_quarantine_lifecycle':'file_create_upload_intent' in combined and 'file_apply_scan_result' in combined,
 'queue_at_least_once_lifecycle':'eventing.queue_jobs' in combined and 'eventing.receive_jobs' in combined and 'eventing.redrive_dead_letter' in combined,
 'continuous_scheduler':'eventing.dispatch_worker_schedule' in combined and 'estimulo-file-scan-dispatch' in combined,
 'single_use_dispatch_token':'queue_claim_dispatch_token' in combined and 'worker_dispatch_tokens' in combined,
 'reconciliation':'eventing.reconcile_queue_system' in combined and 'eventing.republish_job' in combined,
 'observability':'queue_metric_snapshots' in combined and 'operational_alerts' in combined,
 'partial_effect_recovery':'file_get_scan_job_state' in combined and 'duplicate_suppressed' in combined,
 'privacy_ropa_registry':'governance.processing_activities' in combined and 'governance.processing_activity_assets' in combined,
 'legal_basis_catalog':'governance.legal_basis_definitions' in combined and "('credit_protection'" in combined,
 'consent_evidence':'consent_record_decision' in combined and 'consent_text_hash' in combined,
 'data_subject_rights':'privacy_submit_request' in combined and 'privacy_request_events' in combined,
 'retention_legal_hold':'governance.legal_holds' in combined and 'enforce_retention_legal_hold' in combined,
 'incident_response':'security_open_incident' in combined and 'security_incident_events' in combined,
 'recursive_redaction':'governance.redact_jsonb' in combined and 'redact_payload_and_hash' in combined,
 'all_internal_rls':'and not c.relrowsecurity' in combined and 'm12_runtime_select' in combined,
 'default_privilege_deny':'alter default privileges for role postgres' in combined and 'revoke all on all tables' in combined,
 'credit_activation_guard':'credit_decision_governance_not_ready' in combined and 'effective_ripd_required' in combined,
 'production_readiness_gate':'production_readiness_status' in combined and 'CREDIT_DECISION_GOVERNANCE' in combined,
 'no_final_legal_assumption':"'draft',null,false,'credit_governance_owner'" in combined and 'No production score retention until governance approval' in combined,
}
for key,passed in hardening.items():
    if not passed: errors.append(f'hardening:{key}')

for forbidden in ['auth.uid()','sb_publishable_','SUPABASE_SERVICE_ROLE_KEY'+'=','DATABASE_URL=postgres']:
    if forbidden.lower() in combined.lower(): errors.append(f'forbidden:{forbidden}')

files=[x['file'] for x in manifest['migrations']]
if files!=sorted(files) or len(files)!=13: errors.append('migration_order')
if manifest.get('version')!='0.4' or manifest.get('source')!='canonical M00–M12': errors.append('manifest_metadata')

result={'ok':not errors,'actual':actual,'hardening':hardening,'errors':errors,'files':files}
print(json.dumps(result,indent=2,ensure_ascii=False))
raise SystemExit(0 if not errors else 1)
