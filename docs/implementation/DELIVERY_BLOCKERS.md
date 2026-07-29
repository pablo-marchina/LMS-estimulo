# Bloqueadores da entrega

**Revisado em:** 2026-07-29  
**Status:** produção bloqueada

Este arquivo registra somente lacunas que impedem staging, produção, escala segura ou usuários reais. A implementação atual está descrita em [`APPLICATION_FOUNDATION.md`](APPLICATION_FOUNDATION.md).

## Regras de evidência

- `P0`: bloqueia usuários reais ou liberação oficial;
- `P1`: bloqueia produção ou escala, embora desenvolvimento controlado possa continuar;
- código presente não equivale a ambiente implantado;
- imagem construída não equivale a infraestrutura operável;
- fixture, mock e teste estrutural não equivalem a prova real;
- Terraform não aplicado não equivale a infraestrutura existente;
- configuração de desenvolvimento não equivale a conteúdo ou metodologia aprovados;
- encerramento exige evidência reproduzível e aprovação quando aplicável.

## P0 — usuários reais e integridade

| ID | Estado no repositório | Lacuna | Encerramento |
|---|---|---|---|
| `EXPOSED-CREDENTIAL-ROTATION` | arquivos sanitizados e secret scanning versionado | rotação, revogação e análise de uso não confirmadas | confirmação institucional e revisão de logs |
| `OFFICIAL-DIAGNOSTIC` | motor, persistência, editor, resolução e fluxo do participante implementados | perguntas, alternativas, scoring, empate, textos e casos oficiais não aprovados | pacote metodológico versionado e E2E real |
| `OPENAI-JOURNEY-RELEASE` | runtime de jornada, administração, atividades, avaliações, práticas, gamificação e credenciais implementados | conteúdo, mídias, regras, acessibilidade e revisão editorial oficiais incompletos | versão publicável aprovada e E2E real |
| `IDENTITY-SITE-INTEGRATION` | cadastro, confirmação, login, CPF protegido e acesso administrativo Google/RBAC implementados | site/SSO oficial, recuperação, merge e identidade de produção não definidos | fluxo novo/existente sem duplicidade no ambiente-alvo |
| `CPF-KEY-OPERATIONS` | AES-256-GCM, HMAC e gates server-only implementados | chaves institucionais, rotação, recuperação e suporte não exercitados | secret manager, rotação e runbook aprovados |
| `HUBSPOT-PRODUCTION-INTEGRATION` | política seletiva, contrato e adapter HTTP fail-closed implementados | inventário, propriedades, scopes, token, sandbox, worker e reconciliação ausentes | escrita/readback, retry e reconciliação em sandbox |
| `REAL-FULLSTACK-E2E` | testes de banco e verificador autenticado de deployment existem | não há prova navegador → identidade → aplicação → banco → storage → HubSpot no ambiente-alvo | execução integral com contas e dados de teste controlados |
| `SECURITY-PRIVACY-REAL-USERS` | RLS, RBAC, auditoria, idempotência, validação de arquivos e secret scanning implementados | bases legais, retenção, direitos, incidentes, rate limiting, abuse protection e aprovações incompletos | controles técnicos e jurídicos aprovados |

## P1 — infraestrutura, escala e operação

| ID | Estado no repositório | Lacuna | Encerramento |
|---|---|---|---|
| `GITHUB-ACTIONS-AVAILABILITY` | quatro workflows permanentes e comandos locais definidos | runs atuais encerram antes dos steps e não fornecem logs | instalação, testes, typecheck e build executam em CI |
| `BRANCH-PROTECTION-AND-REVIEW` | branches e PRs são usados | proteção da `main`, review obrigatório e política de merge não comprovados | configuração verificada e merge controlado |
| `AWS-ACCOUNT-AND-STAGING` | Docker, probes e Terraform ECS presentes; imagem Lambda preparada | conta, domínio, certificado, secrets, plan/apply e ambiente de staging ausentes | staging implantado por digest e exercitado |
| `PRODUCTION-COMPUTE-SELECTION` | ECS/Fargate e imagem Lambda são opções | não há decisão por carga, latência, custo, cache e operação | ADR e benchmark aprovados |
| `LAMBDA-FRONT-DOOR` | Lambda Web Adapter incluído na imagem | API Gateway, Function URL ou ALB, domínio, TLS, forwarded headers, throttling e WAF não escolhidos | front door implantado e testado |
| `DIRECT-UPLOADS` | intents, checksum e confirmação existem; arquivos ainda atravessam o Next.js | payloads multipart de 4–10 MiB são incompatíveis com Lambda e ineficientes para escala | upload pré-assinado direto e reconciliação implementados |
| `LAMBDA-STATELESSNESS` | cache local é direcionado para `/tmp` | não há prova de que ISR, incremental cache, locks ou trabalho em memória sejam descartáveis | teste de concorrência e cache compartilhado/eliminação definidos |
| `CAPACITY-AND-CONCURRENCY` | ECS possui autoscaling básico; Lambda não possui configuração | sem SLO, perfil de carga, reserved concurrency, cold-start budget ou limite por dependência | load/soak tests e limites aprovados |
| `DATABASE-SCALE` | Supabase é o runtime atual; RDS está apenas declarado | RDS adapter e RDS Proxy ausentes; RDS baseline não é Multi-AZ | adapter, proxy/pooling, Multi-AZ e carga exercitados |
| `STORAGE-PORTABILITY` | Supabase Storage é ativo; bucket S3 privado está declarado | S3 adapter, URLs pré-assinadas, retenção e reconciliação ausentes | fluxo S3 real e falhas exercitados |
| `ASYNC-WORKERS` | outbox e contratos existem | workers de HubSpot, reconciliação, retry e DLQ não estão ativos | consumidores event-driven implantados e monitorados |
| `OBSERVABILITY-AND-SLO` | logs e dois alarmes Terraform existem | métricas de latência, erros, throttles, concorrência, cold starts, filas, auth e negócio ausentes | dashboards, alarmes, tracing policy e on-call aprovados |
| `HIGH-AVAILABILITY` | rede em duas AZs | um NAT Gateway, RDS single-AZ e nenhum teste de failover | desenho HA, failover e recuperação exercitados |
| `BACKUP-RESTORE-ROLLBACK` | backups RDS declarados e imagens imutáveis previstas | restore, migração, rollback de app/banco e DR não ensaiados | exercícios documentados e aprovados |
| `PARTICIPANT-PASSWORD-PROTECTION` | autenticação por senha e sessão Supabase implementadas | política final e proteção contra senhas comprometidas não comprovadas | configuração e testes no provedor aprovado |
| `ACCESSIBILITY` | semântica básica, foco, skip link, responsividade e reduced motion presentes | WCAG, leitor de tela, teclado, legendas e transcrições sem auditoria final | auditoria assistiva dos fluxos reais |

## Decisões já concluídas

```text
public_signup_test_route = absent
test_authentication_bypass = absent
synthetic_application_backend = absent
malware_scanner_subsystem = absent
private_file_controls = authorization,mime,extension,size,sha256
admin_password_login = forbidden
admin_google_oauth_domain_and_rbac_gate = implemented
supabase_is_production = false
lambda_image_is_production = false
```

A decisão de remover o scanner de malware é vigente. Novos controles de conteúdo só entram mediante threat model e decisão explícita.

## Estado técnico verificável

```text
runtime_provider = supabase_development_test
ci_steps_executed = false
aws_resources_applied = false
ecs_staging_applied = false
lambda_container_image_prepared = true
lambda_function_deployed = false
lambda_front_door_selected = false
direct_uploads_implemented = false
load_test_passed = false
rds_adapter_active = false
rds_proxy_declared = false
s3_adapter_active = false
production_identity_provider_selected = false
hubspot_sandbox_proven = false
hubspot_worker_active = false
real_authenticated_browser_verification_passed = false
production_ready = false
```

Números de migrations, RPCs, scripts e testes não são copiados manualmente para este documento. Eles são derivados pelos comandos e contratos versionados do repositório.
