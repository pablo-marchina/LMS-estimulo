# Plataforma Estímulo

Plataforma web LMS interna para desenvolvimento de empreendedores, capacitação integrada à jornada de crédito e geração estruturada de dados comportamentais.

## Autoridade documental

A hierarquia canônica está em [docs/product/SOURCE_AUTHORITY_HIERARCHY.md](docs/product/SOURCE_AUTHORITY_HIERARCHY.md).

```text
1. premissas-desenvolvimento.md
2. demais documentos do pacote para domínios não técnicos
3. decisões posteriores explicitamente aprovadas
4. issues do GitHub
5. ADRs, código e testes
```

Questões técnicas são resolvidas com segurança, evidência dos ambientes, documentação oficial e melhores práticas, sem reduzir requisitos superiores.

## Estado atual

A fundação técnica existe e é reproduzível, mas o produto oficial ainda não está pronto para usuários reais.

```text
Supabase = desenvolvimento e teste
AWS staging = gate obrigatório
AWS produção = ambiente oficial
PostgreSQL = banco operacional, eventos e outbox
HubSpot = vínculo mínimo, engajamento e dados úteis para cálculos aprovados
```

Já foram comprovados:

- 265 migrations executáveis e replay limpo;
- equivalência estrutural do banco;
- contratos públicos históricos de RPC;
- backend E2E sintético com publicação, matrícula, diagnóstico, atividade, avaliações, progresso, pontos, eventos e outbox;
- aplicação Next.js com áreas de participante e operação;
- comentários e uploads por aula;
- storage privado, quarentena, estados de scan e revisão;
- avaliação multiquestão com tentativas;
- emissão idempotente de selos e certificados;
- biblioteca versionada;
- Browser E2E sintético de interface;
- cadastro opcional restrito a desenvolvimento/teste;
- motor configurável de formulários e arquétipos;
- porta HubSpot e adapter em memória;
- instalação reproduzível em Ubuntu e Windows.

Essas provas não equivalem ao produto final. Ainda faltam:

- configuração oficial do diagnóstico;
- Jornada OpenAI publicável;
- integração real com site e identidade;
- adapter HubSpot real e matriz de sincronização;
- controles de segurança e privacidade;
- auditoria completa de acessibilidade;
- AWS staging e produção;
- E2E real usando identidade, banco, storage, scan e HubSpot sandbox.

## Política HubSpot

A integração do LMS com o HubSpot armazena somente:

- identificadores mínimos para associar o registro ao usuário correto;
- informações de engajamento na plataforma;
- informações que possam contribuir para cálculos, classificações, personalização, análise ou pesquisa aprovados.

O PostgreSQL preserva o detalhe completo.

Não são sincronizados por padrão:

- configurações editoriais e conteúdo integral;
- estado transacional detalhado;
- payloads brutos sem finalidade;
- arquivos binários e URLs assinadas;
- logs, traces, filas, retries e segredos.

Nenhum sinal educacional ou comportamental pode influenciar decisão de crédito sem validação e governança.

## Estrutura

```text
apps/web/                              aplicação Next.js
apps/web/lib/auth/                     identidade e gates
apps/web/lib/hubspot/                  porta e utilitários HubSpot
apps/web/lib/configurable-product/     formulário, classificação e ativações
apps/web/lib/journey-runtime/          runtime da jornada e compatibilidade RPC
apps/web/lib/credentials/              credenciais
supabase/migrations/                   histórico executável
supabase/canonical-migrations/         manifests e SQL canônico
supabase/functions/                    adapters de desenvolvimento/teste
docs/                                  produto, decisões, arquitetura e operação
scripts/application/                   validações da aplicação
scripts/database/                      replay, contratos e E2E
scripts/integrations/                  testes de integração
```

## Execução local

Pré-requisitos:

- Node.js 22;
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

Use credenciais por ambiente seguro. Nunca copie valores reais de materiais de referência para o Git.

### Cadastro de teste

```env
APP_ENV=development
PUBLIC_SIGNUP_TEST_MODE=true
```

Esse cadastro não substitui a integração oficial de identidade, site e HubSpot.

## Validações principais

```bash
npm run validate:repository
npm run test:database-gates
npm run test:application-foundation
npm run test:configurable-product
npm run typecheck:web
npm run build:web
npm run test:hubspot-contracts
npm run test:browser-e2e
```

## Documentação principal

- [Hierarquia das fontes](docs/product/SOURCE_AUTHORITY_HIERARCHY.md)
- [Índice do projeto](PROJECT_INDEX.md)
- [Premissas e escopo](docs/product/PREMISES_AND_SCOPE.md)
- [DEC-070 — Escopo HubSpot](docs/decisions/HUBSPOT_SCOPE_DECISION.md)
- [Registro de decisões](docs/decisions/DECISION_LOG.md)
- [Matriz de rastreabilidade](docs/implementation/PREMISE_TRACEABILITY_MATRIX.md)
- [Bloqueadores](docs/implementation/DELIVERY_BLOCKERS.md)
- [ADR HubSpot](docs/decisions/ADR-003-HUBSPOT-AUTHORITATIVE-DATA-SOURCE.md)
- [Fluxo HubSpot](docs/integrations/HUBSPOT_LOGICAL_DATA_FLOW.md)
- [Estratégia Supabase → AWS](docs/architecture/SUPABASE_AWS_PORTABILITY.md)

## Regras essenciais

- a fonte superior prevalece sobre ADRs, código e protótipos;
- não fazer commit direto em `main`;
- migrations aplicadas nunca são editadas;
- Supabase nunca é produção oficial;
- toda ação relevante gera evento estruturado;
- o HubSpot recebe somente dados previstos na DEC-070;
- nenhuma capacidade é concluída sem evidência proporcional;
- recursos de teste falham fechados em produção;
- código, testes, integração e documentação mudam juntos.
