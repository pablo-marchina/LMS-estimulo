-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709051610
-- Remote name: m13b4_e14_points_and_journey
-- Remote SQL SHA-256: 08c5a9502bd32bb63e64eae62f0d0054818fd8fa8cb9bd29d797a7205c8ffa9f
-- Do not edit after reconciliation; corrections require a new migration.

insert into engagement.point_rule_definitions(id,owner_organization_id,code,name,status) values
(app_private.e14_deterministic_uuid('e14:point-definition:activity'),app_private.e14_deterministic_uuid('e14:organization'),'e14_activity_complete_v1','E14 activity completion','active'),
(app_private.e14_deterministic_uuid('e14:point-definition:check'),app_private.e14_deterministic_uuid('e14:organization'),'e14_quick_check_pass_v1','E14 quick check pass','active')
on conflict (owner_organization_id,code) do nothing;

insert into engagement.point_rule_versions(id,point_rule_definition_id,version_number,status,amount,eligibility_rule_version_id,recurrence_policy,published_at) values
(app_private.e14_deterministic_uuid('e14:point-version:activity:v1'),app_private.e14_deterministic_uuid('e14:point-definition:activity'),1,'draft',5,app_private.e14_deterministic_uuid('e14:rule-version:always-eligible:v1'),'{"scope":"enrollment_activity","maximum":1,"transferable":false}'::jsonb,now()),
(app_private.e14_deterministic_uuid('e14:point-version:check:v1'),app_private.e14_deterministic_uuid('e14:point-definition:check'),1,'draft',2,app_private.e14_deterministic_uuid('e14:rule-version:always-eligible:v1'),'{"scope":"enrollment_assessment","maximum":1,"transferable":false}'::jsonb,now())
on conflict (point_rule_definition_id,version_number) do nothing;

insert into catalog.journey_definitions(id,program_id,owner_organization_id,code,slug,name,purpose,status)
values(app_private.e14_deterministic_uuid('e14:journey-definition'),app_private.e14_deterministic_uuid('e14:program'),app_private.e14_deterministic_uuid('e14:organization'),'e14_runtime_validation_journey','e14-runtime-validation','Validacao tecnica do fluxo de aprendizagem','Jornada sintetica interna para prova do runtime multi jornada.','active')
on conflict (owner_organization_id,code) do nothing;

insert into catalog.journey_versions(id,journey_definition_id,version_number,status,title,description,configuration,schema_version,published_at,retired_at,content_hash,created_by)
values(
 app_private.e14_deterministic_uuid('e14:journey-version:v1'),
 app_private.e14_deterministic_uuid('e14:journey-definition'),
 1,
 'draft',
 'Validacao tecnica do fluxo de aprendizagem',
 'Jornada sintetica interna usada exclusivamente para provar o runtime multi jornada.',
 jsonb_build_object(
   'visibility','internal_test_only',
   'language','pt-BR',
   'publishable_to_real_participants',false,
   'partner_attribution',null,
   'diagnostic_version_id',app_private.e14_deterministic_uuid('e14:diagnostic-version:v1'),
   'activity_version_id',app_private.e14_deterministic_uuid('e14:activity-version:v1'),
   'path_codes',jsonb_build_array('guided','standard'),
   'point_rule_version_ids',jsonb_build_array(app_private.e14_deterministic_uuid('e14:point-version:activity:v1'),app_private.e14_deterministic_uuid('e14:point-version:check:v1')),
   'maximum_internal_points',7
 ),
 'e14.1',
 null,
 null,
 'pending',
 app_private.e14_deterministic_uuid('e14:user:operator')
)
on conflict (journey_definition_id,version_number) do nothing;

update catalog.activity_versions set content_hash=app_private.e14_request_hash(configuration) where id=app_private.e14_deterministic_uuid('e14:activity-version:v1') and status='draft';
update diagnostics.diagnostic_versions set content_hash=app_private.e14_request_hash(configuration) where id=app_private.e14_deterministic_uuid('e14:diagnostic-version:v1') and status='draft';
update catalog.journey_versions set content_hash=app_private.e14_request_hash(configuration) where id=app_private.e14_deterministic_uuid('e14:journey-version:v1') and status='draft';
