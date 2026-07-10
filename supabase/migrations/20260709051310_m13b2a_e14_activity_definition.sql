-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709051310
-- Remote name: m13b2a_e14_activity_definition
-- Remote SQL SHA-256: 08ad1b16b3498728dec646d628bfa9a6eb2e92aea5254f48f20831bc6a94fd83
-- Do not edit after reconciliation; corrections require a new migration.

insert into catalog.activity_definitions(id,owner_organization_id,code,activity_type,name,status)
values(app_private.e14_deterministic_uuid('e14:activity-definition'),app_private.e14_deterministic_uuid('e14:organization'),'inputs_rules_outputs','text_activity','Entradas regras saidas e validacao humana','active')
on conflict (owner_organization_id,code) do nothing;
