# Arquitetura-alvo para produção na AWS

**Versão:** 0.3  
**Status:** scaffolding Terraform de staging implementado; recursos não aplicados e adapters AWS ainda não selecionados pelo runtime

## Objetivo

Hospedar a plataforma em uma arquitetura gerenciada, segura, observável e compatível com o modelo de domínio. A existência do baseline não comprova staging nem produção.

## Baseline executável disponível

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

S3 privado para evidências
KMS ── RDS / S3 / CloudWatch
CloudWatch alarms ── SNS
```

O Terraform é bloqueado por padrão. `confirm_deployment=false`, a conta deve corresponder ao ID esperado, a imagem deve usar digest SHA-256 e os secrets são fornecidos apenas por ARN.

## Evidência de empacotamento

- imagem baseada em `node:22.16.0-bookworm-slim`;
- instalação reproduzível por `npm ci`;
- output standalone do Next.js;
- execução como UID/GID 1001;
- root filesystem read-only no task definition;
- healthcheck de liveness;
- `/api/health/live` independente de banco;
- `/api/health/ready` fail-closed e ligado à readiness do PostgreSQL;
- nenhum secret server-side incorporado à imagem.

O build standalone e o comportamento 200/503 dos probes foram comprovados antes das últimas mudanças. A validação precisa ser repetida quando um runner executar steps. A imagem OCI ainda precisa ser construída e escaneada em ambiente com Docker/BuildKit.

## Serviços declarados

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

### Arquivos privados

- bucket S3 privado, versionado e criptografado com KMS;
- ACLs e policies públicas bloqueadas;
- SSE-C bloqueado;
- objetos vinculados ao registro operacional no PostgreSQL;
- autorização server-only para upload e download;
- validação de MIME, extensão, tamanho e SHA-256;
- retenção e versões anteriores controladas por lifecycle.

### Observabilidade

- container insights;
- logs de aplicação e banco;
- alarmes para 5xx do ALB e armazenamento do RDS;
- tópico SNS parametrizado.

## Estado real do runtime

O Next.js continua usando Supabase Auth, Storage e RPC APIs. O baseline AWS ainda não substitui:

- identidade pelo provedor aprovado para produção;
- RPC REST do Supabase por acesso direto ao RDS;
- Supabase Storage por S3.

Assim, RDS e S3 declarados ainda não constituem a infraestrutura ativa da aplicação.

## Decisões do baseline de staging

- Terraform como IaC inicial;
- ECS/Fargate para o web service;
- RDS PostgreSQL tradicional;
- S3 privado e versionado para evidências;
- Secrets Manager por ARN;
- ALB HTTPS sem CloudFront/WAF nesta primeira prova.

CloudFront, WAF, Cognito, RDS Proxy, endpoints privados, ADOT/X-Ray e estratégia blue/green permanecem decisões posteriores baseadas em carga, risco e custo.

## Gates ainda obrigatórios

1. conta, região, certificado, rede, domínio e secret ARNs aprovados;
2. build OCI e scan da imagem;
3. adapters de identidade, RDS e S3;
4. migrations e bootstrap em RDS limpo;
5. HubSpot sandbox e inventário físico;
6. deploy de staging e E2E real;
7. alarmes, rollback, backup, PITR e restore exercitados;
8. segurança, privacidade, acessibilidade e conteúdo homologados;
9. stack de produção aprovada separadamente.

Até essas provas, o termo correto é **scaffolding de staging**, não produção pronta.
