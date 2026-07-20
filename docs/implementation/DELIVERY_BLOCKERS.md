# Registro de bloqueadores da entrega

**Versão:** 4.2  
**Data:** 2026-07-20  
**Status:** ativo e alinhado à hierarquia canônica

A fonte superior é [SOURCE_AUTHORITY_HIERARCHY.md](../product/SOURCE_AUTHORITY_HIERARCHY.md). O escopo HubSpot atual é definido pela DEC-070.

## Regras

- `P0` bloqueia usuários reais ou a entrega oficial;
- `P1` deve ser resolvido antes da produção;
- `P2` exige aceite explícito para permanecer após piloto;
- configuração sintética não encerra requisito oficial;
- Browser E2E sintético não encerra E2E real;
- capacidade genérica não encerra conteúdo oficial;
- encerramento exige evidência proporcional;
- limitação técnica não reduz requisito superior;
- migrations aplicadas nunca são editadas.

## Bloqueadores ativos

| ID | Severidade | Lacuna | Critério de encerramento |
|---|---|---|---|
| `EXPOSED-CREDENTIAL-ROTATION` | P0 | material local de referência continha credenciais operacionais compartilhadas em texto; a cópia versionável foi sanitizada, mas rotação, revogação e análise de uso não foram confirmadas | confirmação externa de rotação/revogação, revisão de logs e ausência de uso indevido; nenhum valor deve ser registrado no Git |
| `PRODUCT-CONFIGURATION` | P0 | scoring, normalização, desempate, textos, ativações e casos oficiais ausentes | configuração reproduzível e diagnóstico oficial E2E |
| `OPENAI-JOURNEY-CONTENT` | P0 | conteúdos, mídias, avaliações, práticas, progressão, credenciais e acessibilidade incompletos | pacote editorial homologado e jornada oficial E2E |
| `IDENTITY-SITE-INTEGRATION` | P0 | login real, entrada pelo site e identidade única não comprovados | usuário existente e novo resolvidos com permissões reais |
| `HUBSPOT-ENGAGEMENT-AND-CALCULATION-DATA` | P0 | há porta e adapter em memória, mas não há inventário, matriz nem adapter real | vínculo mínimo, engajamento, variáveis de cálculo e categorias não sincronizadas testados no sandbox |
| `REAL-FULLSTACK-E2E` | P0 | backend e navegador sintéticos não formam vertical real | navegador → identidade → banco → storage/scan → credencial → HubSpot sandbox |
| `SECURITY-PRIVACY-REAL-USERS` | P0 | faltam políticas, retenção, direitos, scanner, rate limiting e comprovação completa de secret scanning | controles implementados, executados e aprovados |
| `PARTICIPANT-MUST-HAVES` | P0 | estrelas, ranking/recompensas, vídeos e partes de home/perfil incompletos | requisitos do participante operando com dados oficiais |
| `ADMIN-MUST-HAVES` | P0 | administração não cobre usuários, diagnóstico, trilhas, biblioteca, gamificação e relatórios | operador autorizado configura e acompanha capacidades publicadas |
| `BROWSER-ACCESSIBILITY` | P1 | falta auditoria completa e conteúdo oficial acessível | WCAG, legendas/transcrições e fluxos reais reexecutados |
| `AWS-STAGING` | P1 | staging não implantado | deploy, TLS, IAM, banco, storage, filas, backup, restore e rollback |
| `LEGACY-REUSE-EVIDENCE` | P2 | código-fonte do Impulso Empreendedor foi disponibilizado e assimilado, mas cópia literal permanece bloqueada até autorização/licença | matriz explícita de manter, adaptar, portar e rejeitar aprovada; nenhuma duplicação sem justificativa |
| `GITHUB-MAINTENANCE-HARDENING` | P1 | secret scanning foi adicionado na branch de execução; lint, branch protection e execução verde ainda precisam de comprovação | gates executados e branch protection/revisão verificados |

## Subgates da configuração oficial

```text
official_question_wording_approved = false
official_options_approved = false
official_scoring_approved = false
official_normalization_and_cutoffs_approved = false
official_tie_and_missing_response_policy_approved = false
official_result_copy_approved = false
official_activation_matrix_approved = false
official_reference_cases_approved = false
openai_assessments_approved = false
openai_credential_rules_approved = false
openai_journey_editorial_gate_closed = false
```

## Subgates do HubSpot

```text
hubspot_inventory_complete = false
hubspot_license_and_limits_verified = false
hubspot_sync_matrix_approved = false
identity_linking_rules_approved = false
hubspot_real_adapter_implemented = false
engagement_signals_mapped = false
calculation_variables_mapped = false
not_synced_categories_documented = false
critical_readback_tested = false
rate_limit_tested = false
reconciliation_tested = false
outage_backlog_recovery_tested = false
```

## Gates técnicos já comprovados

```text
recovered_migration_count = 245
active_migration_count = 20
clean_replay_passed = true
schema_equivalence_passed = true
public_rpc_contracts_passed = true
backend_e2e_replayed = true
configurable_product_persistence_e2e_passed = true
activity_comments_e2e_passed = true
practice_uploads_database_e2e_passed = true
learning_credentials_e2e_passed = true
content_library_e2e_passed = true
browser_e2e_synthetic_vertical_passed = true
test_public_signup_disabled_by_default = true
test_public_signup_production_guard_present = true
rls_negative_checks_passed = true
idempotency_and_concurrency_passed = true
events_and_outbox_passed = true
clean_install_linux_passed = true
clean_install_windows_passed = true
typecheck_and_build_passed = true
sanitized_premises_versioned = true
sensitive_reference_archives_ignored = true
secret_scanning_implemented = true
secret_scanning_ci_passed = false
credential_rotation_confirmed = false
impulso_reference_source_scanned = true
impulso_literal_code_reuse_authorized = false
```

## Limites das provas existentes

- backend E2E usa fixtures sintéticas;
- Browser E2E usa identidade, estado, RPCs e storage sintéticos;
- adapter HubSpot é em memória;
- estado de scan não comprova scanner real;
- Supabase não comprova AWS;
- credenciais genéricas não comprovam regras oficiais;
- biblioteca técnica não comprova acervo oficial;
- cadastro de teste não comprova identidade/site;
- implementação do scanner não equivale a execução verde no CI;
- sanitização do repositório não equivale à rotação da credencial externa;
- acesso ao código-fonte do Impulso não equivale a autorização para copiar código ou assets.

## Gate documental

```text
source_authority_hierarchy_defined = true
premissas_desenvolvimento_is_highest_authority = true
premissas_desenvolvimento_sanitized_copy_is_versioned = true
zip_documents_authoritative_for_non_technical_domains = true
technical_decisions_cannot_reduce_product_requirements = true
hubspot_scope_refined_by_dec_070 = true
multi_journey_not_an_unapproved_product_gate = true
secret_literals_not_authoritative_for_repository_storage = true
```

## Dívida não bloqueante

Helpers e RPCs legados permanecem contidos. Sua substituição ocorre somente quando necessária para segurança, integração, AWS, manutenção ou requisito oficial.
