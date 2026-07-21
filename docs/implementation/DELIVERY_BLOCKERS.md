# Registro de bloqueadores da entrega

**Versão:** 6.1  
**Data:** 2026-07-21  
**Status:** ativo

Este documento registra somente gates de produto, segurança, integração e operação. Auditorias, cobertura e decisões de reaproveitamento de materiais externos não pertencem ao repositório.

## Regras

- `P0` bloqueia usuários reais ou a entrega oficial;
- `P1` bloqueia produção, mas pode permitir desenvolvimento ou homologação controlada;
- configuração sintética não encerra requisito oficial;
- Browser E2E sintético não encerra E2E real;
- capacidade genérica não encerra conteúdo oficial;
- scaffolding não encerra deploy;
- implementação fail-closed não equivale à configuração de um terceiro;
- encerramento exige evidência proporcional;
- migrations aplicadas nunca são editadas.

## Bloqueadores ativos

| ID | Severidade | Estado implementado | Lacuna restante | Critério de encerramento |
|---|---|---|---|---|
| `EXPOSED-CREDENTIAL-ROTATION` | P0 | arquivos sanitizados e secret scanning implementado | rotação, revogação e análise de uso não confirmadas | confirmação externa, revisão de logs e ausência de uso indevido |
| `PRODUCT-CONFIGURATION` | P0 | motor configurável, persistência, versionamento, abstention e preview disponíveis | wording, opções, scoring, normalização, desempate, textos, ativações e casos oficiais ausentes | configuração aprovada e diagnóstico real E2E |
| `OPENAI-JOURNEY-CONTENT` | P0 | runtime, biblioteca, atividades, avaliações, práticas, credenciais e navegação disponíveis | pacote editorial, mídias, avaliações e regras oficiais não homologados | jornada oficial publicável e E2E |
| `PARTICIPANT-EXPERIENCE` | P0 | painel, carrossel, retomada, blocos expansíveis, escolha entre atividades disponíveis, progresso, comentários, uploads, avaliações, biblioteca, recompensas, ranking pseudonimizado, perfil, pontos e credenciais implementados | conteúdo oficial, player multimídia final, regras homologadas e prova assistiva ainda ausentes | experiência integral operando com dados, conteúdo e regras oficiais |
| `ADMIN-EXPERIENCE` | P0 | e-mail Estímulo obrigatório, RBAC, usuários, biblioteca, operação, maturidade draft, anúncios, engajamento e integrações implementados | editores completos de trilhas, diagnóstico, gamificação/recompensas e relatórios finais não concluídos | equipe autorizada configura e acompanha toda a release pela UI |
| `IDENTITY-SITE-INTEGRATION` | P0 | cadastro público, confirmação, UTM, CPF protegido e participante inicial implementados | site oficial, usuário existente, telefone, CNPJ opcional, recuperação e migração real ausentes | usuário novo e existente resolvidos sem duplicidade no ambiente-alvo |
| `CPF-KEY-MANAGEMENT` | P0 | validação, AES-256-GCM, HMAC e tabela server-only implementados | chaves reais, rotação, recovery e operação institucional ausentes | keys em secret manager, rotação exercitada e fluxo de suporte aprovado |
| `IDENTITY-PASSWORD-PROTECTION` | P1 | autenticação confirmada e configuração server-only | proteção contra senhas vazadas e política final do provedor ausentes | proteção habilitada e política de senha/sessão comprovada |
| `HUBSPOT-SELECTIVE-SYNC` | P0 | somente `linking_identifier`, `engagement_signal` e `calculation_input_or_result`; adapter HTTP, idempotência, readback e retry implementados | inventário, propriedades, scopes, token, finalidade por campo e sandbox ausentes | destinos aprovados, escrita/leitura, retry e reconciliação comprovados |
| `REAL-MALWARE-SCANNER` | P0 | contrato HTTPS, validação e fallback `manual_review` implantados | provider, URL, token e amostras reais ausentes | clean/infected/unsupported/timeout testados; somente clean liberado |
| `REAL-FULLSTACK-E2E` | P0 | backend e navegador sintéticos disponíveis | vertical real com identidade, banco, storage, scan e HubSpot ausente | navegador → identidade → banco → scan → progresso/credencial → HubSpot sandbox |
| `SECURITY-PRIVACY-REAL-USERS` | P0 | RLS, RBAC, auditoria, idempotência, secret scanning e isolamento server-only implementados | bases legais, retenção, direitos, aviso, incidentes, rate limiting e aprovações incompletos | controles técnicos e jurídicos aprovados para usuários reais |
| `BROWSER-ACCESSIBILITY` | P1 | semântica básica, foco, skip link, responsividade e redução de movimento presentes | auditoria WCAG, leitores de tela, legendas e transcrições ausentes | auditoria assistiva e fluxos reais aprovados |
| `AWS-STAGING` | P1 | container standalone, probes e Terraform para ECS/ALB/RDS/S3/SQS/KMS/CloudWatch implementados | conta, domínio, certificado, secrets, adapters, plan/apply e exercícios ausentes | staging, TLS, IAM, backup, restore, rollback e E2E comprovados |
| `GITHUB-ACTIONS-AVAILABILITY` | P1 | workflows e testes locais definidos | runs atuais encerram antes de qualquer step e sem log recuperável | Actions executa steps e checks obrigatórios ficam verdes |
| `BRANCH-PROTECTION-AND-REVIEW` | P1 | PR draft e branch separada | revisão humana e confirmação de proteção da `main` ausentes | checks verdes, review aprovado e merge controlado |

## Configuração oficial

```text
official_question_wording_approved = false
official_options_approved = false
official_scoring_approved = false
official_normalization_and_cutoffs_approved = false
official_tie_and_missing_response_policy_approved = false
official_result_copy_approved = false
official_activation_matrix_approved = false
official_test_cases_approved = false
openai_assessments_approved = false
openai_credential_rules_approved = false
openai_journey_editorial_gate_closed = false
```

## HubSpot

```text
allowed_classes = linking_identifier,engagement_signal,calculation_input_or_result
all_other_data = not_synced
hubspot_gateway_contract_defined = true
hubspot_real_adapter_implemented = true
hubspot_semantic_allowlist_implemented = true
critical_readback_contract_tested = true
rate_limit_contract_tested = true
hubspot_inventory_complete = false
hubspot_sync_destinations_approved = false
identity_linking_rules_approved = false
sandbox_write_readback_tested = false
async_sync_tested = false
reconciliation_tested = false
outage_backlog_recovery_tested = false
```

## Identidade

```text
participant_public_signup = implemented
verified_email_required = true
cpf_required = true
cpf_check_digits_validated = true
cpf_aes_gcm_protection = implemented
cpf_hmac_deduplication = implemented
cpf_raw_in_metadata_logs_urls_events = forbidden
admin_email_domain_required = estimulo.org
admin_rbac_required = true
admin_permission_granted_by_domain_alone = false
phone_capture = pending
optional_cnpj_capture = pending
official_identity_provider = pending
```

## Gates técnicos

```text
recovered_migration_count = 245
active_migration_count = 37
total_migration_count = 282
clean_replay_previously_passed = true
schema_equivalence_previously_passed = true
public_rpc_contracts_previously_passed = true
backend_e2e_synthetic_passed = true
browser_e2e_synthetic_passed = true
identity_experience_database_test_passed = true
participant_engagement_hub_test_passed = true
participant_journey_outline_test_passed = true
hubspot_contract_tests_previously_passed = true
typecheck_and_build_after_latest_experience_changes = pending
standalone_liveness_passed = true
standalone_readiness_fail_closed_passed = true
terraform_scaffolding_present = true
supabase_unindexed_foreign_key_advisories = 0
secret_scanning_implemented = true
secret_scanning_ci_passed = false
credential_rotation_confirmed = false
```

## Limites das provas existentes

- fixtures e Browser E2E sintéticos não comprovam operação real;
- HubSpot foi testado com `fetch` controlado, não em sandbox;
- scanner sem provider real retorna `manual_review`;
- Supabase de desenvolvimento não comprova AWS;
- Terraform não aplicado não comprova staging;
- biblioteca técnica não comprova acervo oficial;
- CPF protegido no código não comprova gestão institucional das chaves;
- cadastro Supabase não comprova identidade/site oficial;
- jobs de Actions sem steps não fornecem evidência funcional.
