# Plataforma Estímulo

LMS para operar jornadas de desenvolvimento empreendedor, administrar conteúdos e atividades e produzir dados educacionais e operacionais com governança.

> **Ambientes:** Supabase e Vercel são exclusivos de desenvolvimento, teste e preview. A AWS permanece como ambiente definitivo de produção, mas sua arquitetura ainda não foi decidida. O único artefato AWS aprovado é [`Dockerfile.lambda`](Dockerfile.lambda); o runtime AWS permanece *fail-closed* e não pode receber usuários reais.

[Índice da documentação](PROJECT_INDEX.md) · [Guia de contribuição](CONTRIBUTING.md) · [Bloqueadores da entrega](docs/implementation/DELIVERY_BLOCKERS.md)

## Produto

A Plataforma Estímulo reúne as experiências de participantes e as ferramentas administrativas necessárias para publicar e operar jornadas de capacitação. O núcleo é configurável e versionado: novas jornadas, trilhas, conteúdos, avaliações, práticas, gamificação e credenciais não exigem um runtime separado.

### Participantes

- cadastro, aceite de termos, confirmação e autenticação;
- recuperação e redefinição segura de senha;
- home, jornadas, atividades, diagnóstico guiado, resultado, perfil, biblioteca e conquistas;
- progresso, avaliações, práticas, comentários e arquivos;
- pontos, recompensas, selos, certificados e credenciais externas;
- ajuda, suporte e textos legais operacionais.

### Administração

- acesso administrativo separado, OAuth corporativo, identidade interna e RBAC;
- produto, jornadas, trilhas, aulas, diagnóstico e CMS da experiência;
- gamificação, certificados, engajamento, biblioteca e usuários;
- arquivamento seguro com preservação de histórico e bloqueio de dependências;
- relatórios, operação e contratos de integrações externas.

### Fundação

- monólito modular Next.js;
- motor configurável e versionado;
- PostgreSQL reproduzível por migrations;
- RLS, RBAC, idempotência, auditoria, eventos e outbox;
- contratos públicos de RPC e gateway autenticado;
- fronteiras explícitas para identidade, dados, arquivos e processamento assíncrono;
- provider por ambiente com comportamento *fail-closed*;
- gates de qualidade, segurança, integridade e reprodutibilidade.

A existência de uma tela, fluxo, contrato ou imagem não equivale à aprovação de conteúdo, metodologia, segurança, privacidade, acessibilidade ou operação em produção.

## Ambientes

| Ambiente | Provider | Uso permitido |
|---|---|---|
| `development` | `supabase` | desenvolvimento local |
| `test` | `supabase` | CI e testes automatizados |
| `preview` | `supabase` em Vercel | revisão controlada com dados de teste |
| `staging` | `aws` | bloqueado até decisão e implementação da arquitetura |
| `production` | `aws` | bloqueado até todos os gates de produção |

Supabase e Vercel não podem ser promovidos, renomeados ou tratados como produção oficial.

## Estado da AWS

Decisões aprovadas:

1. AWS será o ambiente definitivo de produção;
2. a aplicação será empacotada por `Dockerfile.lambda`;
3. o runtime de produção não pode depender de Supabase ou Vercel.

Não foram decididos os serviços ou a topologia de entrada pública, identidade, banco, armazenamento, processamento assíncrono, rede, segredos, observabilidade, deploy, backup e recuperação.

Consulte [`AWS_ARCHITECTURE_STATUS.md`](docs/architecture/AWS_ARCHITECTURE_STATUS.md). `/api/health/ready` retorna `503` com `aws_architecture_pending` enquanto essa decisão estiver aberta.

## Stack

| Camada | Tecnologias |
|---|---|
| aplicação | Next.js 16, React 19 e TypeScript |
| interface | Tailwind CSS 4, Framer Motion e Lucide |
| desenvolvimento/teste | Supabase Auth, PostgreSQL, Storage e Edge Functions |
| preview | Vercel com provider Supabase |
| empacotamento AWS aprovado | container Lambda em `Dockerfile.lambda` |
| validação | Node Test Runner, gates de banco, contratos, typecheck, build e scans |
| workspace | Node.js `22.23.1`, npm `10.9.8` e npm workspaces |

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
cp .env.example .env
```

No PowerShell:

```powershell
npm ci --ignore-scripts --no-audit --no-fund
Copy-Item .env.example .env
```

Configuração mínima de desenvolvimento:

```dotenv
APP_ENV=development
PLATFORM_RUNTIME_PROVIDER=supabase
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Gere duas chaves distintas e nunca as versione:

```bash
node -e "const { randomBytes } = require('node:crypto'); console.log(randomBytes(32).toString('base64'))"
```

### Execução

```bash
npm run validate:release-candidate
npm run dev:web
```

A aplicação ficará disponível em `http://localhost:3000`.

### Verificação do Supabase de teste

```bash
npm run verify:supabase
```

A verificação é *read-only*: consulta Auth, readiness do PostgreSQL e proteção da Edge Function `authenticated-rpc`.

## Gates do software

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

O banco deve ser reconstruído desde zero. Nenhum workflow ou passo obrigatório pode estar ausente, cancelado, ignorado ou vermelho no SHA avaliado.

## Capacidade

O harness parametrizável mede throughput, taxa de erro e percentis:

```bash
LOAD_TEST_BASE_URL=http://localhost:3000 \
LOAD_TEST_PATH=/api/health/live \
LOAD_TEST_CONCURRENCY=20 \
LOAD_TEST_DURATION_SECONDS=8 \
npm run test:capacity
```

O cenário de liveness valida o artefato e o harness. Produção multiusuário exige cenários autenticados e transacionais, ramp, spike e soak no ambiente AWS definido.

## Release

Existem dois gates:

1. **software:** fonte, dependências, migrations, contratos, testes, build, imagem, scans e manifestos no mesmo SHA;
2. **produção:** arquitetura AWS aprovada e implementada, E2E, isolamento, capacidade, segurança, observabilidade e continuidade.

O primeiro não autoriza o segundo. Consulte o [runbook](docs/operations/FINAL_RELEASE_RUNBOOK.md) e os [bloqueadores](docs/implementation/DELIVERY_BLOCKERS.md).

## Estrutura

```text
apps/web/                       aplicação Next.js
apps/web/lib/platform/          contratos e seleção do provider
apps/web/lib/supabase/          adapter de desenvolvimento e testes
config/platform/                fronteira legível por máquina
docs/                           documentação canônica
scripts/                        validação, testes, segurança e operação
supabase/migrations/            histórico PostgreSQL executável
supabase/functions/             funções do ambiente de teste
Dockerfile.lambda               único artefato AWS aprovado
```

Não existe uma segunda imagem de aplicação nem infraestrutura AWS aprovada no repositório.

## Contribuição

Não faça commits diretamente em `main`. Mantenha código, migrations, contratos, testes e documentação sincronizados; abra PR convencional e só faça merge depois de todos os workflows obrigatórios verdes no SHA final.
