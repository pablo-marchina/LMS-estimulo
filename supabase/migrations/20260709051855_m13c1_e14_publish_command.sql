-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709051855
-- Remote name: m13c1_e14_publish_command
-- Remote SQL SHA-256: 5d7d6ee9ac5833b217fdf674968d74e61f248459897b933ea2ceaca0e8e1518a
-- Do not edit after reconciliation; corrections require a new migration.

create or replace function app_private.e14_validate_idempotency_key(p_key text)
returns text language plpgsql immutable security definer set search_path=pg_catalog as $$
begin
 if p_key is null or length(trim(p_key))<8 or length(trim(p_key))>128 then raise exception 'INVALID_IDEMPOTENCY_KEY' using errcode='22023'; end if;
 return trim(p_key);
end;$$;

create or replace function public.e14_publish_vertical(p_actor_user_account_id uuid,p_organization_id uuid,p_journey_version_id uuid,p_expected_content_hash text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare
 v_key text; v_request jsonb; v_request_hash text; v_event_id uuid; v_journey catalog.journey_versions%rowtype; v_owner uuid; v_activity_id uuid; v_diagnostic_id uuid; v_replayed boolean; v_path_count integer; v_step_count integer; v_question_count integer; v_point_count integer; v_child uuid;
begin
 v_key:=app_private.e14_validate_idempotency_key(p_idempotency_key);
 v_request:=jsonb_build_object('organization_id',p_organization_id,'journey_version_id',p_journey_version_id,'expected_content_hash',p_expected_content_hash);
 v_request_hash:=app_private.e14_request_hash(v_request);
 v_event_id:=app_private.e14_command_event_id('CMD01',p_actor_user_account_id,p_journey_version_id,v_key);
 perform pg_advisory_xact_lock(hashtextextended('CMD01|'||p_actor_user_account_id::text||'|'||p_journey_version_id::text||'|'||v_key,0));
 v_replayed:=app_private.e14_assert_idempotency(v_event_id,v_request_hash);
 if v_replayed then
  select * into v_journey from catalog.journey_versions where id=p_journey_version_id;
  return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',true,'data',jsonb_build_object('journey_version_id',v_journey.id,'status',v_journey.status,'published_at',v_journey.published_at,'content_hash',v_journey.content_hash));
 end if;
 if not app_private.e14_actor_has_permission(p_actor_user_account_id,p_organization_id,'journey.definition.publish') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 select jv.* into v_journey from catalog.journey_versions jv where jv.id=p_journey_version_id for update;
 if not found then raise exception 'RESOURCE_NOT_FOUND' using errcode='P0002'; end if;
 select jd.owner_organization_id into v_owner from catalog.journey_definitions jd where jd.id=v_journey.journey_definition_id;
 if v_owner<>p_organization_id then raise exception 'RESOURCE_NOT_FOUND' using errcode='P0002'; end if;
 if v_journey.status='published' then raise exception 'INVALID_STATE_ALREADY_PUBLISHED' using errcode='P0001'; end if;
 if v_journey.status<>'draft' then raise exception 'INVALID_STATE_NOT_DRAFT' using errcode='P0001'; end if;
 if v_journey.content_hash is distinct from p_expected_content_hash then raise exception 'CONTENT_HASH_CONFLICT' using errcode='P0001'; end if;
 if v_journey.configuration->>'visibility'<>'internal_test_only' or coalesce((v_journey.configuration->>'publishable_to_real_participants')::boolean,true) or v_journey.configuration->'partner_attribution' is distinct from 'null'::jsonb then raise exception 'E14_INTERNAL_VISIBILITY_REQUIRED' using errcode='P0001'; end if;
 v_activity_id:=(v_journey.configuration->>'activity_version_id')::uuid;
 v_diagnostic_id:=(v_journey.configuration->>'diagnostic_version_id')::uuid;
 if not exists(select 1 from catalog.activity_versions av join catalog.activity_definitions ad on ad.id=av.activity_definition_id where av.id=v_activity_id and av.status='draft' and ad.owner_organization_id=p_organization_id and av.content_hash=app_private.e14_request_hash(av.configuration)) then raise exception 'ACTIVITY_GRAPH_INVALID' using errcode='P0001'; end if;
 if not exists(select 1 from diagnostics.diagnostic_versions dv join diagnostics.diagnostic_definitions dd on dd.id=dv.diagnostic_definition_id where dv.id=v_diagnostic_id and dv.status='draft' and dd.owner_organization_id=p_organization_id and dv.content_hash=app_private.e14_request_hash(dv.configuration)) then raise exception 'DIAGNOSTIC_GRAPH_INVALID' using errcode='P0001'; end if;
 select count(*) into v_path_count from orchestration.path_templates where journey_version_id=p_journey_version_id and status='draft' and code in('guided','standard');
 select count(*) into v_step_count from orchestration.path_steps ps join orchestration.path_templates pt on pt.id=ps.path_template_id where pt.journey_version_id=p_journey_version_id and ps.activity_version_id=v_activity_id;
 select count(*) into v_question_count from assessment.questions where activity_version_id=v_activity_id;
 select count(*) into v_point_count from engagement.point_rule_versions prv join engagement.point_rule_definitions prd on prd.id=prv.point_rule_definition_id where prv.id in(select (value#>>'{}')::uuid from jsonb_array_elements(v_journey.configuration->'point_rule_version_ids')) and prv.status='draft' and prd.owner_organization_id=p_organization_id;
 if v_path_count<>2 or v_step_count<>2 or v_question_count<1 or v_point_count<>2 then raise exception 'JOURNEY_GRAPH_INCOMPLETE' using errcode='P0001'; end if;
 update diagnostics.diagnostic_versions set status='published',published_at=now() where id=v_diagnostic_id;
 update catalog.activity_versions set status='published',published_at=now() where id=v_activity_id;
 update orchestration.path_templates set status='published' where journey_version_id=p_journey_version_id;
 update engagement.point_rule_versions set status='published',published_at=now() where id in(select (value#>>'{}')::uuid from jsonb_array_elements(v_journey.configuration->'point_rule_version_ids'));
 update catalog.journey_versions set status='published',published_at=now() where id=p_journey_version_id returning * into v_journey;
 perform app_private.e14_append_event(v_event_id,'catalog.journey_version.published','journey_version',p_journey_version_id,'user_account',p_actor_user_account_id,p_organization_id,null,'journey_version',p_journey_version_id,1,v_event_id,null,jsonb_build_object('request_hash',v_request_hash,'idempotency_key',v_key,'content_hash',v_journey.content_hash,'visibility','internal_test_only'));
 v_child:=app_private.e14_child_event_id(v_event_id,'catalog.activity_version.published',1); perform app_private.e14_append_event(v_child,'catalog.activity_version.published','activity_version',v_activity_id,'user_account',p_actor_user_account_id,p_organization_id,null,'activity_version',v_activity_id,1,v_event_id,v_event_id,jsonb_build_object('journey_version_id',p_journey_version_id));
 v_child:=app_private.e14_child_event_id(v_event_id,'catalog.diagnostic_version.published',2); perform app_private.e14_append_event(v_child,'catalog.diagnostic_version.published','diagnostic_version',v_diagnostic_id,'user_account',p_actor_user_account_id,p_organization_id,null,'diagnostic_version',v_diagnostic_id,1,v_event_id,v_event_id,jsonb_build_object('journey_version_id',p_journey_version_id));
 v_child:=app_private.e14_child_event_id(v_event_id,'catalog.assessment_version.published',3); perform app_private.e14_append_event(v_child,'catalog.assessment_version.published','activity_version',v_activity_id,'user_account',p_actor_user_account_id,p_organization_id,null,'assessment_spec',v_activity_id,1,v_event_id,v_event_id,jsonb_build_object('journey_version_id',p_journey_version_id,'question_count',v_question_count));
 return jsonb_build_object('request_id',v_event_id,'idempotency_key',v_key,'replayed',false,'data',jsonb_build_object('journey_version_id',v_journey.id,'status',v_journey.status,'published_at',v_journey.published_at,'content_hash',v_journey.content_hash));
end;$$;
revoke all on function public.e14_publish_vertical(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.e14_publish_vertical(uuid,uuid,uuid,text,text) to service_role,app_worker;
