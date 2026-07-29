create or replace view public.published_interface_content as
select
  entry.organization_id,
  entry.content_key,
  entry.locale,
  entry.area,
  entry.page,
  entry.element_name,
  entry.element_type,
  entry.route_pattern,
  entry.placement,
  entry.group_name,
  entry.default_value,
  entry.published_value
from experience.interface_content entry
where entry.is_active;

revoke all on experience.interface_content from anon,authenticated;
grant select on public.published_interface_content to anon,authenticated,service_role;

create or replace function public.get_published_interface_content(p_organization_slug text,p_locale text)
returns jsonb
language sql
stable
security invoker
set search_path to 'pg_catalog'
as $function$
  select coalesce(
    jsonb_object_agg(
      entry.content_key,
      entry.default_value
        || coalesce(entry.published_value,'{}'::jsonb)
        || jsonb_build_object(
          '_area',entry.area,
          '_page',entry.page,
          '_element_name',entry.element_name,
          '_element_type',entry.element_type,
          '_route_pattern',entry.route_pattern,
          '_placement',entry.placement,
          '_group_name',entry.group_name
        )
      order by entry.content_key
    ),
    '{}'::jsonb
  )
  from public.published_interface_content entry
  join iam.organizations organization on organization.id=entry.organization_id
  where organization.slug=lower(btrim(p_organization_slug))
    and organization.status='active'
    and entry.locale=coalesce(nullif(btrim(p_locale),''),'pt-BR');
$function$;

grant execute on function public.get_published_interface_content(text,text) to anon,authenticated,service_role;
