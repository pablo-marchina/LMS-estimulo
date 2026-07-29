# Plataforma Estímulo

LMS web para desenvolvimento de empreendedores, operação de jornadas de capacitação e geração governada de dados educacionais e operacionais.

O mapa vigente está em [`PROJECT_INDEX.md`](PROJECT_INDEX.md). A arquitetura de produção integral na AWS segue a [`DEC-075`](docs/decisions/AWS_PRODUCTION_ARCHITECTURE.md).

## Dois runtimes suportados

```text
local, test e preview      Supabase
staging e production       AWS
```

- Supabase mantém autenticação, PostgreSQL, Storage e `authenticated-rpc` para desenvolvimento e validação.
- AWS Lambda é o único artefato de compute de produção.
- staging e produção rejeitam qualquer tentativa de usar o provider Supabase.
- adapters AWS ainda incompletos permanecem fail-closed.

## Estado atual

```text
aplicação e administração       implementadas no repositório
Supabase de teste               funcional por configuração; verificação real explícita
Dockerfile Lambda               único container versionado
provider guard                  Supabase proibido em staging/produção
adapters Cognito/RDS/S3         pendentes e fail-closed
infraestrutura corporativa      ainda não inventariada
produção                        bloqueada
```

O estado detalhado está em [`APPLICATION_FOUNDATION.md`](docs/implementation/APPLICATION_FOUNDATION.md), e os bloqueadores em [`DELIVERY_BLOCKERS.md`](docs/implementation/DELIVERY_BLOCKERS.md).

## Estrutura

```text
apps/web/                              aplicação Next.js
apps/web/lib/platform/                 seleção e contratos de provider
apps/web/lib/supabase/                 adapter de desenvolvimento/teste
config/platform/                       contrato de produção legível por máquina
supabase/migrations/                   histórico PostgreSQL executável
supabase/functions/                    Edge Functions de teste
Dockerfile.lambda                      único container da aplicação
infra/aws/lambda/                      contrato operacional do runtime Lambda
infra/aws/PLATFORM_INTEGRATION_REQUIREMENTS.md
                                       inventário da AWS corporativa
scripts/runtime/                       gates de configuração e arquitetura
scripts/verification/                  verificações explícitas de ambientes reais
```

Não existe stack ECS/Fargate nem segundo Dockerfile na árvore ativa.

## Desenvolvimento e testes com Supabase

Pré-requisitos:

- Node.js 22;
- npm 10.9.2;
- projeto Supabase autorizado;
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

O `.env` de teste deve usar:

```text
APP_ENV=development
PLATFORM_RUNTIME_PROVIDER=supabase
```

A verificação read-only do ambiente Supabase real é separada:

```bash
npm run verify:supabase
```

Ela verifica Auth, o contrato `get_application_readiness` do PostgreSQL e se a Edge Function autenticada está acessível e protegida. O comando não cria usuários nem altera dados.

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

`npm run verify:deployment` é um smoke test autenticado read-only de um ambiente implantado. Ele não substitui o E2E transacional AWS.

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

A AWS existente da empresa deve ser inventariada antes de declarar recursos. Use [`infra/aws/PLATFORM_INTEGRATION_REQUIREMENTS.md`](infra/aws/PLATFORM_INTEGRATION_REQUIREMENTS.md). Não criar infraestrutura paralela sem identificar os componentes corporativos existentes.

## Container Lambda

O [`Dockerfile.lambda`](Dockerfile.lambda):

- define `APP_ENV=production` e `PLATFORM_RUNTIME_PROVIDER=aws`;
- não recebe nem incorpora configuração Supabase;
- usa AWS Lambda Web Adapter;
- usa `/api/health/live` apenas para o adapter detectar que o servidor HTTP iniciou;
- mantém `/api/health/ready` como gate externo fail-closed das dependências AWS;
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
  --tag lms-estimulo-lambda:<commit> \
  .
```

O Web CI também inicia o container, exige liveness `200` e confirma que readiness continua `503` sem os adapters AWS reais.

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

Nenhuma afirmação de produção deve ser feita com base apenas em código, Dockerfile, fixture, mock ou teste estrutural.
