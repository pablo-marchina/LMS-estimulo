-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709052620
-- Remote name: m13d2l_e14_start_diagnostic_rpc
-- Remote SQL SHA-256: 7aa0207154e0af99ee17791e5993e5e02a87df19318e0d9ea0570d4f7673263f
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_cmd_start_diagnostic(p_actor uuid,p_instance uuid,p_diag uuid,p_key_input text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare p jsonb;data jsonb;
begin
 p:=app_private.e14_prepare_a(p_actor,p_instance,p_diag,p_key_input);
 if (p->>'r')::boolean then data:=app_private.e14_snapshot_a((p->>'s')::uuid,p_diag); else data:=app_private.e14_apply_a(p_actor,p_instance,p_diag,(p->>'s')::uuid,(p->>'e')::uuid,p->>'h',p->>'k'); end if;
 return jsonb_build_object('request_id',(p->>'e')::uuid,'idempotency_key',p->>'k','replayed',(p->>'r')::boolean,'data',data);
end;$$;
create or replace function public.e14_start_diagnostic(p_actor_user_account_id uuid,p_journey_instance_id uuid,p_diagnostic_version_id uuid,p_idempotency_key text) returns jsonb language sql security definer set search_path=pg_catalog as $$select app_private.e14_cmd_start_diagnostic($1,$2,$3,$4)$$;
revoke all on function app_private.e14_cmd_start_diagnostic(uuid,uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.e14_start_diagnostic(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.e14_start_diagnostic(uuid,uuid,uuid,text) to service_role,app_worker;
