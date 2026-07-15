# Plataforma Estímulo

Plataforma interna multi-jornada para desenvolvimento de empreendedores da Estímulo.

## Estado atual

A fundação técnica existe e é reproduzível, mas o produto oficial ainda não está autorizado para produção.

```text
Supabase = desenvolvimento e teste
AWS staging = gate obrigatório
AWS produção = ambiente oficial
PostgreSQL = banco operacional do LMS, eventos e outbox
HubSpot = User 360 e projeções de relacionamento
```

Já foram comprovados:

- 265 migrations executáveis e replay limpo;
- equivalência estrutural do banco;
- 18 contratos públicos históricos de RPC e superfícies server-only adicionais;
- backend E2E com publicação, matrícula, diagnóstico, atividade, avaliações versionadas, progresso, pontos, eventos e outbox;
- aplicação Next.js com áreas de participante e operação;
- comentários e uploads por aula, storage privado, quarentena, scan e revisão;
- avaliação multiquestão com tentativas e correção versionada;
- emissão idempotente de selos e certificados, carteira do participante e validação pública;
- biblioteca versionada com busca textual PostgreSQL, artigos próprios e links externos rastreados;
- Browser E2E sintético com teclado, reload e viewport mobile;
- cadastro público opcional, restrito a desenvolvimento/teste e desabilitado por padrão;
- motor configurável de formulários, arquétipos e ativações;
- porta HubSpot e adapter em memória;
- instalação reproduzível em Ubuntu e Windows.

Ainda faltam as entradas oficiais, identidade/site, adapter HubSpot real, auditoria completa de acessibilidade e AWS staging. As regras, contas e conteúdos sintéticos usados nos testes não substituem a configuração homologada da Jornada OpenAI.

## Estrutura

```text
apps/web/                              aplicação Next.js
apps/web/lib/hubspot/                  porta e utilitários HubSpot
apps/web/lib/configurable-product/     formulário, classificação e ativações
apps/web/lib/journey-runtime/          runtime da jornada e compatibilidade RPC
apps/web/lib/credentials/              emissão e leitura de credenciais
apps/web/lib/auth/                     identidade e gates de autenticação
supabase/migrations/                   histórico executável
supabase/canonical-migrations/         manifests e SQL canônico
supabase/functions/                    adapters ativos em desenvolvimento/teste
docs/                                  documentação atual
scripts/application/                   validações da aplicação
scripts/database/                      replay, contratos, equivalência e E2E
scripts/integrations/                  testes de integração
scripts/product/                       testes do motor configurável
```

## Desenvolvimento web

Pré-requisitos:

- Node.js 22 ou superior;
- npm 10.9.2;
- projeto Supabase autorizado somente para desenvolvimento/teste.

```bash
cp .env.example apps/web/.env.local
npm ci --ignore-scripts
npm run typecheck:web
npm run test:application-foundation
npm run test:configurable-product
npm run build:web
npm run dev:web
```

Preencha as três credenciais do Supabase em `apps/web/.env.local`. A URL da logo oficial já vem configurada no exemplo e pode ser substituída somente por um asset aprovado.

### Cadastro público para testes

O cadastro é desabilitado por padrão. Para habilitá-lo somente em `next dev`:

```env
APP_ENV=development
PUBLIC_SIGNUP_TEST_MODE=true
```

O gate também exige as credenciais do Supabase e recusa o recurso quando `NODE_ENV=production`, mesmo que a flag esteja definida. O cadastro cria uma conta confirmada e um perfil mínimo de empreendedor marcado como dado de teste; não concede organização, papel operacional, matrícula ou conteúdo oficial.

## Validações principais

```bash
npm run validate:repository
npm run validate:dependency-lock
npm run validate:migration-history
npm run validate:public-rpc-contracts
npm run validate:legacy-rpc-containment
npm run test:database-gates
npm run test:application-foundation
npm run test:configurable-product
npm run typecheck:web
npm run build:web
```

Validações específicas de integração continuam disponíveis quando a área correspondente for modificada:

```bash
npm run test:hubspot-contracts
npm run test:legacy-rpc-containment
npm run test:migration-history
npm run test:public-rpc-contracts
npm run test:test-public-signup
```

## Documentação principal

- [Índice do projeto](PROJECT_INDEX.md)
- [Premissas e escopo](docs/product/PREMISES_AND_SCOPE.md)
- [Registro de decisões](docs/decisions/DECISION_LOG.md)
- [Bloqueadores da entrega](docs/implementation/DELIVERY_BLOCKERS.md)
- [Delta de schema](docs/implementation/SCHEMA_DELTA.md)
- [Motor configurável](docs/implementation/CONFIGURABLE_PRODUCT_ENGINE.md)
- [Fundação da aplicação](docs/implementation/APPLICATION_FOUNDATION.md)
- [Backend E2E](docs/implementation/BACKEND_E2E.md)
- [ADR HubSpot](docs/decisions/ADR-003-HUBSPOT-AUTHORITATIVE-DATA-SOURCE.md)
- [Fluxo HubSpot](docs/integrations/HUBSPOT_LOGICAL_DATA_FLOW.md)
- [Inventário mínimo HubSpot](docs/integrations/HUBSPOT_INVENTORY_REQUEST.md)
- [Estratégia Supabase → AWS](docs/architecture/SUPABASE_AWS_PORTABILITY.md)

## Regras essenciais

- documentos oficiais da Estímulo prevalecem sobre ADRs, código e protótipos;
- não fazer commit direto em `main`;
- migrations aplicadas nunca são editadas;
- Supabase nunca é produção oficial;
- dados relevantes são projetados ao HubSpot por outbox e reconciliação;
- readback é reservado para escritas CRM críticas;
- nenhuma capacidade é concluída sem teste e evidência proporcionais;
- recursos exclusivos de teste devem falhar fechados em produção;
- não criar planos, documentos ou refatorações sem necessidade concreta para a entrega.
