-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709051322
-- Remote name: m13b2b_e14_activity_version
-- Remote SQL SHA-256: 395d8e8e04f65d7038292da7178c19c4edf295b2cb410ae73fbb427896012577
-- Do not edit after reconciliation; corrections require a new migration.

insert into catalog.activity_versions(id,activity_definition_id,version_number,status,title,description,activity_type,configuration,estimated_minutes,published_at,content_hash,created_by)
values(
 app_private.e14_deterministic_uuid('e14:activity-version:v1'),
 app_private.e14_deterministic_uuid('e14:activity-definition'),
 1,
 'draft',
 'Entradas regras saidas e validacao humana',
 'Distinguir entrada regra saida e validacao humana.',
 'text_activity',
 '{"visibility":"internal_test_only","language":"pt-BR","content_sections":[{"code":"input","heading":"Entrada","body":"Entrada e a informacao fornecida ao processo."},{"code":"rule","heading":"Regra","body":"Regra e a condicao aplicada a entrada."},{"code":"output","heading":"Saida","body":"Saida e o resultado produzido apos aplicar a regra."},{"code":"human_validation","heading":"Validacao humana","body":"A pessoa verifica entrada regra e saida antes de usar o resultado."}],"guided_context":{"estimated_minutes":2,"body":"No caminho guiado cada componente e destacado separadamente."},"accessibility":{"text_first":true,"requires_audio":false,"requires_video":false,"keyboard_only_supported":true,"screen_reader_labels_required":true,"color_not_sole_indicator":true},"real_participant_use_authorized":false}'::jsonb,
 6,
 null,
 app_private.e14_request_hash('{"visibility":"internal_test_only","language":"pt-BR","content_sections":[{"code":"input"},{"code":"rule"},{"code":"output"},{"code":"human_validation"}]}'::jsonb),
 app_private.e14_deterministic_uuid('e14:user:operator')
)
on conflict (activity_definition_id,version_number) do nothing;
