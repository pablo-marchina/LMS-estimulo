# Registro de bloqueadores da entrega

**Versão:** 3.7  
**Data:** 2026-07-15  
**Status:** ativo

Este documento registra somente estado, lacunas e critérios de encerramento. A ordem de execução e o plano de ação não são versionados no repositório.

## Regras

- `P0` bloqueia a implementação oficial ou a entrada de usuários reais;
- `P1` deve ser resolvido antes da produção;
- configuração sintética não encerra requisito oficial;
- dívida técnica contida não é bloqueador sem risco ou dependência concreta;
- encerramento exige evidência executável proporcional ao requisito;
- migrations aplicadas não são editadas.

## Bloqueadores ativos

| ID | Severidade | Lacuna | Critério de encerramento |
|---|---|---|---|
| `PRODUCT-CONFIGURATION` | P0 | o manifesto estrutural existe e impede inferências, mas ainda faltam perguntas/opções homologadas, scoring, desempate, textos finais, ativações, avaliações, regras de credencial e Jornada OpenAI publicável | configuração oficial reproduzível, casos de referência, publicação controlada e E2E |
| `IDENTITY-SITE-INTEGRATION` | P0 | login real e entrada pelo site não comprovados | identidade única, sessão e permissões testadas |
| `HUBSPOT-PHYSICAL-INTEGRATION` | P0 | adapter e modelo físico reais ausentes | inventário, matriz de projeção, retry, reconciliação e E2E no sandbox |
| `BROWSER-ACCESSIBILITY` | P1 | navegador, mobile e acessibilidade não comprovados | E2E e auditoria dos fluxos críticos |
| `AWS-STAGING` | P1 | staging não implantado | deploy, TLS, secrets, logs, backup, restore e rollback |

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

## Gates técnicos encerrados

```text
recovered_migration_count = 245
active_migration_count = 12
total_migration_count = 257
clean_replay_passed = true
schema_equivalence_passed = true
public_rpc_contracts_passed = true
backend_e2e_replayed = true
configurable_product_persistence_e2e_passed = true
activity_comments_e2e_passed = true
activity_comments_remote_surface_verified = true
practice_uploads_e2e_passed = true
practice_uploads_remote_surface_verified = true
storage_and_scan_have_runtime_consumer = true
multi_question_assessment_ui_passed = true
learning_credentials_e2e_passed = true
learning_credentials_remote_surface_verified = true
certificate_public_page_implemented = true
certificate_direct_anonymous_rpc_disabled = true
lms_must_haves_technical_gate_closed = true
rls_negative_checks_passed = true
idempotency_and_concurrency_passed = true
events_and_outbox_passed = true
clean_install_linux_passed = true
clean_install_windows_passed = true
typecheck_and_build_passed = true
```

O gate técnico de must-haves do LMS está encerrado para comentários, uploads, avaliações, selos e certificados genéricos. A publicação da Jornada OpenAI continua bloqueada pelas versões oficiais de conteúdo, correção e regras de credencial, registradas em `PRODUCT-CONFIGURATION`.

O manifesto em `config/official-diagnostic/v3/manifest.json` é deliberadamente bloqueado. Ele registra apenas estrutura confirmada e não autoriza seed, preview ou publicação enquanto os artefatos P0 permanecerem ausentes ou conflitantes.

## Dívida não bloqueante

Os helpers e RPCs legados permanecem inventariados e contidos. Não haverá substituição em massa nem refatoração cosmética no caminho crítico.
