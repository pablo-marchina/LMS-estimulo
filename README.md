# Plataforma Estímulo

LMS para operar jornadas de desenvolvimento empreendedor, administrar conteúdos e atividades e produzir dados educacionais e operacionais com governança.

> **Ambientes:** Supabase e Vercel são exclusivos de desenvolvimento, teste e preview. A AWS permanece como ambiente definitivo de produção, mas sua arquitetura ainda não foi decidida. O único artefato AWS aprovado é [`Dockerfile.lambda`](Dockerfile.lambda); o runtime AWS permanece *fail-closed* e não pode receber usuários reais.

[Índice da documentação](PROJECT_INDEX.md) · [Guia de contribuição](CONTRIBUTING.md) · [Suíte de crescimento e engajamento](docs/implementation/PLATFORM_GROWTH_ENGAGEMENT_SUITE.md) · [Bloqueadores da entrega](docs/implementation/DELIVERY_BLOCKERS.md)

## Produto

A Plataforma Estímulo reúne a experiência dos participantes e as ferramentas administrativas necessárias para publicar e operar jornadas. Definições editoriais são versionadas; execuções, entregas, pontos, eventos e auditoria preservam histórico.

### Participantes

- cadastro, confirmação, login e recuperação de senha;
- aceite versionado de Termos de Uso e Política de Privacidade, inclusive nova aceitação obrigatória;
- home, jornadas, aulas, biblioteca, perfil, diagnóstico principal e diagnósticos opcionais;
- vídeos responsivos que nunca ultrapassam a tela em computador ou celular;
- perguntas rápidas sem limite fixo por aula;
- entregas vinculadas a atividades ou conteúdos exclusivos da biblioteca;
- correção de entregas por IA em modo automático, revisão humana ou assistência ao avaliador;
- pontos de engajamento, carteira de recompensas, catálogo, resgates e histórico;
- páginas B2B visíveis somente a usuários ou grupos autorizados;
- certificados com template global e sobrescrita por programa ou jornada;
- ajuda e suporte configuráveis.

### Administração

- entrada administrativa separada por OAuth corporativo e RBAC;
- produto, jornadas, trilhas, aulas, conteúdos, diagnóstico principal e CMS da experiência;
- criação e exclusão protegida de temas, usados por seleção múltipla em conteúdos e jornadas;
- biblioteca com prévia real do participante sem progresso, pontos ou efeitos colaterais;
- configurações gerais, contatos, documentos legais e exigência de nova aceitação;
- campanhas e links UTM com destino pós-login, validade, público, parâmetros e etapas ignoráveis;
- páginas B2B por blocos, grupos e concessões individuais;
- recompensas físicas, digitais, experiências e serviços, com estoque, período, regulamento e fluxo de entrega;
- entregas, rubricas, tentativas, notas e revisão da avaliação produzida por IA;
- diagnósticos opcionais publicados no perfil sem alterar arquétipo ou elegibilidade de jornadas;
- eventos comportamentais e score multidimensional exclusivamente analítico;
- certificados e templates em imagem ou PDF;
- usuários, permissões, auditoria e arquivamento seguro.

### Dados e integrações

- PostgreSQL é a fonte operacional e histórica;
- eventos, ledgers e trilhas de auditoria preservam fatos e movimentações;
- integrações futuras consomem uma outbox genérica e incremental;
- nenhum CRM ou destino externo é dependência do produto;
- exportação ETL permanece desabilitada por padrão e exige consumidor, credenciais e destino explicitamente configurados;
- score comportamental não altera navegação, acesso, recompensas, jornadas ou recomendações;
- a captura comportamental começa na implantação da suíte e não reconstrói interações antigas.

## Fundação técnica

- monólito modular Next.js;
- PostgreSQL reproduzível por migrations;
- Supabase Auth, Storage e Edge Functions em desenvolvimento, teste e preview;
- RLS, RBAC, idempotência, auditoria, eventos e outbox;
- RPCs `SECURITY DEFINER` com `search_path` fechado e gateway autenticado;
- armazenamento protegido para certificados e evidências de entregas;
- correção por IA com fallback obrigatório para revisão humana quando o provedor ou a evidência forem insuficientes;
- contratos e gates de qualidade, segurança, integridade e reprodutibilidade.

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

Configuração mínima:

```dotenv
APP_ENV=development
PLATFORM_RUNTIME_PROVIDER=supabase
NEXT_PUBLIC_APP_URL=http://localhost:3000
ETL_EXPORT_ENABLED=false
```

A correção por IA permanece em revisão humana quando o provedor não estiver configurado. Nunca coloque segredos no browser ou em variáveis `NEXT_PUBLIC_*`.

Gere duas chaves distintas para CPF e nunca as versione:

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

## Superfícies principais

| Público | Administração |
|---|---|
| `/empreendedor/biblioteca` | `/admin/biblioteca` |
| `/empreendedor/jornadas` | `/admin/produto` |
| `/empreendedor/perfil` | `/admin/diagnostico` |
| `/empreendedor/perfil/diagnosticos/...` | `/admin/diagnosticos-opcionais` |
| `/empreendedor/entregas` | `/admin/entregas` |
| `/empreendedor/recompensas` | `/admin/recompensas` |
| `/empreendedor/b2b` | `/admin/b2b` |
| links `/r/<slug>` | `/admin/campanhas` |
| documentos legais obrigatórios | `/admin/configuracoes` |
| certificados emitidos | `/admin/certificados` |
| — | `/admin/comportamento` |

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
apps/web/lib/extensions/        gateway e runtime da suíte de extensões
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
