# Plataforma Estímulo

LMS para operar jornadas de desenvolvimento empreendedor, administrar conteúdos e atividades e produzir dados educacionais e operacionais com governança.

> **Ambientes:** Supabase/Vercel são o runtime ativo para desenvolvimento, teste, preview, demonstração e validação controlada. AWS continua sendo o destino institucional planejado para produção definitiva; sua arquitetura ainda depende de decisão/implementação. `Dockerfile.lambda` permanece o único artefato AWS aprovado e o provider AWS é *fail-closed*.

[Índice da documentação](PROJECT_INDEX.md) · [Fundação atual](docs/implementation/APPLICATION_FOUNDATION.md) · [Contratos atuais](docs/implementation/CURRENT_PLATFORM_BEHAVIOR.md) · [Ciclo das jornadas](docs/journeys/JOURNEY_LIFECYCLE.md) · [Handoff Supabase/Vercel](docs/deployments/SUPABASE_VERCEL_HANDOFF.md)

## Produto

A plataforma reúne experiência participante e ferramentas administrativas. Jornada possui um único registro operacional e estados visíveis `draft`/`published`; publicar/despublicar altera o mesmo registro e uma jornada publicada pode ser editada ao vivo. Nomes físicos legados `journey_version*` são compatibilidade do schema, não snapshots editoriais do produto.

### Participante

- cadastro, confirmação, login e recuperação;
- Termos/Privacidade e nova aceitação obrigatória;
- home, jornadas, aulas, biblioteca, perfil, diagnóstico e ajuda;
- perguntas rápidas, avaliações, práticas, entregas, comentários e arquivos;
- pontos, ranking com identificação mascarada, recompensas, badges e certificados;
- cards de jornada e áreas principais de aula acionáveis;
- shell/header participante preservado em `/ajuda`.

A home pode usar jornadas elegíveis para escolher o destaque (incluindo OpenAI), mas falha nessa consulta opcional não derruba os dados centrais da página.

### Administração

- entrada separada em `/entrar/administracao` por Google OAuth;
- callback valida usuário/e-mail confirmado, identidade Google, vínculo interno e membership Estímulo; RBAC decide capabilities;
- domínio de e-mail isolado não concede acesso e o callback não depende de `getClaims()`/AMR para identificar Google;
- edição ao vivo de jornadas publicadas, trilhas, aulas e conteúdos;
- diagnóstico, CMS, biblioteca, campanhas, B2B, recompensas, certificados, usuários e auditoria;
- preview isolado sem matrícula/progresso/analytics.

## Contratos recentes importantes

- diagnóstico: média de scores configurados + thresholds como limites superiores inclusivos, ordenados da faixa menor para a maior;
- `multiple_choice`: conjunto selecionado precisa ser exatamente igual ao conjunto correto;
- popup de badge: somente award realmente novo é anunciado; histórico vira baseline;
- ranking: e-mail é mascarado no banco, sem código fictício;
- e-mail de confirmação Supabase: template versionado + sincronização/verificação remota.

Detalhes em [`CURRENT_PLATFORM_BEHAVIOR.md`](docs/implementation/CURRENT_PLATFORM_BEHAVIOR.md).

## Fundação técnica

- monólito modular Next.js 16, React 19 e TypeScript;
- PostgreSQL reproduzível por migrations;
- Supabase Auth, Storage, PostgreSQL e Edge Functions no runtime autorizado atual;
- Vercel para build/deploy web de preview/validação;
- RLS, RBAC, idempotência, eventos, auditoria e outbox;
- gateway autenticado para RPCs privilegiadas;
- integrações externas desacopladas por outbox; nenhum CRM é dependência síncrona do domínio;
- contratos e gates de qualidade, segurança, integridade e reprodutibilidade.

## Desenvolvimento local

### Pré-requisitos

- Git;
- Node.js `22.23.1` para a toolchain local/reprodutível documentada;
- npm `10.9.8`;
- projeto Supabase autorizado para teste;
- Google OAuth configurado para administração;
- duas chaves Base64 independentes de 32 bytes para CPF.

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

Configuração mínima:

```dotenv
APP_ENV=development
PLATFORM_RUNTIME_PROVIDER=supabase
NEXT_PUBLIC_APP_URL=http://localhost:3000
ETL_EXPORT_ENABLED=false
```

Nunca coloque segredos em `NEXT_PUBLIC_*`.

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

O banco deve ser reconstruível desde zero e baselines legíveis por máquina não podem ser alterados para mascarar divergência. A evidência de um SHA pertence aos workflows/artefatos desse SHA.

## Estrutura

```text
apps/web/app/                   rotas e composition roots
apps/web/components/            UI compartilhada
apps/web/lib/                   módulos/casos de uso/adapters
config/                         políticas e contratos de arquitetura
supabase/migrations/            histórico PostgreSQL executável
supabase/templates/             templates Auth versionados
supabase/functions/             Edge Functions
scripts/                        validação, testes e operação
docs/                           documentação canônica
Dockerfile.lambda               artefato AWS aprovado
```

## Contribuição

Mudanças seguem branch + pull request com código, migrations, testes e documentação sincronizados. `main` só muda por fluxo autorizado e pelos mesmos gates.