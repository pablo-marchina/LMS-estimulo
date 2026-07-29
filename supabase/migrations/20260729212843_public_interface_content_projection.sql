create table if not exists public.interface_content_public_projection (
  organization_id uuid not null,
  organization_slug text not null,
  organization_status text not null,
  content_key text not null,
  locale text not null,
  area text not null,
  page text not null,
  element_name text not null,
  element_type text not null,
  route_pattern text,
  placement text not null,
  group_name text,
  default_value jsonb not null,
  published_value jsonb,
  primary key(organization_id,content_key,locale)
);

revoke all on public.interface_content_public_projection from public;
grant select on public.interface_content_public_projection to anon,authenticated,service_role;

create or replace function experience.sync_interface_content_public_projection()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_row experience.interface_content%rowtype;
  v_slug text;
  v_status text;
begin
  v_row:=case when tg_op='DELETE' then old else new end;
  if tg_op='DELETE' or not v_row.is_active then
    delete from public.interface_content_public_projection
    where organization_id=v_row.organization_id and content_key=v_row.content_key and locale=v_row.locale;
    return case when tg_op='DELETE' then old else new end;
  end if;
  select organization.slug,organization.status into v_slug,v_status
  from iam.organizations organization where organization.id=v_row.organization_id;
  insert into public.interface_content_public_projection(
    organization_id,organization_slug,organization_status,content_key,locale,area,page,
    element_name,element_type,route_pattern,placement,group_name,default_value,published_value
  ) values (
    v_row.organization_id,v_slug,v_status,v_row.content_key,v_row.locale,v_row.area,v_row.page,
    v_row.element_name,v_row.element_type,v_row.route_pattern,v_row.placement,v_row.group_name,
    v_row.default_value,v_row.published_value
  ) on conflict(organization_id,content_key,locale) do update set
    organization_slug=excluded.organization_slug,
    organization_status=excluded.organization_status,
    area=excluded.area,
    page=excluded.page,
    element_name=excluded.element_name,
    element_type=excluded.element_type,
    route_pattern=excluded.route_pattern,
    placement=excluded.placement,
    group_name=excluded.group_name,
    default_value=excluded.default_value,
    published_value=excluded.published_value;
  return new;
end;
$function$;

drop trigger if exists trg_sync_interface_content_public_projection on experience.interface_content;
create trigger trg_sync_interface_content_public_projection
after insert or update or delete on experience.interface_content
for each row execute function experience.sync_interface_content_public_projection();

insert into public.interface_content_public_projection(
  organization_id,organization_slug,organization_status,content_key,locale,area,page,
  element_name,element_type,route_pattern,placement,group_name,default_value,published_value
)
select
  entry.organization_id,organization.slug,organization.status,entry.content_key,entry.locale,
  entry.area,entry.page,entry.element_name,entry.element_type,entry.route_pattern,entry.placement,
  entry.group_name,entry.default_value,entry.published_value
from experience.interface_content entry
join iam.organizations organization on organization.id=entry.organization_id
where entry.is_active
on conflict(organization_id,content_key,locale) do update set
  organization_slug=excluded.organization_slug,
  organization_status=excluded.organization_status,
  area=excluded.area,
  page=excluded.page,
  element_name=excluded.element_name,
  element_type=excluded.element_type,
  route_pattern=excluded.route_pattern,
  placement=excluded.placement,
  group_name=excluded.group_name,
  default_value=excluded.default_value,
  published_value=excluded.published_value;

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
  from public.interface_content_public_projection entry
  where entry.organization_slug=lower(btrim(p_organization_slug))
    and entry.organization_status='active'
    and entry.locale=coalesce(nullif(btrim(p_locale),''),'pt-BR');
$function$;

drop view if exists public.published_interface_content_v2;
