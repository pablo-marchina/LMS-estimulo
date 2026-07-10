# Plataforma Estímulo

Plataforma interna multi-jornada para desenvolvimento de empreendedores da Estímulo.

## Estado atual

O projeto está no workstream **E14**. A aplicação Next.js e a fundação PostgreSQL existem, mas o produto ainda não está autorizado para produção.

```text
Supabase = desenvolvimento e teste
AWS staging = gate obrigatório
AWS produção = ambiente oficial futuro
```

O histórico remoto M00–M14 está materializado no Git. O replay transacional das 243 migrations e a equivalência estrutural passaram; o bloqueio técnico prioritário agora é congelar os contratos públicos e reproduzir o backend E2E com checks negativos de RLS, idempotência e concorrência.

## Estrutura

```text
apps/web/                         aplicação Next.js
supabase/migrations/              histórico executável de migrations
supabase/canonical-migrations/    SQL canônico, manifests e baseline estrutural
supabase/functions/               adapters ativos apenas no Supabase de teste
docs/                             documentação canônica atual
scripts/e14/                      validação, replay e equivalência do workstream atual
```

Artefatos de execução, outputs de testes, relatórios locais e exports de banco não são versionados. O histórico Git é o arquivo de versões substituídas.

## Desenvolvimento web

Pré-requisitos:

- Node.js 22 ou superior;
- npm;
- projeto Supabase autorizado somente para desenvolvimento/teste.

```bash
cp apps/web/.env.example apps/web/.env.local
npm install --ignore-scripts
npm run typecheck:web
npm run test:e14-step5
npm run build:web
```

A instalação ainda não é totalmente determinística porque o repositório não possui lockfile canônico. Não usar esse setup como evidência de prontidão produtiva.

## Validações

```bash
npm run validate:repository
npm run validate:e14-runtime-history
npm run test:e14-clean-replay
npm run validate:e14-step5
npm run test:e14-step5
npm run test:e14-runtime-recovery
npm run typecheck:web
npm run build:web
```

`npm run test:e14-clean-replay` exige PostgreSQL 17.6 compatível com o ambiente Supabase e executa validação dos manifests, replay das 243 migrations e comparação estrutural.

## Documentação

- [Índice atual do projeto](PROJECT_INDEX.md)
- [Premissas e escopo](docs/product/PREMISES_AND_SCOPE.md)
- [Registro de decisões](docs/decisions/DECISION_LOG.md)
- [Registro de bloqueadores](docs/implementation/E14_BLOCKER_REGISTER.md)
- [Lacuna do runtime E14](docs/implementation/RUNTIME_GAP_E14.md)
- [Estratégia Supabase → AWS](docs/architecture/SUPABASE_AWS_PORTABILITY.md)
- [Guia de contribuição](CONTRIBUTING.md)

## Regras essenciais

- não fazer commit direto em `main`;
- não criar branch, issue ou PR sem um trabalho independente e necessário;
- fechar PRs substituídos e excluir branches depois do merge;
- não versionar outputs gerados, dados pessoais, credenciais ou exports locais;
- migrations aplicadas nunca são editadas;
- nenhuma capacidade é considerada concluída sem teste e evidência reproduzível;
- Supabase nunca deve ser descrito ou promovido como produção oficial.
