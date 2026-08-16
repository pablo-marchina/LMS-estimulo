create or replace function public.get_participant_shell_context(p_actor_user_account_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_organization_id uuid;
  v_result jsonb;
begin
  if not exists (
    select 1 from iam.user_accounts u
    where u.id = p_actor_user_account_id and u.status = 'active'
  ) then
    raise exception 'ACTOR_NOT_FOUND' using errcode = 'P0002';
  end if;

  v_organization_id := app_private.extension_default_organization();

  select jsonb_build_object(
    'organization_id', v_organization_id,
    'pending_legal_documents', coalesce((
      select jsonb_agg(to_jsonb(d) order by d.document_type)
      from governance.legal_document_versions d
      where d.organization_id = v_organization_id
        and d.status = 'published'
        and d.require_reacceptance
        and not exists (
          select 1
          from governance.legal_acceptances a
          where a.legal_document_version_id = d.id
            and a.user_account_id = p_actor_user_account_id
        )
    ), '[]'::jsonb),
    'has_b2b_access', exists (
      select 1
      from experience.b2b_pages p
      join experience.b2b_page_versions v
        on v.b2b_page_id = p.id and v.status = 'published'
      where p.owner_organization_id = v_organization_id
        and p.status = 'active'
        and (v.starts_at is null or v.starts_at <= now())
        and (v.ends_at is null or v.ends_at > now())
        and (
          exists (
            select 1 from experience.b2b_page_user_access a
            where a.b2b_page_id = p.id and a.user_account_id = p_actor_user_account_id
          )
          or exists (
            select 1
            from experience.b2b_page_group_access ga
            join experience.b2b_group_members gm on gm.group_id = ga.group_id
            where ga.b2b_page_id = p.id and gm.user_account_id = p_actor_user_account_id
          )
        )
    )
  ) into v_result;

  return v_result;
end;
$function$;

revoke all on function public.get_participant_shell_context(uuid) from public, anon, authenticated;
grant execute on function public.get_participant_shell_context(uuid) to service_role;
