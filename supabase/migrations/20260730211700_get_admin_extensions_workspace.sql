begin;

create or replace function public.get_admin_extensions_workspace(
  p_actor_user_account_id uuid,
  p_organization_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $$
declare
  v_result jsonb;
begin
  if not app_private.extension_admin_allowed(p_actor_user_account_id,p_organization_id) then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;

  select jsonb_build_object(
    'organization_id',p_organization_id,
    'settings',(
      select to_jsonb(s) from experience.platform_settings s where s.organization_id=p_organization_id
    ),
    'legal_documents',coalesce((
      select jsonb_agg(to_jsonb(x) order by x.document_type,x.version_number desc)
      from governance.legal_document_versions x where x.organization_id=p_organization_id
    ),'[]'::jsonb),
    'themes',coalesce((
      select jsonb_agg(
        to_jsonb(t)||jsonb_build_object(
          'library_usage_count',(select count(*) from catalog.library_item_theme_links l where l.theme_id=t.id),
          'journey_usage_count',(select count(*) from catalog.journey_theme_links j where j.theme_id=t.id)
        ) order by t.name
      )
      from catalog.themes t where t.owner_organization_id=p_organization_id and t.status<>'retired'
    ),'[]'::jsonb),
    'tracking_links',coalesce((
      select jsonb_agg(
        to_jsonb(t)||jsonb_build_object(
          'visit_count',(select count(*) from core.tracking_visits v where v.tracking_link_id=t.id),
          'associated_count',(select count(*) from core.tracking_visits v where v.tracking_link_id=t.id and v.user_account_id is not null)
        ) order by t.created_at desc
      )
      from core.tracking_links t where t.owner_organization_id=p_organization_id and t.status<>'retired'
    ),'[]'::jsonb),
    'tracking_recent_visits',coalesce((
      select jsonb_agg(to_jsonb(v) order by v.occurred_at desc)
      from (
        select tv.id,tv.tracking_link_id,tl.name as tracking_link_name,tv.user_account_id,tv.entrepreneur_id,
          tv.parameters,tv.referrer,tv.device_type,tv.browser,tv.operating_system,tv.occurred_at,tv.associated_at
        from core.tracking_visits tv join core.tracking_links tl on tl.id=tv.tracking_link_id
        where tl.owner_organization_id=p_organization_id
        order by tv.occurred_at desc limit 200
      ) v
    ),'[]'::jsonb),
    'certificate_templates',jsonb_build_object(
      'assets',coalesce((
        select jsonb_agg(to_jsonb(a)||jsonb_build_object(
          'original_filename',f.original_filename,'content_type',f.content_type,'size_bytes',f.size_bytes
        ) order by a.created_at desc)
        from engagement.certificate_template_assets a join core.file_objects f on f.id=a.file_object_id
        where a.owner_organization_id=p_organization_id and a.status='active'
      ),'[]'::jsonb),
      'assignments',coalesce((
        select jsonb_agg(to_jsonb(a) order by a.created_at desc)
        from engagement.certificate_template_assignments a
        where a.owner_organization_id=p_organization_id and a.active
      ),'[]'::jsonb)
    ),
    'b2b',jsonb_build_object(
      'groups',coalesce((
        select jsonb_agg(to_jsonb(g)||jsonb_build_object(
          'member_ids',coalesce((select jsonb_agg(m.user_account_id) from experience.b2b_group_members m where m.group_id=g.id),'[]'::jsonb)
        ) order by g.name)
        from experience.b2b_access_groups g where g.owner_organization_id=p_organization_id and g.status='active'
      ),'[]'::jsonb),
      'pages',coalesce((
        select jsonb_agg(to_jsonb(p)||jsonb_build_object(
          'versions',coalesce((select jsonb_agg(to_jsonb(v) order by v.version_number desc) from experience.b2b_page_versions v where v.b2b_page_id=p.id),'[]'::jsonb),
          'user_ids',coalesce((select jsonb_agg(a.user_account_id) from experience.b2b_page_user_access a where a.b2b_page_id=p.id),'[]'::jsonb),
          'group_ids',coalesce((select jsonb_agg(a.group_id) from experience.b2b_page_group_access a where a.b2b_page_id=p.id),'[]'::jsonb)
        ) order by p.updated_at desc)
        from experience.b2b_pages p where p.owner_organization_id=p_organization_id and p.status='active'
      ),'[]'::jsonb)
    ),
    'reward_settings',(
      select to_jsonb(s) from engagement.reward_settings s where s.organization_id=p_organization_id
    ),
    'rewards',coalesce((
      select jsonb_agg(to_jsonb(r)||jsonb_build_object(
        'redemption_count',(select count(*) from engagement.reward_redemptions rr where rr.reward_id=r.id and rr.status<>'cancelled')
      ) order by r.created_at desc)
      from engagement.rewards r where r.owner_organization_id=p_organization_id and r.status<>'retired'
    ),'[]'::jsonb),
    'redemptions',coalesce((
      select jsonb_agg(to_jsonb(x) order by x.requested_at desc)
      from (
        select rr.*,r.name as reward_name,e.preferred_name,e.legal_name,u.email_normalized
        from engagement.reward_redemptions rr
        join engagement.rewards r on r.id=rr.reward_id
        join core.entrepreneurs e on e.id=rr.entrepreneur_id
        join iam.user_accounts u on u.id=rr.user_account_id
        where r.owner_organization_id=p_organization_id
        order by rr.requested_at desc limit 500
      ) x
    ),'[]'::jsonb),
    'delivery_configurations',coalesce((
      select jsonb_agg(to_jsonb(c)||jsonb_build_object(
        'target_title',case when c.target_type='library' then liv.title else av.title end,
        'submission_count',(select count(*) from assessment.delivery_submissions s where s.delivery_configuration_id=c.id)
      ) order by c.updated_at desc)
      from assessment.delivery_configurations c
      left join catalog.library_item_versions liv on liv.id=c.library_item_version_id
      left join catalog.activity_versions av on av.id=c.activity_version_id
      where c.owner_organization_id=p_organization_id and c.status<>'retired'
    ),'[]'::jsonb),
    'delivery_submissions',coalesce((
      select jsonb_agg(to_jsonb(x) order by x.submitted_at desc)
      from (
        select s.*,c.title as delivery_title,c.target_type,e.preferred_name,e.legal_name,u.email_normalized,
          coalesce((select jsonb_agg(to_jsonb(f)||jsonb_build_object(
            'original_filename',fo.original_filename,'content_type',fo.content_type,'size_bytes',fo.size_bytes
          ) order by f.position)
          from assessment.delivery_submission_files f join core.file_objects fo on fo.id=f.file_object_id
          where f.delivery_submission_id=s.id),'[]'::jsonb) as files,
          coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc)
          from assessment.delivery_reviews r where r.delivery_submission_id=s.id),'[]'::jsonb) as reviews
        from assessment.delivery_submissions s
        join assessment.delivery_configurations c on c.id=s.delivery_configuration_id
        join core.entrepreneurs e on e.id=s.entrepreneur_id
        join iam.user_accounts u on u.id=s.user_account_id
        where c.owner_organization_id=p_organization_id
        order by s.submitted_at desc limit 500
      ) x
    ),'[]'::jsonb),
    'optional_diagnostics',coalesce((
      select jsonb_agg(to_jsonb(a)||jsonb_build_object(
        'diagnostic_name',d.name,'diagnostic_version_number',v.version_number,
        'session_count',(select count(*) from diagnostics.optional_sessions s where s.optional_availability_id=a.id)
      ) order by a.updated_at desc)
      from diagnostics.optional_availability a
      join diagnostics.diagnostic_versions v on v.id=a.diagnostic_version_id
      join diagnostics.diagnostic_definitions d on d.id=v.diagnostic_definition_id
      where a.owner_organization_id=p_organization_id and a.status<>'retired'
    ),'[]'::jsonb),
    'diagnostic_versions',coalesce((
      select jsonb_agg(jsonb_build_object('id',v.id,'version_number',v.version_number,'status',v.status,'name',d.name,'definition_id',d.id) order by d.name,v.version_number desc)
      from diagnostics.diagnostic_versions v join diagnostics.diagnostic_definitions d on d.id=v.diagnostic_definition_id
      where d.owner_organization_id=p_organization_id and v.status='published'
    ),'[]'::jsonb),
    'behavior_scores',coalesce((
      select jsonb_agg(to_jsonb(x) order by x.total_score desc)
      from (
        select s.*,e.preferred_name,e.legal_name,u.email_normalized
        from intelligence.behavior_score_snapshots s
        join core.entrepreneurs e on e.id=s.entrepreneur_id
        join iam.user_accounts u on u.id=e.user_account_id
        where s.owner_organization_id=p_organization_id
      ) x
    ),'[]'::jsonb),
    'participants',coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_account_id',u.id,'entrepreneur_id',e.id,'email',u.email_normalized,
        'name',coalesce(e.preferred_name,e.legal_name,u.email_normalized)
      ) order by coalesce(e.preferred_name,e.legal_name,u.email_normalized))
      from core.entrepreneurs e join iam.user_accounts u on u.id=e.user_account_id
      where e.status='active'
    ),'[]'::jsonb),
    'programs',coalesce((
      select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'code',p.code) order by p.name)
      from catalog.programs p where p.owner_organization_id=p_organization_id and p.status<>'retired'
    ),'[]'::jsonb),
    'journeys',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',j.id,'name',j.name,'code',j.code,'program_id',j.program_id,
        'theme_ids',coalesce((select jsonb_agg(l.theme_id) from catalog.journey_theme_links l where l.journey_definition_id=j.id),'[]'::jsonb)
      ) order by j.name)
      from catalog.journey_definitions j where j.owner_organization_id=p_organization_id and j.status<>'retired'
    ),'[]'::jsonb),
    'library_items',coalesce((
      select jsonb_agg(jsonb_build_object(
        'library_item_id',li.id,'library_item_version_id',liv.id,'title',liv.title,'status',liv.status,
        'theme_ids',coalesce((select jsonb_agg(l.theme_id) from catalog.library_item_theme_links l where l.library_item_id=li.id),'[]'::jsonb)
      ) order by liv.title)
      from catalog.library_items li
      join lateral (
        select v.* from catalog.library_item_versions v where v.library_item_id=li.id order by v.version_number desc limit 1
      ) liv on true
      where li.owner_organization_id=p_organization_id and li.status<>'retired'
    ),'[]'::jsonb),
    'activity_versions',coalesce((
      select jsonb_agg(jsonb_build_object('id',v.id,'title',v.title,'status',v.status,'definition_id',d.id,'definition_name',d.name) order by v.title)
      from catalog.activity_versions v join catalog.activity_definitions d on d.id=v.activity_definition_id
      where d.owner_organization_id=p_organization_id and v.status in ('draft','published')
    ),'[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_admin_extensions_workspace(uuid,uuid) from public,anon,authenticated;
grant execute on function public.get_admin_extensions_workspace(uuid,uuid) to service_role;

commit;
