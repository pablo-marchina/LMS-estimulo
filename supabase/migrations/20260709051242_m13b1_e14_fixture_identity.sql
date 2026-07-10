-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709051242
-- Remote name: m13b1_e14_fixture_identity
-- Remote SQL SHA-256: 2274454180105c13a579ab556e7cd71ad0c9a6df8f4de98aed6b0bf8d0cd9337
-- Do not edit after reconciliation; corrections require a new migration.

insert into iam.permission_definitions(id,code,resource_type,action,description)
values(app_private.e14_deterministic_uuid('e14:permission:journey.definition.publish'),'journey.definition.publish','journey_definition','publish','Publish an immutable journey version graph')
on conflict (code) do nothing;

insert into iam.organizations(id,organization_type,slug,legal_name,display_name,status,metadata)
values(app_private.e14_deterministic_uuid('e14:organization'),'internal_test','estimulo-e14-internal','Plataforma Estímulo — validação técnica interna','Estímulo E14 Interno','active','{"synthetic":true,"internal_test_only":true}'::jsonb)
on conflict (slug) do nothing;

insert into iam.user_accounts(id,email_normalized,status)
values
(app_private.e14_deterministic_uuid('e14:user:operator'),'e14.operator@invalid.example','active'),
(app_private.e14_deterministic_uuid('e14:user:participant'),'e14.participant@invalid.example','active')
on conflict (email_normalized) do nothing;

insert into core.entrepreneurs(id,user_account_id,preferred_name,email_normalized,status,profile_data)
values(app_private.e14_deterministic_uuid('e14:entrepreneur'),app_private.e14_deterministic_uuid('e14:user:participant'),'Participante sintético E14','e14.participant@invalid.example','active',jsonb_build_object('synthetic',true,'internal_test_only',true,'owner_organization_id',app_private.e14_deterministic_uuid('e14:organization')))
on conflict (user_account_id) do nothing;

insert into iam.organization_memberships(id,organization_id,user_account_id,status,valid_from)
values(app_private.e14_deterministic_uuid('e14:membership:operator'),app_private.e14_deterministic_uuid('e14:organization'),app_private.e14_deterministic_uuid('e14:user:operator'),'active','2026-07-09T00:00:00Z')
on conflict do nothing;

insert into iam.role_definitions(id,organization_id,code,name,description,status)
values(app_private.e14_deterministic_uuid('e14:role:operator'),app_private.e14_deterministic_uuid('e14:organization'),'e14_operator','E14 internal operator','Controls the synthetic E14 vertical only','active')
on conflict (organization_id,code) do nothing;

insert into iam.role_permissions(role_id,permission_id)
select app_private.e14_deterministic_uuid('e14:role:operator'),pd.id from iam.permission_definitions pd
where pd.code in ('journey.definition.publish','journey.execution.manage','journey.execution.read','participant.manage','participant.read')
on conflict do nothing;

insert into iam.membership_roles(membership_id,role_id,scope,valid_from)
values(app_private.e14_deterministic_uuid('e14:membership:operator'),app_private.e14_deterministic_uuid('e14:role:operator'),'{"all":true}'::jsonb,'2026-07-09T00:00:00Z')
on conflict do nothing;

insert into catalog.programs(id,owner_organization_id,code,name,description,status,valid_from)
values(app_private.e14_deterministic_uuid('e14:program'),app_private.e14_deterministic_uuid('e14:organization'),'e14_runtime_validation','Validação técnica E14','Programa sintético interno para prova do runtime','active','2026-07-09')
on conflict (owner_organization_id,code) do nothing;

insert into orchestration.rule_definitions(id,owner_organization_id,code,rule_type,name,status)
values(app_private.e14_deterministic_uuid('e14:rule-definition:always-eligible'),app_private.e14_deterministic_uuid('e14:organization'),'e14_always_eligible','eligibility','E14 always eligible','active')
on conflict (owner_organization_id,code) do nothing;

insert into orchestration.rule_versions(id,rule_definition_id,version_number,status,language,expression,input_schema,output_schema,published_at,content_hash)
values(app_private.e14_deterministic_uuid('e14:rule-version:always-eligible:v1'),app_private.e14_deterministic_uuid('e14:rule-definition:always-eligible'),1,'published','json-logic','{"==":[1,1]}'::jsonb,'{"type":"object"}'::jsonb,'{"type":"boolean"}'::jsonb,now(),app_private.e14_request_hash('{"code":"e14_always_eligible","version":1}'::jsonb))
on conflict (rule_definition_id,version_number) do nothing;
