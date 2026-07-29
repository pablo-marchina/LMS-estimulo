# Bloqueadores da entrega

**Revisado em:** 2026-07-29  
**Status:** produção bloqueada

Este arquivo registra somente lacunas que impedem staging, produção, escala segura ou usuários reais. A implementação atual está em [`APPLICATION_FOUNDATION.md`](APPLICATION_FOUNDATION.md).

## Evidência

- `P0`: bloqueia usuários reais ou release oficial;
- `P1`: bloqueia staging, produção ou escala;
- decisão, código ou Dockerfile isolado não equivalem a ambiente operável;
- fixture, mock, smoke test read-only e teste estrutural não equivalem a E2E transacional;
- encerramento exige evidência reproduzível e aprovação institucional quando aplicável.

## P0 — produto, identidade e dados reais

| ID | Estado | Lacuna | Encerramento |
|---|---|---|---|
| `EXPOSED-CREDENTIAL-ROTATION` | arquivos sanitizados e secret scanning versionado | rotação, revogação e análise de uso não confirmadas | confirmação institucional e revisão de logs |
| `OFFICIAL-DIAGNOSTIC` | motor, persistência, editor e fluxo implementados | perguntas, scoring, empate, textos e casos oficiais não aprovados | pacote metodológico e E2E oficial |
| `OPENAI-JOURNEY-RELEASE` | runtime e administração implementados | conteúdo, mídias, regras, credenciais e acessibilidade incompletos | versão editorial aprovada e E2E |
| `AWS-IDENTITY-MIGRATION` | Cognito/broker OIDC definido; identidade interna e RBAC implementados no adapter Supabase | adapter Cognito, federação, linking, recuperação, usuários existentes e site/SSO pendentes | fluxo novo/existente em AWS sem duplicidade |
| `CPF-KEY-OPERATIONS` | AES-256-GCM, HMAC e self-test implementados | keys institucionais, rotação, recuperação e suporte não exercitados | Secrets Manager/KMS e runbook aprovados |
| `HUBSPOT-PRODUCTION-INTEGRATION` | política e adapter HTTP implementados | inventário, propriedades, scopes, sandbox, SQS worker e reconciliação ausentes | escrita/readback, retry, DLQ e reconciliação comprovados |
| `REAL-TRANSACTIONAL-E2E` | smoke autenticado read-only e testes de banco existem | não há prova navegador → Cognito → Lambda → RDS → S3 → SQS → HubSpot | execução integral com contas e dados controlados |
| `SECURITY-PRIVACY-REAL-USERS` | RLS, RBAC, auditoria, idempotência e validação básica de arquivos existem | bases legais, retenção, direitos, incidentes, abuse protection e segurança de conteúdo incompletos | controles técnicos e jurídicos aprovados |

## P1 — AWS corporativa, migração e escala

| ID | Estado | Lacuna | Encerramento |
|---|---|---|---|
| `GITHUB-ACTIONS-AVAILABILITY` | workflows e comandos definidos | jobs encerram antes dos steps e sem logs | instalação, testes, typecheck, builds e gates verdes |
| `BRANCH-PROTECTION-AND-REVIEW` | branches e PRs usados | proteção da `main`, review e política de merge não comprovados | configuração verificada |
| `SUPABASE-REAL-VERIFICATION` | projeto `LMS-estimulo` está `ACTIVE_HEALTHY`; banco retornou todos os checks ready; `authenticated-rpc` está ativo com JWT obrigatório | execução do comando versionado com `.env` autorizado ainda não apresentada | `npm run verify:supabase` concluído |
| `SUPABASE-REMOTE-FUNCTION-CLEANUP` | Git mantém somente `authenticated-rpc`; nenhuma função/cron PostgreSQL referencia os resíduos | funções remotas antigas ainda ativas: `file-storage`, `file-scan-worker`, `e14-migration-export`, `auth-relink-smoke`, `auth-confirmation-post-smoke`, `internal-confirm-smoke-7f3a9b`, `internal-rpc-smoke-c4d2`, `internal-default-link-smoke-a19e`, `internal-participant-email-smoke-7c91` | excluir no dashboard/CLI de gestão e confirmar que somente funções aprovadas permanecem |
| `CORPORATE-AWS-INVENTORY` | contrato de informações versionado | contas, VPC, edge, IdP, RDS, S3, filas, secrets, observabilidade e pipeline desconhecidos | inventário e owners aprovados |
| `LAMBDA-IMAGE-VERIFICATION` | único `Dockerfile.lambda`, sem Supabase, e smoke test CI definidos | imagem ainda não foi construída e iniciada com evidência | build por digest, liveness e inspeção da imagem aprovados |
| `LAMBDA-INFRASTRUCTURE` | Lambda + API Gateway HTTP API são o alvo | função, alias, API, domínio, TLS, WAF, throttling e deploy corporativo ausentes | staging aplicado e testado |
| `AWS-RUNTIME-ADAPTERS` | selector, identity boundary, RPC e storage são fail-closed | Cognito, RDS e S3 ainda não implementados | adapters ativos e probes verdes |
| `DIRECT-UPLOADS` | contrato de intent, checksum e inspeção existe | arquivos ainda atravessam Next.js no provider Supabase | presigned PUT, checksum, HEAD e reconciliação no S3 |
| `RDS-PORTABILITY` | PostgreSQL, migrations e replay canônico versionados | replay RDS, extensões, roles, grants, RDS Proxy e equivalência não comprovados | replay e carga em RDS Multi-AZ |
| `ASYNC-WORKERS` | outbox e contratos existem | dispatcher, SQS, Lambdas, retry, DLQ e reconciliação não ativos | consumidores implantados e monitorados |
| `STATELESSNESS-AND-CACHE` | `/tmp` limitado a cache descartável | ISR/cache/locks e concorrência Lambda não exercitados | teste de múltiplos execution environments |
| `CAPACITY-AND-SLO` | arquitetura de escala definida | sem perfil de carga, reserved concurrency, cold-start budget e limites por dependência | load/soak tests e SLOs aprovados |
| `OBSERVABILITY` | CloudWatch é o alvo | logs, tracing, dashboards e alarmes de app, auth, banco, S3, filas e HubSpot ausentes | operação e on-call exercitados |
| `BACKUP-RESTORE-ROLLBACK` | RDS/PITR e aliases definidos como requisitos | restore, migrations, canary e rollback não ensaiados | exercícios aprovados |
| `ACCESSIBILITY` | semântica básica e responsividade presentes | WCAG, leitor de tela, teclado, legendas e transcrições sem auditoria final | auditoria assistiva real |

## Decisões encerradas

```text
aws_architecture_decided = true
production_compute = lambda
second_dockerfile_present = false
ecs_terraform_present = false
production_front_door = api_gateway_http_api
production_identity = cognito_or_corporate_oidc_broker
production_database = rds_postgresql_via_rds_proxy
production_storage = s3_direct_upload
production_async = sqs_lambda_workers
supabase_allowed_in_staging_or_production = false
supabase_config_in_lambda_image = false
synthetic_application_backend = absent
admin_password_login = forbidden
malware_scanner_subsystem = absent
```

## Estado verificável

```text
runtime_provider_development = supabase
runtime_provider_production = aws_required
provider_policy_on_every_lookup = implemented
supabase_adapters_reject_aws = implemented
supabase_project_status = active_healthy
supabase_database_readiness = ready
supabase_authenticated_rpc = active_verify_jwt
supabase_remote_obsolete_functions_removed = false
aws_readiness_probe = fail_closed_until_adapters
corporate_aws_inventory_complete = false
lambda_dockerfile_present = true
lambda_image_build_verified = false
lambda_function_deployed = false
cognito_adapter_active = false
rds_adapter_active = false
rds_proxy_active = false
s3_adapter_active = false
direct_uploads_implemented = false
sqs_workers_active = false
hubspot_sandbox_proven = false
transactional_aws_e2e_passed = false
production_ready = false
```
