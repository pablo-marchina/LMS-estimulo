-- Recovered from supabase_migrations.schema_migrations.
-- Remote version: 20260709051346
-- Remote name: m13b3a_e14_diagnostic_structure
-- Remote SQL SHA-256: 888617f8245bf04a25f42f6efda231082a54eaf251c05a92f195107488ab8d54
-- Do not edit after reconciliation; corrections require a new migration.

insert into diagnostics.diagnostic_definitions(id,owner_organization_id,code,name,purpose,status)
values(app_private.e14_deterministic_uuid('e14:diagnostic-definition'),app_private.e14_deterministic_uuid('e14:organization'),'e14_runtime_readiness_diagnostic','Diagnostico tecnico E14','Selecionar caminho sintetico sem inferencia externa.','active')
on conflict (owner_organization_id,code) do nothing;

insert into diagnostics.diagnostic_versions(id,diagnostic_definition_id,version_number,status,configuration,published_at,content_hash)
values(
 app_private.e14_deterministic_uuid('e14:diagnostic-version:v1'),
 app_private.e14_deterministic_uuid('e14:diagnostic-definition'),
 1,
 'draft',
 '{"visibility":"internal_test_only","purpose":"Selecao de caminho tecnico sem validade psicometrica educacional ou de credito","assignment_rule":{"low_confidence_when":"uncertain_answer_count >= 2","guided_when":"low_confidence OR tool_familiarity <= 2 OR review_autonomy <= 2","standard_when":"NOT low_confidence AND tool_familiarity >= 3 AND review_autonomy >= 3","fallback_path":"guided"}}'::jsonb,
 now(),
 app_private.e14_request_hash('{"visibility":"internal_test_only","assignment_rule":{"fallback_path":"guided"}}'::jsonb)
)
on conflict (diagnostic_definition_id,version_number) do nothing;

insert into diagnostics.dimensions(id,diagnostic_version_id,code,name,description,minimum_answer_ratio,position) values
(app_private.e14_deterministic_uuid('e14:dimension:tool'),app_private.e14_deterministic_uuid('e14:diagnostic-version:v1'),'tool_familiarity','Familiaridade com ferramentas','Soma interna de duas respostas na faixa de zero a quatro.',1,1),
(app_private.e14_deterministic_uuid('e14:dimension:review'),app_private.e14_deterministic_uuid('e14:diagnostic-version:v1'),'review_autonomy','Autonomia de revisao','Soma interna de duas respostas na faixa de zero a quatro.',1,2)
on conflict (diagnostic_version_id,code) do nothing;
