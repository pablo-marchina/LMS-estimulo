create or replace function public.get_public_platform_settings()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'platform_name', s.platform_name,
    'support_phone', s.support_phone,
    'support_whatsapp', s.support_whatsapp,
    'support_email', s.support_email,
    'support_hours', s.support_hours,
    'institutional_links', coalesce(s.institutional_links, '[]'::jsonb),
    'footer_text', s.footer_text,
    'community_whatsapp_url', (
      select link->>'url'
      from jsonb_array_elements(coalesce(s.institutional_links, '[]'::jsonb)) link
      where lower(coalesce(link->>'label', '')) like '%comunidade%'
        and coalesce(link->>'url', '') ~ '^https://'
      limit 1
    ),
    'landing_page_version', case
      when s.metadata->>'landing_page_version' in ('classic_2026_08_15', 'boost_2026_08_16')
        then s.metadata->>'landing_page_version'
      else 'classic_2026_08_15'
    end
  ) into v_result
  from iam.organizations o
  left join experience.platform_settings s on s.organization_id = o.id
  where o.slug = 'estimulo' and o.status = 'active'
  limit 1;

  return coalesce(
    v_result,
    jsonb_build_object(
      'institutional_links', '[]'::jsonb,
      'landing_page_version', 'classic_2026_08_15'
    )
  );
end;
$function$;
