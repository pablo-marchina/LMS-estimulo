# Registro de bloqueadores da entrega

**Versão:** 5.0  
**Data:** 2026-07-20  
**Status:** ativo e alinhado à hierarquia canônica

A fonte superior é [SOURCE_AUTHORITY_HIERARCHY.md](../product/SOURCE_AUTHORITY_HIERARCHY.md). O escopo HubSpot atual é definido pela DEC-070.

## Regras

- `P0` bloqueia usuários reais ou a entrega oficial;
- `P1` bloqueia produção, mas pode permitir desenvolvimento ou homologação controlada;
- `P2` exige aceite explícito para permanecer após piloto;
- configuração sintética não encerra requisito oficial;
- Browser E2E sintético não encerra E2E real;
- capacidade genérica não encerra conteúdo oficial;
- scaffolding de infraestrutura não encerra deploy;
- implementação fail-closed não equivale à configuração de um terceiro;
- encerramento exige evidência proporcional;
- migrations aplicadas nunca são editadas.

## Bloqueadores ativos

| ID | Severidade | Estado implementado | Lacuna restante | Critério de encerramento |
|---|---|---|---|---|
| `EXPOSED-CREDENTIAL-ROTATION` | P0 | arquivos versionáveis sanitizados, pacotes sensíveis ignorados e secret scanning implementado | rotação, revogação e análise de uso não confirmadas | confirmação externa de rotação/revogação, revisão de logs e ausência de uso indevido |
| `PRODUCT-CONFIGURATION` | P0 | motor configurável, persistência, versionamento, abstention e preview disponíveis | wording, opções, scoring, normalização, desempate, textos, ativações e casos oficiais ausentes | configuração oficial aprovada e diagnóstico real E2E |
| `OPENAI-JOURNEY-CONTENT` | P0 | runtime, biblioteca, atividades, avaliações, práticas, credenciais e navegação genéricos disponíveis | pacote editorial, mídias, avaliações e regras oficiais não homologados | pacote editorial acessível, versionado e jornada oficial E2E |
| `IDENTITY-SITE-INTEGRATION` | P0 | cadastro público, confirmação de e-mail, first-touch e papel inicial de participante implementados em Supabase de desenvolvimento | entrada pelo site oficial, identidade única e migração/prova com usuários reais | usuário novo e existente resolvidos com identidade oficial e permissões reais |
| `HUBSPOT-ENGAGEMENT-AND-CALCULATION-DATA` | P0 | política allowlist, adapter HTTP real server-only, idempotência, readback, conflito de versão e classificação de erros implementados | inventário do portal, IDs/objetos, propriedades, scopes, token, matriz e sandbox ausentes | destinos aprovados, escrita/leitura em sandbox, retry, reconciliação e backlog comprovados |
| `REAL-MALWARE-SCANNER` | P0 | contrato externo HTTPS, validação estrita e fallback `manual_review` implantados | URL/token/provider e amostras reais não fornecidos | arquivos clean e infected testados no provider aprovado; somente clean é liberado |
| `REAL-FULLSTACK-E2E` | P0 | backend e navegador sintéticos, readiness e adapters genéricos existentes | vertical real com identidade, banco, storage, scan e HubSpot sandbox ausente | navegador → identidade → banco → storage/scan → progresso/credencial → HubSpot sandbox |
| `SECURITY-PRIVACY-REAL-USERS` | P0 | RLS, RBAC, auditoria, idempotência, scanner fail-closed, secret scanning e isolamento server-only implementados | bases legais, retenção, direitos, aviso, incidentes, fornecedores, rate limiting e aprovações incompletos | controles técnicos e jurídicos executados e aprovados para usuários reais |
| `PARTICIPANT-MUST-HAVES` | P0 | cadastro, painel, atividades, avaliações, comentários, uploads, biblioteca, credenciais e nota de utilidade 1–5 implementados | ranking/recompensas, vídeos e partes oficiais de home/perfil dependem de regra e conteúdo homologados | experiência completa operando com dados e conteúdos oficiais |
| `ADMIN-MUST-HAVES` | P0 | RBAC, usuários, biblioteca, maturidade draft e links de integrações implementados | editor oficial de diagnóstico/trilhas, gamificação e relatórios finais não homologados | operador autorizado configura e acompanha todas as capacidades publicadas |
| `BROWSER-ACCESSIBILITY` | P1 | semântica básica, skip link e estados de UI presentes | auditoria WCAG completa, leitores de tela e conteúdo oficial com legendas/transcrições ausentes | auditoria assistiva e fluxos reais aprovados |
| `AWS-STAGING` | P1 | container standalone, probes e Terraform parametrizado para ECS/ALB/RDS/S3/SQS/KMS/CloudWatch implementados | conta, região, domínio, certificado, secrets, adapters AWS, plan/apply e exercícios operacionais ausentes | deploy de staging, TLS, IAM, banco, storage, filas, backup, restore, rollback e E2E |
| `LEGACY-REUSE-EVIDENCE` | P2 | matriz de reutilização e assimilação conceitual do Impulso documentadas | cópia literal continua sem licença/autorização demonstrada | autorização/licença explícita ou manutenção da reimplementação independente |
| `GITHUB-ACTIONS-AVAILABILITY` | P1 | workflows permanentes, testes locais e diagnósticos definidos; workflow temporário removido | runs atuais encerram com `failure` antes de qualquer step e sem log recuperável | runner/Actions volta a executar steps e todos os checks obrigatórios ficam verdes |
| `BRANCH-PROTECTION-AND-REVIEW` | P1 | PR draft, branch separada e branch naming válidos | revisão humana e confirmação de proteção da `main` ausentes | checks verdes, review aprovado e merge controlado |

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
hubspot_gateway_contract_defined = true
hubspot_real_adapter_implemented = true
hubspot_semantic_allowlist_implemented = true
not_synced_categories_documented = true
critical_readback_contract_tested = true
rate_limit_contract_tested = true
hubspot_inventory_complete = false
hubspot_license_and_limits_verified = false
hubspot_sync_matrix_approved = false
identity_linking_rules_approved = false
engagement_destinations_mapped = false
calculation_variables_mapped = false
sandbox_write_readback_tested = false
async_sync_tested = false
reconciliation_tested = false
outage_backlog_recovery_tested = false
```

## Gates técnicos comprovados

```text
recovered_migration_count = 245
active_migration_count = 30
total_migration_count = 275
clean_replay_passed = true
schema_equivalence_passed = true
public_rpc_contracts_passed = true
backend_e2e_replayed = true
configurable_product_persistence_e2e_passed = true
activity_comments_e2e_passed = true
practice_uploads_database_e2e_passed = true
learning_credentials_e2e_passed = true
content_library_e2e_passed = true
public_signup_database_e2e_passed = true
rbac_role_management_e2e_passed = true
business_maturity_draft_e2e_passed = true
business_maturity_preview_e2e_passed = true
activity_utility_rating_e2e_passed = true
application_readiness_e2e_passed = true
browser_e2e_synthetic_vertical_passed = true
rls_negative_checks_passed = true
idempotency_and_concurrency_passed = true
events_and_outbox_passed = true
clean_install_linux_previously_passed = true
clean_install_windows_previously_passed = true
typecheck_and_build_local_passed = true
standalone_server_liveness_passed = true
standalone_server_readiness_fail_closed_passed = true
terraform_scaffolding_present = true
terraform_local_hcl_parse_previously_passed = true
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
- adapter HubSpot real foi testado com `fetch` controlado, não em portal sandbox;
- scanner externo está implantado, mas sem provider real configurado retorna `manual_review`;
- Supabase de desenvolvimento não comprova AWS;
- Terraform declarativo não comprova `plan`, `apply`, backup, restore ou rollback;
- credenciais genéricas não comprovam regras oficiais;
- biblioteca técnica não comprova acervo oficial;
- cadastro Supabase não comprova identidade/site oficial;
- sanitização do repositório não equivale à rotação da credencial externa;
- acesso ao código-fonte do Impulso não equivale a autorização para copiar código ou assets;
- jobs do GitHub Actions sem steps não fornecem evidência funcional positiva ou negativa.

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
