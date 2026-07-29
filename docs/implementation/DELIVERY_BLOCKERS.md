# Bloqueadores da entrega

**Revisado em:** 2026-07-29  
**Status:** ativo

Este arquivo registra somente lacunas que impedem staging, produção ou usuários reais. A implementação atual está descrita em [`APPLICATION_FOUNDATION.md`](APPLICATION_FOUNDATION.md).

## Regras de evidência

- `P0`: bloqueia usuários reais ou liberação oficial;
- `P1`: bloqueia produção, embora desenvolvimento controlado possa continuar;
- código presente não equivale a ambiente implantado;
- fixture, mock e teste estrutural não equivalem a prova real;
- Terraform não aplicado não equivale a infraestrutura existente;
- configuração de desenvolvimento não equivale a conteúdo ou metodologia aprovados;
- encerramento exige evidência reproduzível e aprovação quando aplicável.

## P0

| ID | Estado no repositório | Lacuna | Encerramento |
|---|---|---|---|
| `EXPOSED-CREDENTIAL-ROTATION` | arquivos sanitizados e secret scanning versionado | rotação, revogação e análise de uso não confirmadas | confirmação institucional e revisão de logs |
| `OFFICIAL-DIAGNOSTIC` | motor, persistência, editor, resolução e fluxo do participante implementados | perguntas, alternativas, scoring, empate, textos e casos oficiais não aprovados | pacote metodológico versionado e E2E real |
| `OPENAI-JOURNEY-RELEASE` | runtime de jornada, administração, atividades, avaliações, práticas, gamificação e credenciais implementados | conteúdo, mídias, regras, acessibilidade e revisão editorial oficiais incompletos | versão publicável aprovada e E2E real |
| `IDENTITY-SITE-INTEGRATION` | cadastro, confirmação, login, CPF protegido e acesso administrativo Google/RBAC implementados | site/SSO oficial, telefone, CNPJ opcional, recuperação e identidade de produção não definidos | fluxo novo/existente sem duplicidade no ambiente-alvo |
| `CPF-KEY-OPERATIONS` | AES-256-GCM, HMAC e gates server-only implementados | chaves institucionais, rotação, recuperação e suporte não exercitados | secret manager, rotação e runbook aprovados |
| `HUBSPOT-PRODUCTION-INTEGRATION` | política seletiva, contrato e adapter HTTP fail-closed implementados | inventário, propriedades, scopes, token, sandbox, worker e reconciliação ausentes | escrita/readback, retry e reconciliação em sandbox |
| `REAL-FULLSTACK-E2E` | testes de banco e verificador autenticado de deployment existem | não há prova navegador → identidade → aplicação → banco → storage → HubSpot no ambiente-alvo | execução integral com contas e dados de teste controlados |
| `SECURITY-PRIVACY-REAL-USERS` | RLS, RBAC, auditoria, idempotência, validação de arquivos e secret scanning implementados | bases legais, retenção, direitos, incidentes, rate limiting e aprovações incompletos | controles técnicos e jurídicos aprovados |

## P1

| ID | Estado no repositório | Lacuna | Encerramento |
|---|---|---|---|
| `PARTICIPANT-PASSWORD-PROTECTION` | autenticação por senha e sessão Supabase implementadas | política final e proteção contra senhas comprometidas não comprovadas | configuração e testes no provedor aprovado |
| `ACCESSIBILITY` | semântica básica, foco, skip link, responsividade e reduced motion presentes | WCAG, leitor de tela, teclado, legendas e transcrições sem auditoria final | auditoria assistiva dos fluxos reais |
| `AWS-STAGING` | Docker, probes e Terraform para ECR/ECS/ALB/RDS/S3/KMS/CloudWatch/SNS presentes | conta, domínio, certificado, secrets, adapters, plan/apply, backup e rollback ausentes | staging aplicado e exercitado |
| `GITHUB-ACTIONS-AVAILABILITY` | quatro workflows permanentes e comandos locais definidos | runs atuais encerram antes dos steps e não fornecem logs | workflows executam e checks obrigatórios ficam verdes |
| `BRANCH-PROTECTION-AND-REVIEW` | branches e PRs são usados | proteção da `main`, review obrigatório e política de merge não comprovados | configuração verificada e merge controlado |

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
```

A decisão de remover o scanner de malware é vigente. A documentação não deve voltar a tratá-lo como requisito. Novos controles de conteúdo só entram mediante threat model e decisão explícita.

## Estado técnico verificável

```text
runtime_provider = supabase_development_test
aws_resources_applied = false
rds_adapter_active = false
s3_adapter_active = false
production_identity_provider_selected = false
hubspot_sandbox_proven = false
real_authenticated_browser_verification_passed = false
current_actions_steps_executed = false
```

Números de migrations, RPCs, scripts e testes não são copiados manualmente para este documento. Eles são derivados pelos comandos e contratos versionados do repositório.