# Plataforma Estímulo

LMS web para desenvolvimento de empreendedores, operação de jornadas de capacitação e geração governada de dados educacionais e operacionais.

O escopo vigente, as decisões ativas, o estado implementado e os bloqueadores estão listados em [`PROJECT_INDEX.md`](PROJECT_INDEX.md). Materiais de referência, análises de desenvolvimento e histórico de decisões permanecem fora da árvore ativa; o histórico Git e os pull requests preservam sua rastreabilidade.

## Estado atual

```text
aplicação e administração       implementadas no repositório
banco e migrations             versionados para Supabase/PostgreSQL
runtime ativo                  Supabase development/test
preview temporário             Vercel, sem status de produção
Docker                         imagem standalone definida
AWS                            Terraform de staging não aplicado
HubSpot                        política e adapter; sandbox pendente
produção                       bloqueada
```

O estado funcional detalhado está em [`APPLICATION_FOUNDATION.md`](docs/implementation/APPLICATION_FOUNDATION.md), e os gates em [`DELIVERY_BLOCKERS.md`](docs/implementation/DELIVERY_BLOCKERS.md).

## Estrutura

```text
apps/web/                    aplicação Next.js
config/                      configuração versionada
supabase/migrations/         histórico executável e imutável
supabase/functions/          adapters Supabase
infra/aws/terraform/         baseline bloqueado de staging
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

## Build e AWS

O [`Dockerfile`](Dockerfile) produz Next.js standalone como usuário não-root e expõe liveness. A readiness falha fechada quando configuração, chaves ou banco não estão prontos.

O Terraform em [`infra/aws/terraform`](infra/aws/terraform/README.md) declara ECR, ECS/Fargate, ALB, RDS, S3, KMS, CloudWatch e SNS, mas nenhum recurso foi aplicado. O runtime ainda usa Supabase Auth, Storage e RPC.

## Documentação

O mapa completo está em [`PROJECT_INDEX.md`](PROJECT_INDEX.md). Nenhuma afirmação de produção deve ser feita com base apenas em código, fixture, mock, teste estrutural ou scaffolding.