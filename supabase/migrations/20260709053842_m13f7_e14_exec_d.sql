-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709053842
-- Remote name: m13f7_e14_exec_d
-- Remote SQL SHA-256: de4c9d1b3a270964e2261cab60a3f3167df7162471f2d09e59108ae5aa253f69
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_exec_d(a uuid,b uuid,c bigint,d text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare p jsonb;x jsonb;sess uuid;ver bigint;
begin
 p:=app_private.e14_prepare_d(a,b,c,d);
 if (p->>'p')::boolean then return jsonb_build_object('request_id',(p->>'e')::uuid,'idempotency_key',p->>'k','replayed',true,'data',app_private.e14_snapshot_d(b));end if;
 x:=app_private.e14_context_d(b);
 if x is null then raise exception 'RESOURCE_NOT_FOUND' using errcode='P0002';end if;
 if app_private.e14_entrepreneur_for_account(a) is distinct from (x->>'person')::uuid then raise exception 'FORBIDDEN' using errcode='42501';end if;
 if x->>'state'<>'available' or (x->>'aggregate')::bigint<>c then raise exception 'AGGREGATE_VERSION_CONFLICT' using errcode='P0001';end if;
 sess:=app_private.e14_deterministic_uuid(b::text||(x->>'person'));
 perform app_private.e14_emit_g('ae5dc35f-8ab3-45e7-ae79-94a869d88476',(p->>'e')::uuid,a,(x->>'org')::uuid,(x->>'instance')::uuid,'session',sess,'step',b,c+1,(p->>'e')::uuid,null,jsonb_build_object('request_hash',p->>'h','idempotency_key',p->>'k'));
 ver:=app_private.e14_step_transition(b,c);if ver is null then raise exception 'AGGREGATE_VERSION_CONFLICT' using errcode='P0001';end if;
 sess:=app_private.e14_session_insert_d(b,(x->>'person')::uuid);
 return jsonb_build_object('request_id',(p->>'e')::uuid,'idempotency_key',p->>'k','replayed',false,'data',app_private.e14_snapshot_d(b));
end;$$;
