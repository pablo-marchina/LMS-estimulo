# Registro de bloqueadores da entrega

**Versão:** 4.0  
**Data:** 2026-07-16  
**Status:** ativo e alinhado à hierarquia canônica

Este documento registra estado, lacunas e critérios de encerramento. A fonte superior é [SOURCE_AUTHORITY_HIERARCHY.md](../product/SOURCE_AUTHORITY_HIERARCHY.md).

## Regras

- `P0` bloqueia a entrada de usuários reais ou a entrega oficial;
- `P1` deve ser resolvido antes da produção;
- `P2` pode ser resolvido após piloto somente com aceite explícito;
- configuração sintética não encerra requisito oficial;
- teste de interface com backend sintético não encerra E2E real;
- capacidade genérica não encerra regra de conteúdo oficial;
- dívida técnica contida não é bloqueador sem risco ou dependência concreta;
- encerramento exige evidência executável proporcional ao requisito;
- migrations aplicadas nunca são editadas;
- limitação técnica não reduz requisito superior; gera bloqueador e alternativas.

## Bloqueadores ativos

| ID | Severidade | Lacuna | Critério de encerramento |
|---|---|---|---|
| `PRODUCT-CONFIGURATION` | P0 | faltam perguntas/opções homologadas, scoring, normalização, desempate, textos finais, ativações e casos oficiais | configuração oficial reproduzível, casos de referência, publicação controlada e E2E |
| `OPENAI-JOURNEY-CONTENT` | P0 | conteúdos, mídias, avaliações, práticas, progressão, regras de credenciais, termos e acessibilidade ainda não formam uma versão publicável | pacote editorial homologado e jornada oficial E2E |
| `IDENTITY-SITE-INTEGRATION` | P0 | cadastro de teste existe, mas login real, entrada pelo site, CPF/CNPJ/telefone/UTM e identidade única não estão comprovados | usuário existente e novo resolvidos, sessão e permissões testadas, dados sincronizados |
| `HUBSPOT-COMPLETE-USER-DATA` | P0 | há porta e adapter em memória, mas não há inventário, matriz completa, objetos/eventos reais nem cobertura de todos os dados do usuário | todas as categorias mapeadas, adapter real, identidade/deduplicação, eventos, retry, rate limit e reconciliação no sandbox |
| `REAL-FULLSTACK-E2E` | P0 | backend E2E e Browser E2E existem separadamente; o navegador sintético substitui identidade, RPC, banco e storage | navegador → identidade real → banco → storage/scan → credencial → HubSpot sandbox |
| `SECURITY-PRIVACY-REAL-USERS` | P0 | ainda faltam políticas, bases, retenção, direitos, scanner real, rate limiting, secret scanning e operação de incidente | revisão de segurança/privacidade, controles implementados e evidência operacional |
| `PARTICIPANT-MUST-HAVES` | P0 | avaliação de cinco estrelas, ranking/recompensas reais, formatos de vídeo e partes da home/perfil ainda não estão completas | requisitos de participante das premissas e issues operando com dados oficiais |
| `ADMIN-MUST-HAVES` | P0 | administração atual não cobre gestão completa de usuários, diagnóstico, trilhas, biblioteca, gamificação e relatórios | operador autorizado configura e acompanha todas as capacidades publicadas |
| `BROWSER-ACCESSIBILITY` | P1 | teclado básico e viewport mobile sintéticos existem; falta auditoria completa e conteúdo oficial acessível | auditoria WCAG, legendas/transcrições, correções e reexecução dos fluxos reais |
| `AWS-STAGING` | P1 | staging não implantado | deploy, TLS, IAM, secrets, logs, banco, storage, filas, backup, restore e rollback |
| `LEGACY-REUSE-EVIDENCE` | P2 | a premissa exige reutilização máxima responsável do repositório anterior, mas não há matriz explícita | inventário de componentes reutilizados, descartados e justificativas |
| `GITHUB-MAINTENANCE-HARDENING` | P1 | CI existe, mas faltam lint, secret scanning comprovado, revisão humana obrigatória e proteção verificável | gates, branch protection, review e supply-chain hardening comprovados |

## Subgates da configuração oficial

```text
official_configuration_manifest_present = true
official_configuration_manifest_publishable = false
official_configuration_inference_guards_present = true
official_question_count = 12
official_dimension_count = 5
official_archetype_count = 4
maturity_is_separate_axis = true
prototype_q13_is_official = false
prototype_scoring_is_official = false
exact_question_wording_approved = false
exact_options_approved = false
scoring_method_received = false
tie_rule_approved = false
result_copy_approved = false
activation_matrix_approved = false
openai_assessments_approved = false
openai_credential_rules_approved = false
openai_journey_editorial_gate_closed = false
```

## Subgates do HubSpot

```text
hubspot_inventory_complete = false
hubspot_license_and_limits_verified = false
complete_user_data_matrix_approved = false
identity_deduplication_rules_approved = false
hubspot_real_adapter_implemented = false
all_user_data_categories_mapped = false
behavioral_event_representation_tested = false
critical_readback_tested = false
rate_limit_tested = false
reconciliation_tested = false
outage_backlog_recovery_tested = false
```

## Gates técnicos já comprovados

```text
recovered_migration_count = 245
active_migration_count = 20
total_migration_count = 265
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
```

## Limites das provas existentes

- o backend E2E usa fixtures sintéticas;
- o Browser E2E usa identidade, estado, RPCs e storage sintéticos;
- o adapter HubSpot é em memória;
- o estado de scan não comprova scanner de malware real;
- o Supabase não comprova AWS;
- selos e certificados genéricos não comprovam regras oficiais;
- biblioteca técnica não comprova acervo oficial;
- cadastro de teste não comprova identidade/site.

## Gate documental encerrado

```text
source_authority_hierarchy_defined = true
premissas_desenvolvimento_is_highest_authority = true
zip_documents_authoritative_for_non_technical_domains = true
technical_decisions_cannot_reduce_product_requirements = true
hubspot_complete_user_data_requirement_restored = true
multi_journey_not_an_unapproved_product_gate = true
secret_literals_not_authoritative_for_repository_storage = true
```

## Dívida não bloqueante

Os helpers e RPCs legados permanecem inventariados e contidos. Sua substituição deve ocorrer somente quando necessária para segurança, integração, AWS, manutenção ou requisito oficial.
