# Plataforma Estímulo

LMS web para desenvolvimento de empreendedores, operação de jornadas de capacitação e geração governada de dados educacionais e operacionais.

Os requisitos ativos do produto estão em [`premissas-desenvolvimento.md`](premissas-desenvolvimento.md). O estado de liberação é controlado por [`DELIVERY_BLOCKERS.md`](docs/implementation/DELIVERY_BLOCKERS.md).

## Estado de release

A aplicação, a administração, o banco executável, os testes e a infraestrutura-base estão versionados. O produto não deve receber usuários reais enquanto houver bloqueadores de produção abertos.

```text
Supabase       desenvolvimento e testes
AWS            staging e produção oficiais
PostgreSQL     estado operacional, eventos e outbox
HubSpot        somente projeções com finalidade e destino aprovados
```

Terraform não aplicado, fixtures, mocks, adapters sem credenciais e testes sintéticos não constituem evidência de produção.

## Estrutura do repositório

```text
apps/web/                    aplicação Next.js
config/                      configuração versionada do produto
supabase/migrations/         histórico executável e imutável do banco
supabase/functions/          adapters do ambiente Supabase
infra/aws/terraform/         infraestrutura declarativa de staging
scripts/application/         testes e validações da aplicação
scripts/database/            replay, equivalência, contratos e E2E do banco
scripts/browser-e2e/         testes de navegador sintéticos e reais
scripts/integrations/        contratos de integrações
scripts/operations/          utilitários operacionais controlados
scripts/repository/          governança e higiene do repositório
scripts/runtime/             inicialização e validação do runtime
docs/                        arquitetura, produto, decisões e operação
```

Ferramentas pessoais de agentes, relatórios de execução, estados locais, arquivos temporários e gatilhos manuais de deploy não pertencem ao repositório.

## Execução local

Pré-requisitos:

- Node.js 22;
- npm 10.9.2;
- acesso autorizado ao ambiente Supabase de desenvolvimento/teste;
- duas chaves server-only independentes de 32 bytes em base64 para proteção do CPF;
- provider Google configurado para validar o acesso administrativo.

```bash
cp .env.example .env
npm ci --ignore-scripts
npm run validate:repository
npm run test:application-foundation
npm run typecheck:web
npm run build:web
npm run dev:web
```

No PowerShell:

```powershell
Copy-Item .env.example .env
```

Nunca registre credenciais, cookies de sessão, arquivos pessoais ou dados reais no Git.

## Validações principais

```bash
npm run validate:repository
npm run validate:dependency-lock
npm run validate:migration-history
npm run test:application-foundation
npm run test:database-gates
npm run test:configurable-product
npm run test:hubspot-contracts
npm run typecheck:web
npm run build:web
npm run test:browser-e2e
```

O E2E real autenticado exige um ambiente implantado, contas próprias de teste e cookies administrativos efêmeros obtidos por um login Google real. Esses arquivos devem permanecer fora do Git e ser destruídos após a execução.

## Container e AWS

O [`Dockerfile`](Dockerfile) produz uma aplicação Next.js standalone executada como usuário não-root e expõe liveness e readiness. A infraestrutura AWS está em [`infra/aws/terraform`](infra/aws/terraform/README.md) e permanece bloqueada por padrão até a configuração explícita de conta, região, certificado, imagem imutável e segredos.

## Documentação principal

- [Índice do projeto](PROJECT_INDEX.md)
- [Guia de contribuição](CONTRIBUTING.md)
- [Decisões](docs/decisions/DECISION_LOG.md)
- [Bloqueadores de entrega](docs/implementation/DELIVERY_BLOCKERS.md)
- [Arquitetura-alvo AWS](docs/architecture/AWS_TARGET_ARCHITECTURE.md)
- [Portabilidade Supabase → AWS](docs/architecture/SUPABASE_AWS_PORTABILITY.md)
- [Contrato HubSpot](docs/integrations/HUBSPOT_ADAPTER_CONTRACT.md)
- [Configuração atual de domínio e autenticação](docs/operations/DOMAIN_AND_AUTH_CONFIGURATION.md)

## Regras essenciais

- não fazer commit direto em `main`;
- migrations aplicadas nunca são editadas;
- código, testes, contratos e documentação mudam juntos;
- integrações não configuradas falham fechadas;
- outputs gerados e materiais de desenvolvimento permanecem fora do Git;
- nenhuma evidência sintética é apresentada como prova de produção.
