# Plataforma Estímulo

LMS para operar jornadas de desenvolvimento empreendedor, administrar conteúdo e atividades e produzir evidências educacionais e operacionais com governança.

[Índice da documentação](PROJECT_INDEX.md) · [Visão de arquitetura](docs/architecture/ARCHITECTURE_OVERVIEW.md) · [Fundação da aplicação](docs/implementation/APPLICATION_FOUNDATION.md) · [Ciclo das jornadas](docs/journeys/JOURNEY_LIFECYCLE.md) · [Princípios de produto](docs/product/PRODUCT_PRINCIPLES.md)

## Produto

A plataforma reúne experiência participante e ferramentas administrativas sobre o mesmo domínio. **Cada jornada é única** e possui os estados visíveis `draft` e `published`; publicar ou despublicar altera o mesmo registro operacional. Uma jornada publicada pode ser editada conforme as regras de autorização e integridade, enquanto fatos históricos de execução permanecem preservados em seus próprios registros.

### Participante

A experiência participante cobre cadastro, confirmação, login, recuperação, documentos legais, home, jornadas, aulas, biblioteca, perfil, diagnóstico, ajuda, quick checks, avaliações, práticas, entregas, comentários, arquivos, pontos, ranking com identificação protegida, recompensas, badges e certificados.

### Administração

A administração cobre identidade federada e autorização organizacional, jornadas, trilhas, aulas, conteúdos, biblioteca, temas, diagnóstico, campanhas, B2B, recompensas, certificados, usuários, permissões, preview isolado e auditoria.

A autenticação administrativa combina identidade externa validada, identidade interna, membership da organização Estímulo e RBAC. Domínio de e-mail, isoladamente, não concede acesso.

## Fundação técnica

- monorepo npm com Next.js/React/TypeScript;
- PostgreSQL reconstruível por migrations como fonte operacional;
- Supabase como provider de desenvolvimento, teste e preview;
- Vercel para preview web;
- ports e adapters para desacoplamento de provider;
- RLS, RBAC, idempotência, auditoria, eventos e outbox transacional;
- integração externa assíncrona e destination-neutral;
- contratos automatizados de arquitetura, banco, segurança, portabilidade e reprodutibilidade.

Consulte [`ARCHITECTURE_OVERVIEW.md`](docs/architecture/ARCHITECTURE_OVERVIEW.md) para os diagramas completos e [`PORTABILITY.md`](docs/operations/PORTABILITY.md) para reconstrução em outros ambientes.

## Desenvolvimento local

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
```

O banco deve ser reconstruível desde zero. Baselines legíveis por máquina só mudam quando a alteração executável correspondente é comprovada.

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

`docs/` contém documentação permanente da plataforma. Releases, incidentes, evidências de um SHA e resultados operacionais pertencem ao histórico do GitHub ou aos sistemas apropriados. Consulte [`PROJECT_INDEX.md`](PROJECT_INDEX.md).
