# Plataforma Estímulo

LMS para operar jornadas de desenvolvimento empreendedor, administrar conteúdos e atividades e produzir dados educacionais e operacionais com governança.

> **Ambientes:** o runtime Supabase/Vercel está ativo para desenvolvimento, demonstração e validação controlada. A AWS continua sendo o destino institucional planejado para produção definitiva, mas sua arquitetura ainda depende de decisão e implementação. O único artefato AWS aprovado é [`Dockerfile.lambda`](Dockerfile.lambda), e esse runtime permanece *fail-closed*.

[Índice da documentação](PROJECT_INDEX.md) · [Guia de contribuição](CONTRIBUTING.md) · [Fundação atual](docs/implementation/APPLICATION_FOUNDATION.md) · [Ciclo das jornadas](docs/journeys/JOURNEY_LIFECYCLE.md) · [Portabilidade e transferência](docs/operations/PORTABILITY_AND_REPOSITORY_TRANSFER.md) · [Preview e carregamento](docs/implementation/INTERFACE_PREVIEW_AND_LOADING.md)

## Produto

A plataforma reúne a experiência dos participantes e as ferramentas administrativas necessárias para criar, publicar e operar jornadas. Cada jornada é única e possui apenas dois estados visíveis: `draft` e `published`. Uma jornada publicada pode ser editada diretamente; conteúdo removido deixa de aparecer e os dados operacionais já registrados seguem suas próprias regras de retenção.

### Participantes

- cadastro, confirmação, login e recuperação de senha;
- aceite de Termos de Uso e Política de Privacidade, inclusive nova aceitação obrigatória;
- home, jornadas, aulas, biblioteca, perfil, diagnóstico principal e diagnósticos opcionais;
- aula responsiva em toda a largura disponível do layout participante;
- barra global de progresso em navegações e carregamentos, sem skeletons de página;
- perguntas rápidas, atividades práticas, entregas, comentários e arquivos;
- pontos de engajamento, recompensas, selos e certificados;
- páginas B2B visíveis somente a públicos autorizados;
- ajuda e suporte configuráveis.

### Administração

- entrada administrativa separada por OAuth corporativo e RBAC;
- edição ao vivo de jornadas publicadas, trilhas, aulas e conteúdos;
- publicação e despublicação da mesma jornada, sem criar versões editoriais paralelas;
- exclusão permitida somente para jornadas em rascunho;
- CMS da interface com prévia administrativa isolada para telas de participante e administrador;
- prévia sem matrícula, progresso, analytics, eventos comportamentais, entregas ou score;
- biblioteca, diagnóstico, campanhas, B2B, recompensas, certificados, usuários, permissões e auditoria;
- score comportamental configurável com validação no cliente e no banco;
- correção de entregas por IA com fallback obrigatório para revisão humana.

### Dados e integrações

- PostgreSQL é a fonte operacional e histórica;
- eventos brutos, ledgers e trilhas de auditoria preservam fatos e movimentações;
- score comportamental registra configuração, valores intermediários, snapshots e histórico para ETL;
- o score é exclusivamente analítico e não altera acesso, recomendações, pontos, recompensas ou crédito;
- integrações futuras consomem outbox genérica e incremental;
- nenhum CRM ou destino externo é dependência do produto.

## Fundação técnica

- monólito modular Next.js 16, React 19 e TypeScript;
- PostgreSQL reproduzível por migrations;
- Supabase Auth, Storage, PostgreSQL e Edge Functions no runtime ativo;
- Vercel para build e implantação do frontend atual;
- RLS, RBAC, idempotência, auditoria, eventos e outbox;
- RPCs privilegiadas com `search_path` fechado e gateway autenticado;
- contratos e gates de qualidade, segurança, integridade, arquitetura, reprodutibilidade e portabilidade.

As rotas em `apps/web/app/` funcionam como adapters e composition roots. Regras e montagem de modelos ficam nos módulos de `apps/web/lib/`; componentes compartilhados ficam em `apps/web/components/`. As dependências permitidas entre essas camadas são verificadas automaticamente por [`config/module-boundaries.json`](config/module-boundaries.json).

A existência de uma tela, fluxo ou artefato não equivale à aprovação institucional de conteúdo, metodologia, segurança, privacidade, acessibilidade ou arquitetura AWS.

## Ambientes

| Ambiente | Provider | Estado |
|---|---|---|
| `development` | Supabase | ativo para desenvolvimento local |
| `test` | Supabase | ativo para CI e testes automatizados |
| `preview` | Supabase + Vercel | ativo para revisão controlada |
| implantação web atual | Supabase + Vercel | operacional para demonstração e validação |
| `staging` institucional | AWS | bloqueado até definição da arquitetura |
| `production` institucional | AWS | bloqueado até conclusão dos gates finais |

A origem pública da implantação Supabase/Vercel é configuração de ambiente (`NEXT_PUBLIC_APP_URL`) e não faz parte da identidade versionada do repositório. O contrato de transferência fica em [`config/platform/portable-runtime.json`](config/platform/portable-runtime.json).

Consulte [`AWS_ARCHITECTURE_STATUS.md`](docs/architecture/AWS_ARCHITECTURE_STATUS.md) para a distinção entre implantação operacional atual e arquitetura institucional definitiva.

## Desenvolvimento local

### Pré-requisitos

- Git;
- Node.js `22.23.1`;
- npm `10.9.8`;
- projeto Supabase autorizado para teste;
- Google OAuth configurado para administração;
- duas chaves independentes de 32 bytes, em Base64, para proteção do CPF.

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

Nunca coloque segredos no browser ou em variáveis `NEXT_PUBLIC_*`.

### Execução

```bash
npm run validate:release-candidate
npm run dev:web
```

A aplicação ficará disponível em `http://localhost:3000`.

### Verificação do Supabase

```bash
npm run verify:supabase
```

## Superfícies principais

| Público/participante | Administração |
|---|---|
| `/` | `/admin` |
| `/empreendedor/jornadas` | `/admin/produto` |
| `/empreendedor/atividade/...` | `/admin/biblioteca` |
| `/empreendedor/biblioteca` | `/admin/diagnostico` |
| `/empreendedor/entregas` | `/admin/comportamento` |
| `/empreendedor/recompensas` | `/admin/experiencia` |
| `/empreendedor/perfil` | `/admin/configuracoes` |

A rota `/interface-preview/participant` é interna, exige administrador autenticado e existe apenas para o preview isolado do CMS.

## Gates do software

```bash
npm run validate:release-candidate
npm run validate:portability
npm run validate:module-boundaries
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

`validate:repository` executa a política de higiene, o gate de dependências entre módulos e o contrato de portabilidade. O banco deve ser reconstruível desde zero. Nenhum passo obrigatório pode estar ausente, cancelado, ignorado ou vermelho no SHA avaliado.

## Estrutura

```text
apps/web/app/                   rotas, adapters e composition roots do Next.js
apps/web/components/            UI compartilhada
apps/web/lib/                   módulos de produto, aplicação e infraestrutura
apps/web/lib/extensions/        gateway e runtime das extensões
apps/web/lib/platform/          contratos e seleção do provider
apps/web/lib/supabase/          adapter Supabase
config/module-boundaries.json   dependências permitidas entre módulos
config/repository-hygiene-policy.json política declarativa de limpeza do repo
config/platform/                fronteira e contrato de portabilidade legíveis por máquina
docs/                           documentação canônica
scripts/                        validação, testes, segurança e operação
supabase/migrations/            histórico PostgreSQL executável
supabase/functions/             Edge Functions canônicas transferíveis
docs/journeys/JOURNEY_LIFECYCLE.md
Dockerfile.lambda               artefato AWS aprovado
```

## Contribuição

O fluxo padrão continua sendo branch e pull request, com código, migrations, testes e documentação sincronizados. Alterações diretas em `main` são excepcionais e exigem autorização explícita do proprietário, seguida dos mesmos gates de validação e implantação.
