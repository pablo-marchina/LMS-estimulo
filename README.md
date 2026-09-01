# Plataforma Estímulo

LMS para operar jornadas de desenvolvimento empreendedor, administrar conteúdo e atividades e produzir evidências educacionais e operacionais com governança.

[Índice da documentação](PROJECT_INDEX.md) · [Fundação da aplicação](docs/implementation/APPLICATION_FOUNDATION.md) · [Ciclo das jornadas](docs/journeys/JOURNEY_LIFECYCLE.md) · [Princípios de produto](docs/product/PRODUCT_PRINCIPLES.md) · [Runbook de releases](docs/operations/RELEASE_RUNBOOK.md)

## Produto

A plataforma reúne experiência participante e ferramentas administrativas sobre o mesmo domínio. **Cada jornada é única** e possui os estados visíveis `draft` e `published`; publicar ou despublicar altera o mesmo registro operacional. Uma jornada publicada pode ser editada conforme as regras de autorização e integridade, enquanto fatos históricos de execução permanecem preservados em seus próprios registros.

### Participante

A experiência participante cobre:

- cadastro, confirmação, login, recuperação e aceite de documentos legais;
- home, jornadas, aulas, biblioteca, perfil, diagnóstico e ajuda;
- conteúdo, quick checks, avaliações, práticas, entregas, comentários e arquivos;
- pontos, ranking com identificação protegida, recompensas, badges e certificados;
- navegação responsiva, estados de carregamento, erro e retomada.

### Administração

A administração cobre:

- entrada separada por identidade federada e autorização organizacional;
- gestão de jornadas, trilhas, aulas, conteúdos, biblioteca e temas;
- diagnóstico e instrumentos configuráveis;
- campanhas, B2B, recompensas, certificados, usuários e permissões;
- preview participante isolado de mutações, progresso e analytics;
- auditoria das operações administrativas relevantes.

A autenticação administrativa combina identidade externa validada, identidade interna, membership da organização Estímulo e RBAC. Domínio de e-mail, isoladamente, não concede acesso.

## Fundação técnica

- monorepo npm com aplicação Next.js/React/TypeScript;
- PostgreSQL reconstruível por migrations como fonte operacional;
- Supabase como provider autorizado de desenvolvimento, teste e preview;
- Vercel para build e preview web;
- adapters para manter o domínio desacoplado dos providers;
- RLS, RBAC, idempotência, auditoria, eventos e outbox transacional;
- integração externa assíncrona e destination-neutral;
- contratos automatizados de arquitetura, banco, segurança e reprodutibilidade.

A estratégia de ambientes e a fronteira de produção são descritas em [`ENVIRONMENT_AND_CLOUD_STRATEGY.md`](docs/architecture/ENVIRONMENT_AND_CLOUD_STRATEGY.md) e [`AWS_ARCHITECTURE_STATUS.md`](docs/architecture/AWS_ARCHITECTURE_STATUS.md).

## Desenvolvimento local

As versões da toolchain são definidas pelos arquivos versionados do repositório (`.node-version`, `.nvmrc`, `package.json` e lockfile).

```bash
npm ci --ignore-scripts --no-audit --no-fund
cp .env.example .env
npm run validate:release-candidate
npm run dev:web
```

PowerShell:

```powershell
npm ci --ignore-scripts --no-audit --no-fund
Copy-Item .env.example .env
npm run validate:release-candidate
npm run dev:web
```

Configuração e segredos pertencem ao ambiente. Nunca coloque segredo em `NEXT_PUBLIC_*`, no Git ou na documentação.

## Superfícies principais

| Público/participante | Administração |
|---|---|
| `/` | `/entrar/administracao` |
| `/entrar` | `/admin` |
| `/cadastro` | `/admin/produto` |
| `/empreendedor` | `/admin/diagnostico` |
| `/empreendedor/jornadas` | `/admin/biblioteca` |
| `/empreendedor/biblioteca` | `/admin/experiencia` |
| `/empreendedor/recompensas` | `/admin/usuarios` |
| `/empreendedor/perfil` | `/admin/configuracoes` |
| `/ajuda` | |

## Qualidade

O candidato a release deve ser validado pelo SHA exato. Os comandos canônicos incluem:

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

O banco deve ser reconstruível desde zero. Baselines legíveis por máquina só mudam quando a alteração executável correspondente é comprovada; nunca são ajustados para ocultar divergência.

## Estrutura

```text
apps/web/app/                   rotas e composition roots
apps/web/components/            UI compartilhada
apps/web/lib/                   módulos, casos de uso e adapters
config/                         políticas e contratos legíveis por máquina
supabase/migrations/            histórico PostgreSQL executável
supabase/templates/             templates Auth versionados
supabase/functions/             Edge Functions
scripts/                        validação, testes e operação
docs/                           documentação canônica permanente
Dockerfile.lambda               empacotamento web para a fronteira AWS
```

## Documentação

`docs/` contém apenas documentação permanente da plataforma. Releases, incidentes, correções pontuais, rotações de credencial, resultados de CI e evidências de um SHA pertencem ao histórico do GitHub, aos artifacts ou aos sistemas operacionais apropriados. Consulte [`REPOSITORY_MAINTENANCE.md`](docs/REPOSITORY_MAINTENANCE.md).