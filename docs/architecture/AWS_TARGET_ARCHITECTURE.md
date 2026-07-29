# Arquitetura-alvo na AWS

**Revisado em:** 2026-07-29  
**Status:** arquitetura canônica aprovada; adapters e infraestrutura corporativa pendentes

## Regra central

Produção será integralmente executada na AWS. Supabase permanece somente como adapter temporário de desenvolvimento, testes de integração e validação.

A decisão completa está em [`DEC-075`](../decisions/AWS_PRODUCTION_ARCHITECTURE.md).

## Arquitetura canônica

```text
DNS/Route 53 corporativo
→ CloudFront ou edge corporativo
→ AWS WAF ou controle equivalente
→ API Gateway HTTP API
→ Lambda alias versionado
→ Next.js standalone + AWS Lambda Web Adapter

Cognito User Pool
├── participantes
├── recuperação e políticas de autenticação
└── federação Google/OIDC/SAML para administração
         ↓
identidade interna, organização e RBAC do LMS

Lambda web
├── RDS Proxy → RDS PostgreSQL Multi-AZ
├── S3 privado por finalidade
├── Secrets Manager/KMS
└── CloudWatch/tracing

PostgreSQL outbox
→ dispatcher
→ SQS
→ Lambdas consumidoras
→ HubSpot e demais integrações
→ DLQ e reconciliação
```

Componentes corporativos equivalentes podem ser reutilizados, mas precisam cumprir os mesmos contratos. O inventário necessário está em [`infra/aws/PLATFORM_INTEGRATION_REQUIREMENTS.md`](../../infra/aws/PLATFORM_INTEGRATION_REQUIREMENTS.md).

## Dois providers, sem fallback

```text
PLATFORM_RUNTIME_PROVIDER=supabase  → local, test e preview
PLATFORM_RUNTIME_PROVIDER=aws       → staging e production
```

A política é aplicada pela fronteira central e pelos próprios adapters Supabase. Qualquer tentativa de criar sessão, acesso privilegiado, RPC ou storage Supabase em staging/produção falha explicitamente.

A verificação real do ambiente Supabase é executada por:

```bash
npm run verify:supabase
```

No provider AWS, a readiness permanece fail-closed até existirem probes reais de identidade, banco e storage.

## Compute

AWS Lambda é o único compute versionado para o Next.js. Não existe stack ECS/Fargate nem segundo Dockerfile na árvore ativa.

`Dockerfile.lambda`:

- produz o Next.js standalone;
- inclui AWS Lambda Web Adapter;
- seleciona `APP_ENV=production` e `PLATFORM_RUNTIME_PROVIDER=aws`;
- incorpora somente `NEXT_PUBLIC_APP_URL` como configuração pública;
- não recebe configuração Supabase;
- usa `/api/health/live` para o Web Adapter detectar que o servidor HTTP iniciou;
- mantém `/api/health/ready` como gate externo das dependências AWS;
- direciona somente cache descartável para `/tmp`.

A função será publicada por imagem ECR imutável, versão e alias. Promoção e rollback não usarão tags mutáveis.

## Identidade

Amazon Cognito User Pool será o broker OIDC padrão. Um IdP corporativo existente pode federar por OIDC ou SAML. Google pode ser federado para a administração.

A autorização continua no domínio do LMS:

```text
claims verificadas
→ external identity
→ internal user account
→ organization membership
→ capabilities/RBAC
```

Domínio de e-mail, grupo externo ou claim isolada não concede permissão diretamente.

## PostgreSQL

O destino é RDS PostgreSQL Multi-AZ, acessado pela aplicação por RDS Proxy.

A migração preserva:

- migrations imutáveis;
- funções PostgreSQL versionadas;
- transações e optimistic concurrency;
- event store e outbox;
- idempotência e auditoria;
- RLS como defesa em profundidade.

PostgREST e a Edge Function Supabase deixam de ser dependências de produção. O adapter AWS autentica a identidade Cognito, estabelece o contexto interno e executa operações aprovadas no PostgreSQL.

Antes de ativar RDS são obrigatórios replay limpo, inventário de extensões/roles, equivalência de grants e comportamento, teste de conexão via Proxy, PITR, restore e rollback.

## S3 e uploads

Buckets privados são provisionados pela infraestrutura corporativa, nunca criados durante requisições.

Todo upload de produção segue:

```text
autorização
→ intent transacional
→ chave opaca única
→ URL pré-assinada curta com checksum
→ upload direto ao S3
→ HEAD e confirmação de metadata/versão
→ reconciliação assíncrona
```

O Lambda web não recebe binários de participantes ou administradores. Downloads usam URLs temporárias após autorização.

## Assíncrono e HubSpot

A outbox do PostgreSQL continua sendo a fonte persistente. Um dispatcher publica itens em SQS. Consumidores Lambda processam integrações com concorrência limitada, retry, backoff, idempotência, DLQ, readback e reconciliação.

O request Lambda não executa trabalho permanente após devolver a resposta.

## Infraestrutura

A árvore ativa não declara recursos AWS físicos antes do inventário corporativo. Ela contém apenas:

- o container Lambda;
- o contrato de arquitetura;
- as fronteiras de provider;
- o guia operacional;
- o inventário de integração necessário.

A infraestrutura será integrada aos recursos, módulos e pipelines oficiais da empresa depois que contas, rede, edge, identidade, dados, filas, secrets e observabilidade forem conhecidos.

## Segurança e operação

A plataforma exige:

- Secrets Manager e KMS;
- least privilege por função;
- logs sem payload sensível;
- WAF, throttling e proteção contra abuso;
- CloudWatch logs, métricas, alarmes e tracing aprovado;
- métricas de Lambda, RDS Proxy, banco, S3, filas, autenticação e HubSpot;
- SLOs, on-call e runbooks;
- backup, PITR, restore, canary e rollback exercitados;
- SBOM, scanning e imagem por digest.

## Estado verificável

```text
aws_architecture_decided = true
production_compute = lambda
second_container_present = false
ecs_terraform_present = false
production_identity = cognito_or_corporate_federation
production_database = rds_postgresql_via_rds_proxy
production_storage = s3_direct_upload
production_async = sqs_and_lambda_workers
supabase_allowed_in_production = false
supabase_verification_command = present
corporate_aws_inventory_complete = false
aws_runtime_adapters_active = false
lambda_image_build_verified = false
aws_staging_deployed = false
production_ready = false
```
