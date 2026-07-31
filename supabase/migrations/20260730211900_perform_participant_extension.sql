begin;

create or replace function public.perform_participant_extension(
  p_actor_user_account_id uuid,
  p_action text,
  p_payload jsonb,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $$
declare
  v_key text := app_private.e14_validate_idempotency_key(p_idempotency_key);
  v_hash text := app_private.e14_request_hash(jsonb_build_object('action',p_action,'payload',p_payload));
  v_existing experience.extension_commands%rowtype;
  v_result jsonb := '{}'::jsonb;
  v_entrepreneur_id uuid;
  v_organization_id uuid;
  v_visit core.tracking_visits%rowtype;
  v_link core.tracking_links%rowtype;
  v_wallet engagement.reward_wallets%rowtype;
  v_reward engagement.rewards%rowtype;
  v_redemption_id uuid;
  v_available integer;
  v_source integer;
  v_reward_points integer;
  v_spent integer;
  v_settings engagement.reward_settings%rowtype;
  v_config assessment.delivery_configurations%rowtype;
  v_submission_id uuid;
  v_attempt integer;
  v_file jsonb;
  v_file_id uuid;
  v_session diagnostics.optional_sessions%rowtype;
  v_availability diagnostics.optional_availability%rowtype;
  v_event_id uuid;
  v_schema_id uuid;
  v_dimensions jsonb;
  v_email text;
  v_created_entrepreneur boolean := false;
  v_org_for_command uuid;
begin
  if not exists(select 1 from iam.user_accounts u where u.id=p_actor_user_account_id and u.status='active') then
    raise exception 'ACTOR_NOT_FOUND' using errcode='P0002';
  end if;
  if jsonb_typeof(coalesce(p_payload,'{}'::jsonb))<>'object' then raise exception 'PAYLOAD_INVALID' using errcode='22023'; end if;
  v_entrepreneur_id:=app_private.extension_entrepreneur(p_actor_user_account_id);
  v_organization_id:=app_private.extension_default_organization();
  v_org_for_command:=v_organization_id;

  select * into v_existing from experience.extension_commands
  where actor_user_account_id=p_actor_user_account_id and command_scope='participant:'||p_action and idempotency_key=v_key;
  if found then
    if v_existing.request_hash<>v_hash then raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode='23505'; end if;
    return v_existing.result||jsonb_build_object('replayed',true);
  end if;

  case p_action
    when 'legal_accept' then
      if not exists(
        select 1 from governance.legal_document_versions d
        where d.id=(p_payload->>'legal_document_version_id')::uuid and d.organization_id=v_organization_id and d.status='published'
      ) then raise exception 'LEGAL_DOCUMENT_NOT_FOUND' using errcode='P0002'; end if;
      insert into governance.legal_acceptances(legal_document_version_id,user_account_id,source,metadata)
      values((p_payload->>'legal_document_version_id')::uuid,p_actor_user_account_id,'participant_web',coalesce(p_payload->'metadata','{}'::jsonb))
      on conflict(legal_document_version_id,user_account_id) do nothing;
      v_result:=jsonb_build_object('accepted',true);

    when 'tracking_associate' then
      select tv.* into v_visit from core.tracking_visits tv
      where tv.visit_token_hash=encode(extensions.digest(convert_to(p_payload->>'visit_token','UTF8'),'sha256'),'hex')
      for update;
      if not found then raise exception 'TRACKING_VISIT_NOT_FOUND' using errcode='P0002'; end if;
      select * into v_link from core.tracking_links where id=v_visit.tracking_link_id;
      v_organization_id:=v_link.owner_organization_id;
      v_org_for_command:=v_organization_id;
      if v_entrepreneur_id is null and coalesce((v_link.skip_steps->>'profile')::boolean,false) then
        select email_normalized into v_email from iam.user_accounts where id=p_actor_user_account_id;
        insert into core.entrepreneurs(user_account_id,email_normalized,status,profile_data)
        values(p_actor_user_account_id,v_email,'active',jsonb_build_object('auto_provisioned',true,'tracking_link_id',v_link.id,'created_at',now()))
        on conflict(user_account_id) do update set status='active'
        returning id into v_entrepreneur_id;
        v_created_entrepreneur:=true;
      end if;
      update core.tracking_visits set user_account_id=p_actor_user_account_id,entrepreneur_id=v_entrepreneur_id,
        associated_at=now(),conversion_kind=case when v_created_entrepreneur then 'signup' else 'login' end
      where id=v_visit.id;
      insert into core.acquisition_touchpoints(user_account_id,entrepreneur_id,tracking_visit_id,attribution_kind,payload)
      values(p_actor_user_account_id,v_entrepreneur_id,v_visit.id,'first_touch',v_visit.parameters)
      on conflict(user_account_id,attribution_kind) where attribution_kind='first_touch' do nothing;
      insert into core.acquisition_touchpoints(user_account_id,entrepreneur_id,tracking_visit_id,attribution_kind,payload)
      values(p_actor_user_account_id,v_entrepreneur_id,v_visit.id,'last_touch',v_visit.parameters);
      if v_created_entrepreneur then
        insert into core.acquisition_touchpoints(user_account_id,entrepreneur_id,tracking_visit_id,attribution_kind,payload)
        values(p_actor_user_account_id,v_entrepreneur_id,v_visit.id,'signup',v_visit.parameters);
      end if;
      if v_entrepreneur_id is not null then
        insert into core.acquisition_attributions(
          user_account_id,entrepreneur_id,attribution_kind,utm_source,utm_medium,utm_campaign,utm_content,utm_term,landing_path,captured_at,metadata
        )
        values(
          p_actor_user_account_id,v_entrepreneur_id,'first_touch',v_visit.parameters->>'utm_source',v_visit.parameters->>'utm_medium',
          v_visit.parameters->>'utm_campaign',v_visit.parameters->>'utm_content',v_visit.parameters->>'utm_term',
          v_visit.landing_path,v_visit.occurred_at,v_visit.parameters
        ) on conflict(user_account_id,attribution_kind) do nothing;
      end if;
      v_result:=jsonb_build_object('destination_path',v_link.destination_path,'skip_steps',v_link.skip_steps,
        'entrepreneur_id',v_entrepreneur_id,'created_entrepreneur',v_created_entrepreneur);

    when 'reward_convert' then
      if v_entrepreneur_id is null then raise exception 'PARTICIPANT_PROFILE_REQUIRED' using errcode='42501'; end if;
      v_source:=(p_payload->>'source_points')::integer;
      if v_source<=0 then raise exception 'REWARD_CONVERSION_AMOUNT_INVALID' using errcode='22023'; end if;
      select coalesce(sum(amount),0)::integer into v_available from engagement.point_ledger where entrepreneur_id=v_entrepreneur_id;
      select coalesce(sum(-engagement_points_delta),0)::integer into v_spent from engagement.reward_ledger
      where entrepreneur_id=v_entrepreneur_id and engagement_points_delta<0;
      v_available:=greatest(0,v_available-v_spent);
      if v_source>v_available then raise exception 'REWARD_CONVERSION_INSUFFICIENT_POINTS' using errcode='22023'; end if;
      select * into v_settings from engagement.reward_settings where organization_id=v_organization_id;
      if not found then
        v_settings.source_points_per_unit:=1; v_settings.reward_points_per_unit:=1;
      end if;
      v_reward_points:=floor(v_source::numeric*v_settings.reward_points_per_unit/v_settings.source_points_per_unit)::integer;
      if v_reward_points<=0 then raise exception 'REWARD_CONVERSION_TOO_SMALL' using errcode='22023'; end if;
      insert into engagement.reward_wallets(entrepreneur_id,organization_id,balance,lifetime_converted)
      values(v_entrepreneur_id,v_organization_id,0,0)
      on conflict(entrepreneur_id) do nothing;
      select * into v_wallet from engagement.reward_wallets where entrepreneur_id=v_entrepreneur_id for update;
      update engagement.reward_wallets set balance=balance+v_reward_points,lifetime_converted=lifetime_converted+v_source,
        version=version+1,updated_at=now()
      where entrepreneur_id=v_entrepreneur_id returning * into v_wallet;
      insert into engagement.reward_ledger(
        entrepreneur_id,organization_id,reward_points_delta,engagement_points_delta,balance_after,reason,idempotency_key,metadata,created_by
      ) values (
        v_entrepreneur_id,v_organization_id,v_reward_points,-v_source,v_wallet.balance,'conversion',v_key,
        jsonb_build_object('source_points_per_unit',v_settings.source_points_per_unit,'reward_points_per_unit',v_settings.reward_points_per_unit),
        p_actor_user_account_id
      );
      v_result:=jsonb_build_object('source_points',v_source,'reward_points',v_reward_points,'balance',v_wallet.balance);

    when 'reward_redeem' then
      if v_entrepreneur_id is null then raise exception 'PARTICIPANT_PROFILE_REQUIRED' using errcode='42501'; end if;
      select * into v_reward from engagement.rewards
      where id=(p_payload->>'reward_id')::uuid and owner_organization_id=v_organization_id
        and status='published' and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now())
      for update;
      if not found then raise exception 'REWARD_NOT_AVAILABLE' using errcode='P0002'; end if;
      if v_reward.stock_quantity is not null and v_reward.stock_quantity<1 then raise exception 'REWARD_OUT_OF_STOCK' using errcode='22023'; end if;
      if v_reward.max_per_user is not null and (
        select coalesce(sum(quantity),0) from engagement.reward_redemptions
        where reward_id=v_reward.id and entrepreneur_id=v_entrepreneur_id and status<>'cancelled'
      )>=v_reward.max_per_user then raise exception 'REWARD_USER_LIMIT_REACHED' using errcode='22023'; end if;
      insert into engagement.reward_wallets(entrepreneur_id,organization_id,balance,lifetime_converted)
      values(v_entrepreneur_id,v_organization_id,0,0) on conflict(entrepreneur_id) do nothing;
      select * into v_wallet from engagement.reward_wallets where entrepreneur_id=v_entrepreneur_id for update;
      if v_wallet.balance<v_reward.cost_points then raise exception 'REWARD_BALANCE_INSUFFICIENT' using errcode='22023'; end if;
      insert into engagement.reward_redemptions(
        reward_id,entrepreneur_id,user_account_id,points_spent,status,fulfillment_details
      ) values (
        v_reward.id,v_entrepreneur_id,p_actor_user_account_id,v_reward.cost_points,'pending',coalesce(p_payload->'fulfillment_details','{}'::jsonb)
      ) returning id into v_redemption_id;
      update engagement.reward_wallets set balance=balance-v_reward.cost_points,version=version+1,updated_at=now()
      where entrepreneur_id=v_entrepreneur_id returning * into v_wallet;
      update engagement.rewards set stock_quantity=case when stock_quantity is null then null else stock_quantity-1 end,updated_at=now()
      where id=v_reward.id;
      insert into engagement.reward_ledger(
        entrepreneur_id,organization_id,redemption_id,reward_points_delta,balance_after,reason,idempotency_key,metadata,created_by
      ) values (
        v_entrepreneur_id,v_organization_id,v_redemption_id,-v_reward.cost_points,v_wallet.balance,'redemption',v_key,
        jsonb_build_object('reward_id',v_reward.id,'reward_name',v_reward.name),p_actor_user_account_id
      );
      v_result:=jsonb_build_object('redemption_id',v_redemption_id,'status','pending','balance',v_wallet.balance);

    when 'delivery_submit' then
      if v_entrepreneur_id is null then raise exception 'PARTICIPANT_PROFILE_REQUIRED' using errcode='42501'; end if;
      select * into v_config from assessment.delivery_configurations
      where id=(p_payload->>'delivery_configuration_id')::uuid and status='active'
        and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now())
      for share;
      if not found then raise exception 'DELIVERY_NOT_AVAILABLE' using errcode='P0002'; end if;
      v_organization_id:=v_config.owner_organization_id; v_org_for_command:=v_organization_id;
      if v_config.due_at is not null and v_config.due_at<now() and not v_config.allow_late then raise exception 'DELIVERY_DEADLINE_PASSED' using errcode='22023'; end if;
      if v_config.target_type='library' and not exists(
        select 1 from catalog.library_item_versions v where v.id=v_config.library_item_version_id and v.status='published' and v.discoverable_in_library
      ) then raise exception 'DELIVERY_TARGET_FORBIDDEN' using errcode='42501'; end if;
      if v_config.target_type='activity' and not exists(
        select 1 from orchestration.step_instances si
        join orchestration.path_assignments pa on pa.id=si.path_assignment_id
        join orchestration.journey_instances ji on ji.id=pa.journey_instance_id
        join orchestration.enrollments en on en.id=ji.enrollment_id
        where si.activity_version_id=v_config.activity_version_id and en.entrepreneur_id=v_entrepreneur_id
      ) then raise exception 'DELIVERY_TARGET_FORBIDDEN' using errcode='42501'; end if;
      select coalesce(max(attempt_number),0)+1 into v_attempt from assessment.delivery_submissions
      where delivery_configuration_id=v_config.id and entrepreneur_id=v_entrepreneur_id;
      if v_config.max_attempts is not null and v_attempt>v_config.max_attempts then raise exception 'DELIVERY_MAX_ATTEMPTS_REACHED' using errcode='22023'; end if;
      if v_attempt>1 and not v_config.allow_resubmit then raise exception 'DELIVERY_RESUBMISSION_DISABLED' using errcode='22023'; end if;
      if nullif(btrim(p_payload->>'text_content'),'') is null
        and nullif(btrim(p_payload->>'external_link'),'') is null
        and jsonb_array_length(coalesce(p_payload->'files','[]'::jsonb))=0 then
        raise exception 'DELIVERY_CONTENT_REQUIRED' using errcode='22023';
      end if;
      insert into assessment.delivery_submissions(
        delivery_configuration_id,entrepreneur_id,user_account_id,attempt_number,status,text_content,external_link,submitted_at
      ) values (
        v_config.id,v_entrepreneur_id,p_actor_user_account_id,v_attempt,
        case when v_config.grading_mode='ai_assistant' then 'awaiting_human_review' else 'processing' end,
        nullif(btrim(p_payload->>'text_content'),''),nullif(btrim(p_payload->>'external_link'),''),now()
      ) returning id into v_submission_id;

      for v_file in select value from jsonb_array_elements(coalesce(p_payload->'files','[]'::jsonb))
      loop
        if (v_file->>'size_bytes')::bigint>v_config.max_file_size_bytes then raise exception 'DELIVERY_FILE_TOO_LARGE' using errcode='22023'; end if;
        insert into core.file_objects(
          owner_organization_id,storage_provider,bucket,object_key,content_type,size_bytes,sha256,security_status,retention_class,
          created_by_user_account_id,original_filename,provider_object_version,etag,verified_at,released_at,metadata
        ) values (
          v_organization_id,coalesce(nullif(v_file->>'storage_provider',''),'supabase_storage'),v_file->>'bucket',v_file->>'object_key',
          v_file->>'content_type',(v_file->>'size_bytes')::bigint,v_file->>'sha256','clean','submission_evidence',
          p_actor_user_account_id,nullif(v_file->>'original_filename',''),nullif(v_file->>'provider_object_version',''),
          nullif(v_file->>'etag',''),now(),now(),coalesce(v_file->'metadata','{}'::jsonb)
        ) returning id into v_file_id;
        insert into assessment.delivery_submission_files(
          delivery_submission_id,file_object_id,evidence_type,position,extracted_content,extraction_status,metadata
        ) values (
          v_submission_id,v_file_id,coalesce(nullif(v_file->>'evidence_type',''),'file'),
          coalesce((v_file->>'position')::integer,1),nullif(v_file->>'extracted_content',''),
          case when nullif(v_file->>'extracted_content','') is not null then 'ready' else 'pending' end,
          coalesce(v_file->'metadata','{}'::jsonb)
        );
      end loop;
      v_result:=jsonb_build_object('submission_id',v_submission_id,'attempt_number',v_attempt,
        'status',case when v_config.grading_mode='ai_assistant' then 'awaiting_human_review' else 'processing' end,
        'grading_mode',v_config.grading_mode);

    when 'optional_start' then
      if v_entrepreneur_id is null then raise exception 'PARTICIPANT_PROFILE_REQUIRED' using errcode='42501'; end if;
      select * into v_availability from diagnostics.optional_availability
      where id=(p_payload->>'availability_id')::uuid and status='published'
        and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now())
      for share;
      if not found then raise exception 'OPTIONAL_DIAGNOSTIC_NOT_AVAILABLE' using errcode='P0002'; end if;
      select * into v_session from diagnostics.optional_sessions
      where optional_availability_id=v_availability.id and entrepreneur_id=v_entrepreneur_id and status='in_progress'
      order by attempt_number desc limit 1;
      if not found then
        select coalesce(max(attempt_number),0)+1 into v_attempt from diagnostics.optional_sessions
        where optional_availability_id=v_availability.id and entrepreneur_id=v_entrepreneur_id;
        if v_availability.max_attempts is not null and v_attempt>v_availability.max_attempts then raise exception 'OPTIONAL_DIAGNOSTIC_MAX_ATTEMPTS' using errcode='22023'; end if;
        insert into diagnostics.optional_sessions(optional_availability_id,diagnostic_version_id,entrepreneur_id,user_account_id,attempt_number)
        values(v_availability.id,v_availability.diagnostic_version_id,v_entrepreneur_id,p_actor_user_account_id,v_attempt)
        returning * into v_session;
      end if;
      v_result:=jsonb_build_object('session_id',v_session.id,'attempt_number',v_session.attempt_number,'status',v_session.status);

    when 'optional_answer' then
      if v_entrepreneur_id is null then raise exception 'PARTICIPANT_PROFILE_REQUIRED' using errcode='42501'; end if;
      select * into v_session from diagnostics.optional_sessions
      where id=(p_payload->>'session_id')::uuid and entrepreneur_id=v_entrepreneur_id and status='in_progress'
      for update;
      if not found then raise exception 'OPTIONAL_SESSION_NOT_FOUND' using errcode='P0002'; end if;
      if not exists(select 1 from diagnostics.items i where i.id=(p_payload->>'item_id')::uuid and i.diagnostic_version_id=v_session.diagnostic_version_id) then
        raise exception 'OPTIONAL_ITEM_INVALID' using errcode='22023';
      end if;
      if nullif(p_payload->>'item_option_id','') is not null and not exists(
        select 1 from diagnostics.item_options o where o.id=(p_payload->>'item_option_id')::uuid and o.item_id=(p_payload->>'item_id')::uuid
      ) then raise exception 'OPTIONAL_OPTION_INVALID' using errcode='22023'; end if;
      insert into diagnostics.optional_responses(optional_session_id,item_id,item_option_id,text_value,answered_at)
      values(v_session.id,(p_payload->>'item_id')::uuid,nullif(p_payload->>'item_option_id','')::uuid,
        nullif(btrim(p_payload->>'text_value'),''),now())
      on conflict(optional_session_id,item_id) do update set item_option_id=excluded.item_option_id,text_value=excluded.text_value,answered_at=now();
      v_result:=jsonb_build_object('session_id',v_session.id,'saved',true);

    when 'optional_complete' then
      if v_entrepreneur_id is null then raise exception 'PARTICIPANT_PROFILE_REQUIRED' using errcode='42501'; end if;
      select * into v_session from diagnostics.optional_sessions
      where id=(p_payload->>'session_id')::uuid and entrepreneur_id=v_entrepreneur_id and status='in_progress'
      for update;
      if not found then raise exception 'OPTIONAL_SESSION_NOT_FOUND' using errcode='P0002'; end if;
      if exists(
        select 1 from diagnostics.items i
        where i.diagnostic_version_id=v_session.diagnostic_version_id and i.is_required
          and not exists(select 1 from diagnostics.optional_responses r where r.optional_session_id=v_session.id and r.item_id=i.id)
      ) then raise exception 'OPTIONAL_DIAGNOSTIC_INCOMPLETE' using errcode='22023'; end if;
      select coalesce(jsonb_agg(jsonb_build_object(
        'code',x.code,'name',x.name,'score',x.score,'answer_count',x.answer_count
      ) order by x.position),'[]'::jsonb) into v_dimensions
      from (
        select d.code,d.name,d.position,
          round(coalesce(avg(coalesce(nullif(o.value->>'score','')::numeric,0)),0),2) as score,
          count(r.item_id) as answer_count
        from diagnostics.dimensions d
        left join diagnostics.items i on i.dimension_id=d.id
        left join diagnostics.optional_responses r on r.item_id=i.id and r.optional_session_id=v_session.id
        left join diagnostics.item_options o on o.id=r.item_option_id
        where d.diagnostic_version_id=v_session.diagnostic_version_id
        group by d.id,d.code,d.name,d.position
      ) x;
      update diagnostics.optional_sessions set status='completed',completed_at=now(),
        result_payload=jsonb_build_object('dimensions',v_dimensions,'completed_at',now())
      where id=v_session.id;
      v_result:=jsonb_build_object('session_id',v_session.id,'status','completed','dimensions',v_dimensions);

    when 'behavior_event' then
      if p_payload->>'interaction_type' !~ '^[a-z][a-z0-9_.-]{1,99}$' then raise exception 'BEHAVIOR_EVENT_TYPE_INVALID' using errcode='22023'; end if;
      if jsonb_typeof(coalesce(p_payload->'properties','{}'::jsonb))<>'object' then raise exception 'BEHAVIOR_EVENT_PROPERTIES_INVALID' using errcode='22023'; end if;
      v_event_id:=app_private.e14_command_event_id('behavior_event',p_actor_user_account_id,v_organization_id,v_key);
      select id into v_schema_id from eventing.event_schemas where event_name='behavior.interaction.recorded' and event_version=1 and status='published';
      perform eventing.append_event(
        v_event_id,'behavior.interaction.recorded',1,coalesce(nullif(p_payload->>'captured_at','')::timestamptz,now()),
        'participant_web','entrepreneur',v_entrepreneur_id,'user_account',p_actor_user_account_id,v_organization_id,
        nullif(p_payload->>'journey_instance_id','')::uuid,'behavior_interaction',v_entrepreneur_id,0,
        coalesce(v_entrepreneur_id::text,p_actor_user_account_id::text),v_event_id,null,null,'observed','internal',
        jsonb_build_object(
          'interaction_type',p_payload->>'interaction_type','schema_version',1,'captured_at',coalesce(p_payload->>'captured_at',now()::text),
          'session_id',nullif(p_payload->>'session_id',''),'entity_type',nullif(p_payload->>'entity_type',''),
          'entity_id',nullif(p_payload->>'entity_id',''),'properties',coalesce(p_payload->'properties','{}'::jsonb)
        ),v_schema_id,array['behavior.analytics','etl.behavior']::text[]
      );
      v_result:=jsonb_build_object('event_id',v_event_id,'recorded',true);

    else
      raise exception 'PARTICIPANT_ACTION_NOT_SUPPORTED' using errcode='22023';
  end case;

  insert into experience.extension_commands(actor_user_account_id,organization_id,command_scope,idempotency_key,request_hash,result)
  values(p_actor_user_account_id,v_org_for_command,'participant:'||p_action,v_key,v_hash,v_result);

  return v_result||jsonb_build_object('replayed',false);
end;
$$;

revoke all on function public.perform_participant_extension(uuid,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.perform_participant_extension(uuid,text,jsonb,text) to service_role;

commit;
