-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709054008
-- Remote name: m13g6_e14_exec_e
-- Remote SQL SHA-256: 4df4c01c8680f847ea9634947560d65568497e7323716aa09ede13dba209b7fc
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_exec_e(a uuid,b uuid,c text,d boolean,e text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare k text;h text;ev uuid;rp boolean;x jsonb;n integer;
begin
 k:=app_private.e14_validate_idempotency_key(e);h:=app_private.e14_request_hash(jsonb_build_object('session_id',b,'section_code',c,'acknowledged',d));ev:=app_private.e14_deterministic_uuid(b::text||'|'||c);perform app_private.e14_lock_scope('C8|'||b::text||'|'||c);rp:=app_private.e14_assert_idempotency(ev,h);
 if rp then return jsonb_build_object('request_id',ev,'idempotency_key',k,'replayed',true,'data',app_private.e14_snapshot_e(b));end if;
 if d is not true then raise exception 'SECTION_ACK_REQUIRED' using errcode='22023';end if;
 x:=app_private.e14_context_e(b);if x is null then raise exception 'RESOURCE_NOT_FOUND' using errcode='P0002';end if;
 if app_private.e14_entrepreneur_for_account(a) is distinct from (x->>'person_id')::uuid then raise exception 'FORBIDDEN' using errcode='42501';end if;
 if x->>'ended_at' is not null or x->>'step_status'<>'in_progress' then raise exception 'ACTIVITY_NOT_IN_PROGRESS' using errcode='P0001';end if;
 if not app_private.e14_section_exists((x->>'version_id')::uuid,c) then raise exception 'INVALID_SECTION' using errcode='22023';end if;
 perform app_private.e14_emit_g('b148150e-6b30-44a5-9b08-2cae44144ec4',ev,a,(x->>'org_id')::uuid,(x->>'instance_id')::uuid,'activity_session',b,'activity_session',b,(x->>'n')::bigint+1,ev,null,jsonb_build_object('request_hash',h,'idempotency_key',k,'section_code',c));
 n:=app_private.e14_inc_e(b);perform app_private.e14_progress_touch((x->>'instance_id')::uuid);
 return jsonb_build_object('request_id',ev,'idempotency_key',k,'replayed',false,'data',jsonb_build_object('activity_session_id',b,'section_code',c,'accepted_sections',n,'completion_ratio',least(1,n/4.0)));
end;$$;
