# Plataforma Estímulo

LMS web para desenvolvimento de empreendedores, operação de jornadas de capacitação e geração governada de dados educacionais e operacionais.

O escopo vigente, as decisões ativas, o estado implementado e os bloqueadores estão listados em [`PROJECT_INDEX.md`](PROJECT_INDEX.md). Materiais de referência, análises de desenvolvimento e histórico de decisões permanecem fora da árvore ativa; o histórico Git e os pull requests preservam sua rastreabilidade.

## Estado atual

```text
aplicação e administração       implementadas no repositório
banco e migrations             versionados para Supabase/PostgreSQL
runtime ativo                  Supabase development/test
preview temporário             Vercel, sem status de produção
container ECS                  imagem standalone definida
container Lambda               imagem com Lambda Web Adapter preparada
infraestrutura AWS             não aplicada
HubSpot                        política e adapter; sandbox/worker pendentes
produção                       bloqueada
```

O estado funcional detalhado está em [`APPLICATION_FOUNDATION.md`](docs/implementation/APPLICATION_FOUNDATION.md), e os gates em [`DELIVERY_BLOCKERS.md`](docs/implementation/DELIVERY_BLOCKERS.md).

## Estrutura

```text
apps/web/                    aplicação Next.js
config/                      configuração versionada
supabase/migrations/         histórico executável e imutável
supabase/functions/          adapters Supabase
infra/aws/terraform/         baseline ECS/Fargate bloqueado de staging
infra/aws/lambda/            preparação e gates do runtime Lambda
scripts/application/         testes de lógica e contratos da aplicação
scripts/database/            replay, contratos e testes de banco
scripts/integrations/        contratos de integração
scripts/operations/          utilitários operacionais controlados
scripts/repository/          governança e higiene
scripts/runtime/             inicialização e gates de configuração
scripts/verification/        verificações explícitas de ambiente implantado
docs/                        especificações, decisões e operação vigentes
```

Ferramentas pessoais de agentes, planos, relatórios de execução, referências externas, estados locais, backends sintéticos e gatilhos manuais de deploy não pertencem ao repositório.

## Execução local

Pré-requisitos:

- Node.js 22;
- npm 10.9.2;
- ambiente Supabase autorizado para desenvolvimento/teste;
- duas chaves independentes de 32 bytes em base64 para proteção do CPF;
- Google OAuth configurado para validar a administração.

```bash
cp .env.example .env
npm ci --ignore-scripts
npm run validate:repository
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

## Validações

```bash
npm run validate:repository
npm run validate:dependency-lock
npm run validate:migration-history
npm run test:repository-tooling
npm run test:application
npm run test:product
npm run test:integrations
npm run test:database
npm run typecheck:web
npm run build:web
```

A verificação autenticada de um ambiente implantado é executada separadamente por `npm run verify:deployment`. Ela exige URL real, contas próprias de teste e sessão administrativa efêmera obtida por Google OAuth. Cookies, credenciais e dados pessoais permanecem fora do Git.

## Builds de container

### ECS/Fargate

O [`Dockerfile`](Dockerfile) produz Next.js standalone como usuário não-root, expõe a porta `3000` e possui healthcheck de liveness.

### AWS Lambda

O [`Dockerfile.lambda`](Dockerfile.lambda) produz a mesma aplicação standalone com AWS Lambda Web Adapter e filesystem compatível com Lambda. Exemplo de build:

```bash
docker build \
  --platform linux/amd64 \
  --file Dockerfile.lambda \
  --build-arg NEXT_PUBLIC_APP_URL=https://staging.example.org \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://replace.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=replace-with-public-key \
  --tag lms-estimulo-lambda:<commit> .
```

O guia e os bloqueadores específicos estão em [`infra/aws/lambda/README.md`](infra/aws/lambda/README.md). A existência dessa imagem não significa que a função, API, domínio, concorrência, uploads, cache, workers ou observabilidade estejam prontos.

## AWS e produção

O Terraform em [`infra/aws/terraform`](infra/aws/terraform/README.md) declara ECR, ECS/Fargate, ALB, RDS, S3, KMS, CloudWatch e SNS, mas nenhum recurso foi aplicado. O runtime ainda usa Supabase Auth, Storage e RPC.

Antes de qualquer liberação são obrigatórios, entre outros gates:

- CI funcional e build comprovado;
- staging real;
- upload direto ao storage, sem proxy de arquivos pelo Lambda;
- escolha do front door e proteção contra abuso;
- teste de carga e concorrência;
- identidade, secrets e rotação aprovados;
- workers assíncronos e HubSpot em sandbox;
- backup, restore e rollback;
- E2E autenticado real;
- conteúdo, privacidade, segurança e acessibilidade aprovados.

## Documentação

O mapa completo está em [`PROJECT_INDEX.md`](PROJECT_INDEX.md). Nenhuma afirmação de produção deve ser feita com base apenas em código, imagem, fixture, mock, teste estrutural ou scaffolding.
