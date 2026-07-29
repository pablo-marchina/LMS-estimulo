# Plataforma Estímulo

LMS web para desenvolvimento de empreendedores, operação de jornadas de capacitação e geração governada de dados educacionais e operacionais.

O mapa vigente está em [`PROJECT_INDEX.md`](PROJECT_INDEX.md). A arquitetura de produção integral na AWS foi aprovada pela [`DEC-075`](docs/decisions/AWS_PRODUCTION_ARCHITECTURE.md).

## Estado atual

```text
aplicação e administração       implementadas no repositório
runtime de validação            Supabase development/test
arquitetura de produção         AWS Lambda + Cognito/OIDC + RDS Proxy/RDS + S3 + SQS
provider guard                  produção rejeita Supabase
Dockerfile Lambda               presente; build e execução não comprovados
adapters AWS                    pendentes e fail-closed
infraestrutura corporativa      ainda não inventariada
HubSpot                         política/adapter; sandbox e worker pendentes
produção                        bloqueada
```

Supabase continua funcional para desenvolvimento e validação enquanto os adapters AWS são construídos. Ele não é um ambiente nem um provider permitido em produção.

O estado detalhado está em [`APPLICATION_FOUNDATION.md`](docs/implementation/APPLICATION_FOUNDATION.md), e os bloqueadores em [`DELIVERY_BLOCKERS.md`](docs/implementation/DELIVERY_BLOCKERS.md).

## Estrutura

```text
apps/web/                              aplicação Next.js
apps/web/lib/platform/                 selector e contratos de provider
config/                                configuração versionada
supabase/migrations/                   histórico PostgreSQL executável
supabase/functions/                    adapters temporários de desenvolvimento/teste
infra/aws/PLATFORM_INTEGRATION_REQUIREMENTS.md
                                        inventário necessário da AWS corporativa
infra/aws/lambda/                      contrato e operação do runtime Lambda
infra/aws/terraform/                   scaffolding ECS anterior; não aplicar
scripts/application/                   testes de lógica e contratos
scripts/database/                      replay e gates PostgreSQL
scripts/integrations/                  contratos de integração
scripts/operations/                    utilitários operacionais controlados
scripts/repository/                    governança e higiene
scripts/runtime/                       inicialização e contratos de plataforma
scripts/verification/                  smoke tests de ambientes implantados
docs/                                  produto, decisões, arquitetura e operação
```

Ferramentas pessoais de agentes, relatórios de execução, referências externas, estados locais, backends sintéticos e gatilhos manuais de deploy não pertencem ao repositório.

## Desenvolvimento com Supabase

Pré-requisitos:

- Node.js 22;
- npm 10.9.2;
- projeto Supabase autorizado para desenvolvimento/teste;
- duas chaves independentes de 32 bytes em base64 para proteção do CPF;
- Google OAuth de teste para validar a administração.

```bash
cp .env.example .env
npm ci --ignore-scripts
npm run validate:repository
npm run validate:platform-contract
npm run test:application
npm run test:product
npm run test:integrations
npm run typecheck:web
npm run build:web
npm run dev:web
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

O `.env.example` usa:

```text
APP_ENV=development
PLATFORM_RUNTIME_PROVIDER=supabase
```

## Validações permanentes

```bash
npm run validate:repository
npm run validate:dependency-lock
npm run validate:platform-contract
npm run validate:migration-history
npm run test:repository-tooling
npm run test:application
npm run test:product
npm run test:integrations
npm run test:database
npm run typecheck:web
npm run build:web
```

`npm run verify:deployment` é um smoke test autenticado read-only. Ele não substitui o E2E transacional AWS que ainda precisa exercitar Cognito, Lambda, RDS, S3, SQS e HubSpot.

## Arquitetura AWS

```text
CloudFront/edge corporativo
→ WAF
→ API Gateway HTTP API
→ Lambda alias
→ Next.js standalone

Cognito/OIDC
→ identidade interna e RBAC

Lambda
→ RDS Proxy → RDS PostgreSQL Multi-AZ
→ S3 privado com upload direto

PostgreSQL outbox
→ SQS
→ Lambdas consumidoras
→ HubSpot e DLQ
```

A AWS existente da empresa deve ser inventariada antes de declarar recursos. Use [`infra/aws/PLATFORM_INTEGRATION_REQUIREMENTS.md`](infra/aws/PLATFORM_INTEGRATION_REQUIREMENTS.md). Não criar VPC, Cognito, RDS, buckets, filas, WAF ou pipelines paralelos sem saber quais componentes corporativos já existem.

## Container Lambda

O [`Dockerfile.lambda`](Dockerfile.lambda):

- define `APP_ENV=production` e `PLATFORM_RUNTIME_PROVIDER=aws`;
- usa AWS Lambda Web Adapter;
- usa `/api/health/ready` e falha enquanto os adapters AWS não existem;
- direciona cache descartável para `/tmp`;
- mantém secrets fora da imagem.

Build de validação:

```bash
docker buildx build \
  --load \
  --provenance=false \
  --platform linux/amd64 \
  --file Dockerfile.lambda \
  --build-arg NEXT_PUBLIC_APP_URL=https://staging.example.org \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://temporary-build.example.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=temporary-public-build-key \
  --tag lms-estimulo-lambda:<commit> \
  .
```

Os argumentos públicos Supabase ainda existem temporariamente porque o cliente web AWS não foi implementado. Eles não são configuração de produção e deverão ser removidos quando o adapter Cognito estiver ativo.

O guia completo está em [`infra/aws/lambda/README.md`](infra/aws/lambda/README.md).

## Produção

A release continua bloqueada até, no mínimo:

- inventário e aprovação da AWS corporativa;
- CI funcional e imagem Lambda comprovada;
- adapters Cognito/OIDC, RDS Proxy/PostgreSQL e S3;
- uploads diretos com checksum;
- API Gateway, edge, WAF, domínio e TLS;
- SQS, workers, DLQ e HubSpot sandbox;
- observabilidade e SLOs;
- carga, concorrência e cold starts;
- backup, restore, canary e rollback;
- E2E transacional;
- conteúdo, diagnóstico, segurança, privacidade e acessibilidade aprovados.

Nenhuma afirmação de produção deve ser feita com base apenas em código, Dockerfile, Terraform, fixture, mock ou teste estrutural.
