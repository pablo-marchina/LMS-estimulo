-- Reconcile the participant navigation CMS registry with the information architecture
-- actually consumed by ParticipantShell. Historical rows are retained as inactive.

begin;

update experience.interface_content
set is_active = false,
    updated_at = now()
where content_key in (
  'participant.nav.achievements',
  'participant.nav.points',
  'participant.nav.profile',
  'participant.nav.submissions'
)
  and is_active;

with registry_scope as (
  select distinct organization_id, locale
  from experience.interface_content
  where content_key = 'participant.nav.home'
), desired(content_key, element_name, description, sort_order) as (
  values
    ('participant.nav.rewards'::text, 'Recompensas'::text, 'Item de navegação para recompensas.'::text, 55::int),
    ('participant.nav.b2b'::text, 'B2B'::text, 'Item de navegação B2B quando o participante possui acesso.'::text, 65::int)
)
insert into experience.interface_content (
  organization_id,
  content_key,
  locale,
  area,
  page,
  element_name,
  element_type,
  description,
  default_value,
  published_value,
  is_active,
  route_pattern,
  placement,
  group_name,
  editor_schema,
  can_delete,
  published_at
)
select
  scope.organization_id,
  desired.content_key,
  scope.locale,
  'participant',
  'navigation',
  desired.element_name,
  'navigation',
  desired.description,
  jsonb_build_object('text', desired.element_name, 'order', desired.sort_order, 'visible', true),
  jsonb_build_object('text', desired.element_name, 'order', desired.sort_order, 'visible', true),
  true,
  null,
  'content',
  null,
  '{}'::jsonb,
  false,
  now()
from registry_scope scope
cross join desired
on conflict (organization_id, content_key, locale) do update
set area = excluded.area,
    page = excluded.page,
    element_name = excluded.element_name,
    element_type = excluded.element_type,
    description = excluded.description,
    default_value = excluded.default_value,
    is_active = true,
    route_pattern = excluded.route_pattern,
    placement = excluded.placement,
    group_name = excluded.group_name,
    editor_schema = excluded.editor_schema,
    can_delete = false,
    published_value = coalesce(experience.interface_content.published_value, excluded.published_value),
    published_at = coalesce(experience.interface_content.published_at, excluded.published_at),
    updated_at = now();

commit;
