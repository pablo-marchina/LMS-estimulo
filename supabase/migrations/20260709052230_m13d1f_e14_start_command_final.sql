-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709052230
-- Remote name: m13d1f_e14_start_command_final
-- Remote SQL SHA-256: ce7bf992de554761470f5c1a1c1b3c4983b193eef1dd81cd0b872b133f17c63a
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_cmd_start(p_actor uuid,p_instance uuid,p_expected bigint,p_key_input text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare k text;req jsonb;h text;ev uuid;ev2 uuid;ctx jsonb;ver bigint;replay boolean;enr uuid;org uuid;
begin
 k:=app_private.e14_validate_idempotency_key(p_key_input);req:=jsonb_build_object('instance_id',p_instance,'expected_version',p_expected);h:=app_private.e14_request_hash(req);ev:=app_private.e14_command_event_id('CMD03',p_actor,p_instance,k);ev2:=app_private.e14_child_event_id(ev,'journey.instance.started',1);
 perform pg_advisory_xact_lock(hashtextextended('CMD03|'||p_actor::text||'|'||p_instance::text||'|'||k,0));replay:=app_private.e14_assert_idempotency(ev,h);
 if replay then return jsonb_build_object('request_id',ev,'idempotency_key',k,'replayed',true,'data',jsonb_build_object('journey_instance_id',p_instance,'status',(select status from orchestration.journey_instances where id=p_instance),'aggregate_version',(select aggregate_version from orchestration.journey_instances where id=p_instance)));end if;
 ctx:=app_private.e14_start_context(p_actor,p_instance,p_expected);enr:=(ctx->>'enrollment_id')::uuid;org:=(ctx->>'organization_id')::uuid;
 perform app_private.e14_enrollment_transition(enr);ver:=app_private.e14_instance_transition(p_instance);perform app_private.e14_progress_touch(p_instance);
 perform app_private.e14_append_event(ev,'journey.enrollment.activated','enrollment',enr,'user_account',p_actor,org,p_instance,'enrollment',enr,1,ev,null,jsonb_build_object('request_hash',h,'idempotency_key',k));
 perform app_private.e14_append_event(ev2,'journey.instance.started','journey_instance',p_instance,'user_account',p_actor,org,p_instance,'journey_instance',p_instance,ver,ev,ev,jsonb_build_object('enrollment_id',enr));
 return jsonb_build_object('request_id',ev,'idempotency_key',k,'replayed',false,'data',jsonb_build_object('journey_instance_id',p_instance,'status','in_progress','aggregate_version',ver));
end;$$;
create or replace function public.e14_start_journey(p_actor_user_account_id uuid,p_journey_instance_id uuid,p_expected_aggregate_version bigint,p_idempotency_key text) returns jsonb language sql security definer set search_path=pg_catalog as $$select app_private.e14_cmd_start($1,$2,$3,$4)$$;
revoke all on function app_private.e14_cmd_start(uuid,uuid,bigint,text) from public,anon,authenticated;revoke all on function public.e14_start_journey(uuid,uuid,bigint,text) from public,anon,authenticated;grant execute on function public.e14_start_journey(uuid,uuid,bigint,text) to service_role,app_worker;
