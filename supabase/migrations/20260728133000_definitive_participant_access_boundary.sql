set lock_timeout = '5s';
set statement_timeout = '5min';

create or replace function public.e14_resolve_identity(
  p_provider text,
  p_issuer text,
  p_subject text,
  p_email_normalized text,
  p_email_verified boolean,
  p_claims_fingerprint text
) returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $$
declare
  v_user_account_id uuid;
  v_entrepreneur_id uuid;
  v_organizations jsonb;
  v_estimulo_organization_id uuid;
  v_access_mode text;
  v_next_path text;
begin
  v_user_account_id:=iam.resolve_external_identity(
    p_provider,p_issuer,p_subject,p_email_normalized,p_email_verified,p_claims_fingerprint
  );
  v_entrepreneur_id:=app_private.e14_entrepreneur_for_account(v_user_account_id);

  if p_email_verified
     and lower(btrim(p_email_normalized)) ~ '^[^@]+@estimulo\.org$'
     and lower(btrim(p_provider)) = 'google' then
    select organization.id into v_estimulo_organization_id
    from iam.organizations organization
    where organization.slug='estimulo' and organization.status='active' limit 1;
    if v_estimulo_organization_id is not null and not exists(
      select 1 from iam.organization_memberships membership
      where membership.organization_id=v_estimulo_organization_id
        and membership.user_account_id=v_user_account_id
        and membership.status='active'
        and membership.valid_from<=now()
        and (membership.valid_until is null or membership.valid_until>now())
    ) then
      insert into iam.organization_memberships(
        id,organization_id,user_account_id,status,valid_from,valid_until,created_at
      ) values(
        app_private.e14_deterministic_uuid('estimulo-staff-membership|'||v_user_account_id::text),
        v_estimulo_organization_id,v_user_account_id,'active',now(),null,now()
      ) on conflict(id) do update set status='active',valid_until=null;
    end if;
  end if;

  select coalesce(jsonb_agg(org_context order by org_context->>'display_name'),'[]'::jsonb)
  into v_organizations
  from (
    select jsonb_build_object(
      'organization_id',organization.id,
      'slug',organization.slug,
      'display_name',organization.display_name,
      'roles',coalesce((
        select jsonb_agg(distinct role.code order by role.code)
        from iam.membership_roles membership_role
        join iam.role_definitions role on role.id=membership_role.role_id and role.status='active'
        where membership_role.membership_id=membership.id
          and membership_role.valid_from<=now()
          and (membership_role.valid_until is null or membership_role.valid_until>now())
      ),'[]'::jsonb),
      'permissions',coalesce((
        select jsonb_agg(distinct permission.code order by permission.code)
        from iam.membership_roles membership_role
        join iam.role_definitions role on role.id=membership_role.role_id and role.status='active'
        join iam.role_permissions role_permission on role_permission.role_id=role.id
        join iam.permission_definitions permission on permission.id=role_permission.permission_id
        where membership_role.membership_id=membership.id
          and membership_role.valid_from<=now()
          and (membership_role.valid_until is null or membership_role.valid_until>now())
      ),'[]'::jsonb)
    ) org_context
    from iam.organization_memberships membership
    join iam.organizations organization on organization.id=membership.organization_id and organization.status='active'
    where membership.user_account_id=v_user_account_id
      and membership.status='active'
      and membership.valid_from<=now()
      and (membership.valid_until is null or membership.valid_until>now())
  ) context_rows;

  v_access_mode:=case
    when v_entrepreneur_id is not null then 'participant'
    when lower(btrim(p_provider))='google'
      and lower(btrim(p_email_normalized)) ~ '^[^@]+@estimulo\.org$' then 'administrative'
    when jsonb_array_length(v_organizations)>0 then 'administrative'
    else 'onboarding_required'
  end;

  v_next_path:=case v_access_mode
    when 'participant' then '/empreendedor'
    when 'administrative' then '/admin'
    else '/cadastro/concluir?retorno=perfil_incompleto'
  end;

  return jsonb_build_object(
    'user_account_id',v_user_account_id,
    'entrepreneur_id',v_entrepreneur_id,
    'organizations',v_organizations,
    'access_mode',v_access_mode,
    'next_path',v_next_path
  );
end;
$$;

create or replace function public.get_participant_diagnostic_summary(p_actor_user_account_id uuid)
returns jsonb
language plpgsql
stable security definer
set search_path to 'pg_catalog'
as $$
declare
  v_entrepreneur_id uuid;
  v_summary jsonb;
begin
  select entrepreneur.id into v_entrepreneur_id
  from core.entrepreneurs entrepreneur
  join iam.user_accounts account on account.id=entrepreneur.user_account_id
  where entrepreneur.user_account_id=p_actor_user_account_id
    and entrepreneur.status='active'
    and account.status='active';

  if v_entrepreneur_id is null then
    return jsonb_build_object(
      'participant_status','profile_required',
      'diagnostic_name',null,
      'completed_at',null,
      'dimensions','[]'::jsonb
    );
  end if;

  with selected_session as (
    select session.id,session.diagnostic_version_id,session.completed_at
    from diagnostics.sessions session
    where session.entrepreneur_id=v_entrepreneur_id and session.status='completed'
    order by session.completed_at desc nulls last,session.started_at desc,session.id desc
    limit 1
  ), selected_result as (
    select result.id,result.session_id
    from diagnostics.results result
    join selected_session session on session.id=result.session_id
    order by result.calculated_at desc,result.id desc
    limit 1
  ), dimension_maximums as (
    select dimension.id,
      coalesce(sum((select max(coalesce((option.value->>'score')::numeric,0))
        from diagnostics.item_options option where option.item_id=item.id)),0) maximum_score
    from diagnostics.dimensions dimension
    join selected_session session on session.diagnostic_version_id=dimension.diagnostic_version_id
    left join diagnostics.items item on item.dimension_id=dimension.id
    group by dimension.id
  )
  select jsonb_build_object(
    'participant_status','ready',
    'diagnostic_name',definition.name,
    'completed_at',session.completed_at,
    'dimensions',coalesce((
      select jsonb_agg(jsonb_build_object(
        'code',dimension.code,
        'name',dimension.name,
        'score',dimension_result.score,
        'maximum_score',maximum.maximum_score,
        'percentage',case when maximum.maximum_score>0
          then least(100,greatest(0,round(dimension_result.score/maximum.maximum_score*100))) else 0 end,
        'answered_ratio',dimension_result.answered_ratio,
        'position',dimension.position
      ) order by dimension.position)
      from diagnostics.dimension_results dimension_result
      join diagnostics.dimensions dimension on dimension.id=dimension_result.dimension_id
      join dimension_maximums maximum on maximum.id=dimension.id
      where dimension_result.result_id=result.id
    ),'[]'::jsonb)
  ) into v_summary
  from selected_session session
  join selected_result result on result.session_id=session.id
  join diagnostics.diagnostic_versions version on version.id=session.diagnostic_version_id
  join diagnostics.diagnostic_definitions definition on definition.id=version.diagnostic_definition_id;

  return coalesce(v_summary,jsonb_build_object(
    'participant_status','ready',
    'diagnostic_name',null,
    'completed_at',null,
    'dimensions','[]'::jsonb
  ));
end;
$$;

create or replace function public.get_participant_engagement_hub(p_actor_user_account_id uuid)
returns jsonb
language plpgsql
stable security definer
set search_path to 'pg_catalog'
as $$
declare
  v_entrepreneur_id uuid; v_preferred_name text; v_email text; v_organizations uuid[];
  v_announcements jsonb; v_ranking jsonb; v_own_rank jsonb; v_point_history jsonb; v_rewards jsonb; v_archetype jsonb;
begin
  select account.email_normalized into v_email
  from iam.user_accounts account
  where account.id=p_actor_user_account_id and account.status='active';

  select entrepreneur.id,entrepreneur.preferred_name into v_entrepreneur_id,v_preferred_name
  from core.entrepreneurs entrepreneur
  where entrepreneur.user_account_id=p_actor_user_account_id and entrepreneur.status='active';

  if v_entrepreneur_id is null then
    return jsonb_build_object(
      'participant_status','profile_required',
      'entrepreneur_id',null,
      'preferred_name',null,
      'email',v_email,
      'announcements','[]'::jsonb,
      'ranking','[]'::jsonb,
      'own_rank',null,
      'point_history','[]'::jsonb,
      'rewards','[]'::jsonb,
      'archetype',null
    );
  end if;

  select array_agg(distinct organization_id) into v_organizations from (
    select definition.owner_organization_id organization_id
    from orchestration.enrollments enrollment
    join catalog.journey_versions version on version.id=enrollment.journey_version_id
    join catalog.journey_definitions definition on definition.id=version.journey_definition_id
    where enrollment.entrepreneur_id=v_entrepreneur_id and enrollment.status in ('assigned','accepted','active','completed')
    union select id from iam.organizations where slug='estimulo' and status='active'
  ) organizations;
  v_organizations:=coalesce(v_organizations,'{}'::uuid[]);

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',announcement.id,'title',announcement.title,'body',announcement.body,'cta_label',announcement.cta_label,
    'cta_url',announcement.cta_url,'priority',announcement.priority,'starts_at',announcement.starts_at,'ends_at',announcement.ends_at,
    'image_file_object_id',announcement.image_file_object_id,'image_alt',announcement.image_alt,'display_mode',announcement.display_mode
  ) order by announcement.priority desc,announcement.starts_at desc nulls last,announcement.created_at desc),'[]'::jsonb) into v_announcements
  from engagement.announcements announcement
  where announcement.organization_id=any(v_organizations) and announcement.status='published'
    and (announcement.starts_at is null or announcement.starts_at<=now())
    and (announcement.ends_at is null or announcement.ends_at>now());

  with balances as (
    select entrepreneur.id entrepreneur_id,coalesce(sum(balance.balance),0)::bigint points
    from core.entrepreneurs entrepreneur
    left join engagement.point_balance_projections balance on balance.entrepreneur_id=entrepreneur.id
    where entrepreneur.status='active' group by entrepreneur.id
  ), ranked as (
    select balance.entrepreneur_id,balance.points,dense_rank() over(order by balance.points desc,balance.entrepreneur_id) position from balances balance
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'position',ranked.position,'participant',case when ranked.entrepreneur_id=v_entrepreneur_id then 'Você' else 'Empreendedor '||upper(substr(md5(ranked.entrepreneur_id::text),1,4)) end,
    'points',ranked.points,'is_current',ranked.entrepreneur_id=v_entrepreneur_id
  ) order by ranked.position,ranked.entrepreneur_id) filter(where ranked.position<=10),'[]'::jsonb) into v_ranking from ranked;

  with balances as (
    select entrepreneur.id entrepreneur_id,coalesce(sum(balance.balance),0)::bigint points
    from core.entrepreneurs entrepreneur left join engagement.point_balance_projections balance on balance.entrepreneur_id=entrepreneur.id
    where entrepreneur.status='active' group by entrepreneur.id
  ), ranked as (
    select balance.entrepreneur_id,balance.points,dense_rank() over(order by balance.points desc,balance.entrepreneur_id) position from balances balance
  ) select jsonb_build_object('position',position,'points',points) into v_own_rank from ranked where entrepreneur_id=v_entrepreneur_id limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',ledger.id,'amount',ledger.amount,'reason',coalesce(definition.name,ledger.reason),'occurred_at',ledger.occurred_at,'journey_instance_id',ledger.journey_instance_id
  ) order by ledger.occurred_at desc,ledger.id desc),'[]'::jsonb) into v_point_history
  from (select item.* from engagement.point_ledger item where item.entrepreneur_id=v_entrepreneur_id order by item.occurred_at desc,item.id desc limit 30) ledger
  left join engagement.point_rule_versions version on version.id=ledger.point_rule_version_id
  left join engagement.point_rule_definitions definition on definition.id=version.point_rule_definition_id;

  with reward_rows as (
    select 'badge'::text reward_type,version.id version_id,version.title,version.description,
      exists(select 1 from engagement.badge_awards award where award.entrepreneur_id=v_entrepreneur_id and award.badge_version_id=version.id and award.revoked_at is null) earned
    from engagement.badge_versions version join engagement.badge_definitions definition on definition.id=version.badge_definition_id
    where definition.owner_organization_id=any(v_organizations) and version.status='published' and version.published_at is not null
    union all
    select 'certificate'::text,version.id,definition.name,'Certificado de conclusão da jornada'::text,
      exists(select 1 from engagement.certificate_issuances issuance where issuance.entrepreneur_id=v_entrepreneur_id and issuance.certificate_version_id=version.id and issuance.status='issued' and issuance.revoked_at is null)
    from engagement.certificate_versions version join engagement.certificate_definitions definition on definition.id=version.certificate_definition_id
    where definition.owner_organization_id=any(v_organizations) and version.status='published' and version.published_at is not null
      and exists(select 1 from orchestration.enrollments enrollment where enrollment.entrepreneur_id=v_entrepreneur_id and enrollment.journey_version_id=version.journey_version_id)
  ) select coalesce(jsonb_agg(jsonb_build_object('type',reward_type,'version_id',version_id,'title',title,'description',description,'earned',earned) order by earned desc,reward_type,title),'[]'::jsonb) into v_rewards from reward_rows;

  select jsonb_build_object('assignment_id',assignment.id,'name',definition.name,'description',definition.description,'classification_status',assignment.classification_status,'probability',assignment.probability,'assigned_at',assignment.assigned_at)
  into v_archetype from diagnostics.archetype_assignments assignment
  left join diagnostics.archetype_versions version on version.id=assignment.primary_archetype_version_id
  left join diagnostics.archetype_definitions definition on definition.id=version.archetype_definition_id
  where assignment.entrepreneur_id=v_entrepreneur_id order by assignment.assigned_at desc limit 1;

  return jsonb_build_object(
    'participant_status','ready',
    'entrepreneur_id',v_entrepreneur_id,'preferred_name',v_preferred_name,'email',v_email,
    'announcements',coalesce(v_announcements,'[]'::jsonb),'ranking',coalesce(v_ranking,'[]'::jsonb),'own_rank',v_own_rank,
    'point_history',coalesce(v_point_history,'[]'::jsonb),'rewards',coalesce(v_rewards,'[]'::jsonb),'archetype',v_archetype
  );
end;
$$;

revoke all on function public.e14_resolve_identity(text,text,text,text,boolean,text) from public, anon, authenticated;
grant execute on function public.e14_resolve_identity(text,text,text,text,boolean,text) to postgres, service_role, app_worker;
