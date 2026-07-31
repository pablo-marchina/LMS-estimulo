begin;

create or replace function public.get_participant_extensions(p_actor_user_account_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $$
declare
  v_entrepreneur_id uuid;
  v_organization_id uuid;
  v_engagement_points integer;
  v_converted_source_points integer;
  v_wallet_balance integer;
  v_result jsonb;
begin
  if not exists(select 1 from iam.user_accounts u where u.id=p_actor_user_account_id and u.status='active') then
    raise exception 'ACTOR_NOT_FOUND' using errcode='P0002';
  end if;
  v_entrepreneur_id:=app_private.extension_entrepreneur(p_actor_user_account_id);
  v_organization_id:=app_private.extension_default_organization();

  select coalesce(sum(amount),0)::integer into v_engagement_points
  from engagement.point_ledger where entrepreneur_id=v_entrepreneur_id;
  select coalesce(sum(-engagement_points_delta),0)::integer into v_converted_source_points
  from engagement.reward_ledger where entrepreneur_id=v_entrepreneur_id and engagement_points_delta<0;
  select coalesce(balance,0) into v_wallet_balance from engagement.reward_wallets where entrepreneur_id=v_entrepreneur_id;
  v_wallet_balance:=coalesce(v_wallet_balance,0);

  select jsonb_build_object(
    'organization_id',v_organization_id,
    'entrepreneur_id',v_entrepreneur_id,
    'settings',(select to_jsonb(s) from experience.platform_settings s where s.organization_id=v_organization_id),
    'pending_legal_documents',coalesce((
      select jsonb_agg(to_jsonb(d) order by d.document_type)
      from governance.legal_document_versions d
      where d.organization_id=v_organization_id and d.status='published' and d.require_reacceptance
        and not exists(select 1 from governance.legal_acceptances a where a.legal_document_version_id=d.id and a.user_account_id=p_actor_user_account_id)
    ),'[]'::jsonb),
    'b2b_pages',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',p.id,'slug',p.slug,'name',p.name,'version_id',v.id,'title',v.title,'description',v.description,
        'blocks',v.blocks,'starts_at',v.starts_at,'ends_at',v.ends_at
      ) order by v.title)
      from experience.b2b_pages p
      join experience.b2b_page_versions v on v.b2b_page_id=p.id and v.status='published'
      where p.owner_organization_id=v_organization_id and p.status='active'
        and (v.starts_at is null or v.starts_at<=now()) and (v.ends_at is null or v.ends_at>now())
        and (
          exists(select 1 from experience.b2b_page_user_access a where a.b2b_page_id=p.id and a.user_account_id=p_actor_user_account_id)
          or exists(
            select 1 from experience.b2b_page_group_access ga
            join experience.b2b_group_members gm on gm.group_id=ga.group_id
            where ga.b2b_page_id=p.id and gm.user_account_id=p_actor_user_account_id
          )
        )
    ),'[]'::jsonb),
    'rewards',jsonb_build_object(
      'engagement_points',v_engagement_points,
      'converted_source_points',v_converted_source_points,
      'convertible_engagement_points',greatest(0,v_engagement_points-v_converted_source_points),
      'reward_balance',v_wallet_balance,
      'settings',coalesce((select to_jsonb(s) from engagement.reward_settings s where s.organization_id=v_organization_id),
        jsonb_build_object('source_points_per_unit',1,'reward_points_per_unit',1)),
      'catalog',coalesce((
        select jsonb_agg(to_jsonb(r) order by r.cost_points,r.name)
        from engagement.rewards r
        where r.owner_organization_id=v_organization_id and r.status='published'
          and (r.starts_at is null or r.starts_at<=now()) and (r.ends_at is null or r.ends_at>now())
          and (r.stock_quantity is null or r.stock_quantity>0)
      ),'[]'::jsonb),
      'redemptions',coalesce((
        select jsonb_agg(to_jsonb(rr)||jsonb_build_object('reward_name',r.name,'reward_type',r.reward_type) order by rr.requested_at desc)
        from engagement.reward_redemptions rr join engagement.rewards r on r.id=rr.reward_id
        where rr.entrepreneur_id=v_entrepreneur_id
      ),'[]'::jsonb),
      'ledger',coalesce((
        select jsonb_agg(to_jsonb(l) order by l.occurred_at desc)
        from (select * from engagement.reward_ledger where entrepreneur_id=v_entrepreneur_id order by occurred_at desc limit 200) l
      ),'[]'::jsonb)
    ),
    'deliveries',coalesce((
      select jsonb_agg(to_jsonb(c)||jsonb_build_object(
        'target_title',case when c.target_type='library' then liv.title else av.title end,
        'target_slug',case when c.target_type='library' then li.slug else null end,
        'submissions',coalesce((
          select jsonb_agg(to_jsonb(s)||jsonb_build_object(
            'files',coalesce((select jsonb_agg(to_jsonb(f)||jsonb_build_object(
              'original_filename',fo.original_filename,'content_type',fo.content_type,'size_bytes',fo.size_bytes
            ) order by f.position) from assessment.delivery_submission_files f join core.file_objects fo on fo.id=f.file_object_id where f.delivery_submission_id=s.id),'[]'::jsonb),
            'reviews',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc) from assessment.delivery_reviews r where r.delivery_submission_id=s.id),'[]'::jsonb)
          ) order by s.attempt_number desc)
          from assessment.delivery_submissions s where s.delivery_configuration_id=c.id and s.entrepreneur_id=v_entrepreneur_id
        ),'[]'::jsonb)
      ) order by c.updated_at desc)
      from assessment.delivery_configurations c
      left join catalog.library_item_versions liv on liv.id=c.library_item_version_id
      left join catalog.library_items li on li.id=liv.library_item_id
      left join catalog.activity_versions av on av.id=c.activity_version_id
      where c.owner_organization_id=v_organization_id and c.status='active'
        and (c.starts_at is null or c.starts_at<=now()) and (c.ends_at is null or c.ends_at>now())
        and (
          (c.target_type='library' and liv.status='published' and liv.discoverable_in_library)
          or
          (c.target_type='activity' and exists(
            select 1 from orchestration.step_instances si
            join orchestration.path_assignments pa on pa.id=si.path_assignment_id
            join orchestration.journey_instances ji on ji.id=pa.journey_instance_id
            join orchestration.enrollments en on en.id=ji.enrollment_id
            where si.activity_version_id=c.activity_version_id and en.entrepreneur_id=v_entrepreneur_id
          ))
        )
    ),'[]'::jsonb),
    'optional_diagnostics',coalesce((
      select jsonb_agg(jsonb_build_object(
        'availability',to_jsonb(a),
        'diagnostic_name',d.name,
        'version_number',v.version_number,
        'sessions',coalesce((select jsonb_agg(to_jsonb(s) order by s.attempt_number desc) from diagnostics.optional_sessions s where s.optional_availability_id=a.id and s.entrepreneur_id=v_entrepreneur_id),'[]'::jsonb),
        'dimensions',coalesce((select jsonb_agg(to_jsonb(dim) order by dim.position) from diagnostics.dimensions dim where dim.diagnostic_version_id=v.id),'[]'::jsonb),
        'questions',coalesce((
          select jsonb_agg(to_jsonb(i)||jsonb_build_object(
            'options',coalesce((select jsonb_agg(to_jsonb(o) order by o.position) from diagnostics.item_options o where o.item_id=i.id),'[]'::jsonb)
          ) order by i.position)
          from diagnostics.items i where i.diagnostic_version_id=v.id
        ),'[]'::jsonb)
      ) order by a.display_title)
      from diagnostics.optional_availability a
      join diagnostics.diagnostic_versions v on v.id=a.diagnostic_version_id
      join diagnostics.diagnostic_definitions d on d.id=v.diagnostic_definition_id
      where a.owner_organization_id=v_organization_id and a.status='published'
        and (a.starts_at is null or a.starts_at<=now()) and (a.ends_at is null or a.ends_at>now())
        and (
          coalesce(a.audience->>'type','all')='all'
          or (a.audience->>'type'='users' and (a.audience->'user_ids') ? p_actor_user_account_id::text)
        )
    ),'[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

revoke all on function public.get_participant_extensions(uuid) from public,anon,authenticated;
grant execute on function public.get_participant_extensions(uuid) to service_role;

commit;
