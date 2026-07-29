# Plataforma Estímulo

LMS para operar jornadas de desenvolvimento empreendedor, administrar conteúdos e atividades e produzir dados educacionais e operacionais com governança.

> **Estado:** o produto, o banco reproduzível e o runtime de desenvolvimento/teste usam Supabase e Vercel. A AWS permanece como ambiente definitivo de produção, mas sua arquitetura ainda não foi decidida. O único artefato AWS aprovado é [`Dockerfile.lambda`](Dockerfile.lambda). Até a aprovação e implementação da arquitetura, o runtime AWS permanece *fail-closed* e não pode receber usuários reais.

[Índice da documentação](PROJECT_INDEX.md) · [Guia de contribuição](CONTRIBUTING.md) · [Bloqueadores da entrega](docs/implementation/DELIVERY_BLOCKERS.md)

## Produto

A Plataforma Estímulo reúne, em uma aplicação web, as experiências de participantes e as ferramentas administrativas necessárias para publicar e operar jornadas de capacitação.

A primeira release prioriza a Jornada OpenAI. O núcleo do produto permite configurar e versionar jornadas, trilhas, conteúdos, avaliações, práticas, gamificação e credenciais sem criar um runtime separado para cada programa.

### Participantes

- cadastro, confirmação e autenticação;
- home, jornadas, atividades, diagnóstico, perfil, biblioteca e conquistas;
- progresso e conclusão;
- avaliações, práticas, comentários e evidências;
- pontos, recompensas, selos e certificados.

### Administração

- acesso administrativo separado, identidade interna e RBAC;
- configuração de produto, jornadas, trilhas, aulas e diagnóstico;
- CMS da experiência;
- gestão de gamificação, engajamento, biblioteca e usuários;
- relatórios e ferramentas operacionais;
- contratos lógicos para integrações externas.

### Fundação

- monólito modular em Next.js;
- motor configurável e versionado;
- histórico PostgreSQL reproduzível por migrations;
- RLS, RBAC, idempotência, auditoria e contratos públicos de RPC;
- fronteiras explícitas para identidade, dados, arquivos e processamento assíncrono;
- seleção de provider por ambiente com comportamento *fail-closed*;
- gates de qualidade, segurança, integridade e reprodutibilidade.

A existência de uma tela, fluxo, contrato ou Dockerfile não equivale à aprovação de conteúdo, metodologia, segurança, privacidade, acessibilidade ou operação em produção.

## Ambientes

| Ambiente | Provider | Uso permitido |
|---|---|---|
| `development` | `supabase` | desenvolvimento local |
| `test` | `supabase` | CI e testes automatizados |
| `preview` | `supabase` em Vercel | homologação controlada com dados sintéticos |
| `staging` | `aws` | bloqueado até decisão e implementação da arquitetura |
| `production` | `aws` | bloqueado até todos os gates de produção |

Supabase e Vercel não podem ser promovidos, renomeados ou tratados como produção oficial.

## Estado da AWS

Decisões aprovadas:

1. AWS será o ambiente definitivo de produção;
2. a aplicação será empacotada por `Dockerfile.lambda`;
3. o runtime de produção não pode depender de Supabase ou Vercel.

Ainda não foram decididos os serviços e a topologia de entrada pública, identidade, banco, armazenamento, processamento assíncrono, rede, segredos, observabilidade, deploy, backup e recuperação.

Consulte [`AWS_ARCHITECTURE_STATUS.md`](docs/architecture/AWS_ARCHITECTURE_STATUS.md). O endpoint `/api/health/ready` retorna `503` com `aws_architecture_pending` enquanto essa decisão estiver aberta.

## Stack atual

| Camada | Tecnologias |
|---|---|
| aplicação | Next.js 16, React 19 e TypeScript 6 |
| interface | Tailwind CSS 4, Framer Motion e Lucide |
| desenvolvimento/teste | Supabase Auth, PostgreSQL, Storage e Edge Functions |
| preview | Vercel com provider Supabase |
| empacotamento AWS aprovado | container Lambda definido em `Dockerfile.lambda` |
| validação | Node Test Runner, scripts de contrato, gates de banco, typecheck e build |
| workspace | Node.js 22.23.1, npm 10.9.8 e npm workspaces |

## Desenvolvimento local

### Pré-requisitos

- Git;
- Node.js `22.23.1`;
- npm `10.9.8`;
- projeto Supabase autorizado para teste;
- Google OAuth configurado no ambiente de teste para validar a administração;
- duas chaves independentes de 32 bytes, codificadas em Base64, para proteção do CPF.

### Instalação

```bash
npm ci --ignore-scripts --no-audit --no-fund
```

Crie o arquivo de ambiente:

```bash
cp .env.example .env
```

No PowerShell:

```powershell
Copy-Item .env.example .env
```

Para desenvolvimento:

```dotenv
APP_ENV=development
PLATFORM_RUNTIME_PROVIDER=supabase
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Preencha as credenciais de teste e gere duas chaves distintas:

```bash
node -e "const { randomBytes } = require('node:crypto'); console.log(randomBytes(32).toString('base64'))"
```

Execute o comando duas vezes e nunca versione `.env` ou credenciais reais.

### Execução

```bash
npm run validate:release-candidate
npm run dev:web
```

A aplicação ficará disponível em `http://localhost:3000`.

### Verificação do ambiente Supabase de teste

```bash
npm run verify:supabase
```

A verificação é *read-only*: consulta Auth, readiness do PostgreSQL e proteção da Edge Function `authenticated-rpc`.

## Gates do candidato de software

```bash
npm run validate:release-candidate
npm run test:repository-tooling
npm run test:application
npm run test:product
npm run test:integrations
npm run test:database
npm run typecheck:web
npm run build:web
npm run scan:secrets
npm run test:secret-scanning
```

O banco deve ser reconstruído desde zero e passar por equivalência de schema e testes comportamentais. Nenhum gate obrigatório pode ficar ausente, cancelado, ignorado ou vermelho.

## Capacidade e performance

O repositório possui harness parametrizável de carga:

```bash
LOAD_TEST_BASE_URL=http://localhost:3000 \
LOAD_TEST_PATH=/api/health/live \
LOAD_TEST_CONCURRENCY=20 \
LOAD_TEST_DURATION_SECONDS=8 \
npm run test:capacity
```

O cenário curto de liveness é apenas uma verificação do harness. Aprovação para múltiplos usuários exige cenários autenticados e transacionais, ramp, spike e soak no ambiente de produção escolhido, com métricas de aplicação, banco, armazenamento, processamento assíncrono e integrações.

## Produção

Existem dois gates distintos:

1. **release do software:** fonte, dependências, migrations, testes, typecheck, build, imagem, scans e manifestos reproduzíveis;
2. **release de produção:** arquitetura AWS aprovada e implementada, E2E transacional, capacidade, segurança, LGPD, observabilidade, backup, restore e rollback.

O primeiro gate não autoriza o segundo. Consulte [`FINAL_RELEASE_RUNBOOK.md`](docs/operations/FINAL_RELEASE_RUNBOOK.md) e [`DELIVERY_BLOCKERS.md`](docs/implementation/DELIVERY_BLOCKERS.md).

## Estrutura

```text
apps/web/                       aplicação Next.js
apps/web/lib/platform/          contratos e seleção do provider
apps/web/lib/supabase/          adapter de desenvolvimento e testes
config/platform/                estado legível por máquina da fronteira de produção
docs/                           produto, arquitetura lógica, segurança e operação
scripts/                        validação, testes, segurança e operação
supabase/migrations/            histórico PostgreSQL executável
supabase/functions/             funções exclusivas do ambiente de teste
Dockerfile.lambda               único artefato AWS atualmente aprovado
```

Não existe uma segunda imagem de aplicação nem infraestrutura AWS aprovada no repositório.

## Contribuição

Não faça commits diretamente em `main`.

1. crie uma branch aceita pela política do repositório;
2. mantenha código, migrations, contratos, testes e documentação sincronizados;
3. execute os gates proporcionais ao risco;
4. abra um pull request com título no padrão Conventional Commits;
5. registre evidências, limitações, riscos e rollback;
6. exija revisão independente para mudanças de segurança, identidade, dados, migrations ou produção.
