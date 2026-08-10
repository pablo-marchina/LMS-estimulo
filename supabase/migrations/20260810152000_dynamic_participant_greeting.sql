set lock_timeout = '5s';
set statement_timeout = '5min';

-- Preserve the participant's first name even when the header text is managed by
-- Interface. Only known legacy defaults are rewritten; administrator-authored
-- custom text remains untouched. The editor description documents the supported
-- variable so the greeting can be changed without losing personalization.
update experience.interface_content entry
set
  element_name = 'Saudação com nome',
  description = 'Saudação da página inicial. Use {{nome}} para inserir automaticamente o primeiro nome do participante. Ex.: Olá, {{nome}}!',
  editor_schema = coalesce(entry.editor_schema, '{}'::jsonb) || jsonb_build_object(
    'template_variables', jsonb_build_array(jsonb_build_object(
      'token', '{{nome}}',
      'label', 'Primeiro nome do participante'
    ))
  ),
  default_value = jsonb_set(
    coalesce(entry.default_value, '{}'::jsonb),
    '{text}',
    to_jsonb('Olá, {{nome}}!'::text),
    true
  ),
  published_value = case
    when entry.published_value is null then null
    when coalesce(entry.published_value->>'text', '') in ('Olá!', 'Olá, empreendedor!', 'Olá, Empreendedor!') then
      jsonb_set(entry.published_value, '{text}', to_jsonb('Olá, {{nome}}!'::text), true)
    else entry.published_value
  end,
  draft_value = case
    when entry.draft_value is null then null
    when coalesce(entry.draft_value->>'text', '') in ('Olá!', 'Olá, empreendedor!', 'Olá, Empreendedor!') then
      jsonb_set(entry.draft_value, '{text}', to_jsonb('Olá, {{nome}}!'::text), true)
    else entry.draft_value
  end,
  updated_at = now()
from iam.organizations organization
where organization.id = entry.organization_id
  and organization.slug = 'estimulo'
  and entry.locale = 'pt-BR'
  and entry.content_key = 'participant.page.overview.header.eyebrow';
