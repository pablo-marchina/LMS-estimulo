# Arquitetura de referência para produção na AWS

**Versão:** 0.2  
**Status:** scaffolding Terraform de staging implementado; recursos não aplicados e adapters AWS ainda não selecionados pelo runtime

## 1. Objetivo

Hospedar a plataforma em uma arquitetura gerenciada, segura, observável e compatível com o modelo de domínio. A existência do baseline não comprova staging nem produção.

## 2. Baseline executável disponível

O diretório `infra/aws/terraform` declara, de forma parametrizada:

```text
Internet
  ↓ HTTPS
Application Load Balancer
  ↓
ECS/Fargate web service

VPC
  ├── subnets públicas: ALB + NAT
  ├── subnets privadas: ECS
  └── subnets isoladas: RDS PostgreSQL

S3 quarantine/protected ── SQS file_scan + DLQ
KMS ── RDS / S3 / SQS / CloudWatch
CloudWatch alarms ── SNS
```

O Terraform é bloqueado por padrão. `confirm_deployment=false`, a conta deve corresponder ao ID esperado, a imagem deve usar digest SHA-256 e os secrets são fornecidos apenas por ARN.

## 3. Evidência de empacotamento

- imagem baseada em `node:22.16.0-bookworm-slim`;
- instalação reproduzível por `npm ci`;
- output standalone do Next.js;
- execução como UID/GID 1001;
- root filesystem read-only no task definition;
- healthcheck de liveness;
- `/api/health/live` independente de banco;
- `/api/health/ready` fail-closed e ligado à readiness do PostgreSQL;
- nenhum secret server-side incorporado à imagem.

O build standalone e o comportamento 200/503 dos probes foram comprovados localmente. A imagem OCI ainda precisa ser construída e escaneada em ambiente com Docker/BuildKit.

## 4. Serviços declarados

### Compute

- ECR imutável, scan on push e criptografia KMS;
- ECS/Fargate em subnets privadas;
- mínimo de duas tarefas;
- usuário não-root e volumes efêmeros limitados;
- ALB HTTPS com certificado ACM;
- Auto Scaling por CPU;
- logs criptografados no CloudWatch.

### Banco

- RDS PostgreSQL privado e criptografado;
- senha mestre gerenciada pela AWS;
- backups automáticos, logs e Performance Insights;
- deletion protection e snapshot final;
- acesso somente pelo security group da aplicação.

Staging permanece Single-AZ no baseline. Produção exige stack separada, Multi-AZ e SLO aprovado.

### Arquivos e assíncrono

- buckets S3 privados, versionados, KMS, ACLs/policies públicas bloqueadas e SSE-C bloqueado;
- separação quarantine/protected;
- SQS de scan e DLQ com redrive;
- alarmes de idade da fila e presença na DLQ.

### Observabilidade

- container insights;
- logs de aplicação e banco;
- alarmes para 5xx do ALB, fila, DLQ e armazenamento do RDS;
- tópico SNS parametrizado.

## 5. Estado real do runtime

O Next.js continua usando Supabase Auth, Storage e RPC APIs. O baseline AWS ainda não substitui:

- identidade por Cognito ou outro provedor aprovado;
- RPC REST do Supabase por acesso direto ao RDS;
- Supabase Storage por S3;
- filas internas por SQS;
- Edge Functions por workers AWS.

Assim, RDS, S3 e SQS declarados ainda não constituem a infraestrutura ativa da aplicação.

## 6. Decisões fechadas para o baseline de staging

- Terraform como IaC inicial;
- ECS/Fargate para o web service;
- RDS PostgreSQL tradicional;
- S3 quarantine/protected;
- SQS Standard + DLQ;
- Secrets Manager por ARN;
- ALB HTTPS sem CloudFront/WAF nesta primeira prova.

CloudFront, WAF, Cognito, workers, RDS Proxy, endpoints privados, ADOT/X-Ray e estratégia blue/green permanecem decisões posteriores baseadas em carga, risco e custo.

## 7. Gates ainda obrigatórios

1. conta, região, certificado, rede, domínio e secret ARNs aprovados;
2. build OCI e scan da imagem;
3. adapters de identidade, RDS, S3 e SQS;
4. migrations e bootstrap em RDS limpo;
5. scanner real com amostras clean/infected em sandbox;
6. HubSpot sandbox e inventário físico;
7. deploy de staging e E2E real;
8. alarmes, rollback, backup, PITR e restore exercitados;
9. segurança, privacidade, acessibilidade e conteúdo homologados;
10. stack de produção aprovada separadamente.

Até essas provas, o termo correto é **scaffolding de staging**, não produção pronta.
