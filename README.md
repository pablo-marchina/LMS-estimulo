# Plataforma Estímulo

Plataforma web LMS interna para desenvolvimento de empreendedores, capacitação integrada à jornada de crédito e geração estruturada de dados comportamentais.

## Autoridade documental

A hierarquia canônica está em [docs/product/SOURCE_AUTHORITY_HIERARCHY.md](docs/product/SOURCE_AUTHORITY_HIERARCHY.md).

```text
1. premissas-desenvolvimento.md = maior autoridade do projeto
2. demais documentos do pacote = autoridade de produto, negócio, conteúdo, pedagogia, operação e impacto
3. decisões posteriores explicitamente aprovadas
4. issues do GitHub = backlog obrigatório
5. ADRs, código e testes = meios e evidências técnicas
```

Questões técnicas são resolvidas com segurança, evidência dos ambientes, melhores práticas e ADRs, sem reduzir silenciosamente requisitos superiores.

## Estado atual

A fundação técnica existe e é reproduzível, mas o produto oficial ainda não está autorizado para produção.

```text
Supabase = desenvolvimento e teste
AWS staging = gate obrigatório
AWS produção = ambiente oficial
PostgreSQL = banco operacional, eventos e outbox
HubSpot = centro das informações do usuário e integração obrigatória
```

Já foram comprovados:

- 265 migrations executáveis e replay limpo;
- equivalência estrutural do banco;
- contratos públicos históricos de RPC e superfícies server-only;
- backend E2E sintético com publicação, matrícula, diagnóstico, atividade, avaliações, progresso, pontos, eventos e outbox;
- aplicação Next.js com áreas de participante e operação;
- comentários e uploads por aula;
- storage privado, quarentena, estados de scan e revisão;
- avaliação multiquestão com tentativas e correção versionada;
- emissão idempotente de selos e certificados;
- carteira do participante e validação pública;
- biblioteca versionada com busca textual, artigos próprios e links externos;
- Browser E2E sintético de interface;
- cadastro público opcional e restrito a desenvolvimento/teste;
- motor configurável de formulários, arquétipos e ativações;
- porta HubSpot e adapter em memória;
- instalação reproduzível em Ubuntu e Windows.

Essas provas não equivalem ao produto final. Ainda faltam:

- configuração oficial do diagnóstico;
- Jornada OpenAI publicável;
- integração real com site e identidade;
- adapter HubSpot real e matriz que represente todos os dados do usuário;
- auditoria completa de acessibilidade;
- controles de segurança e privacidade para usuários reais;
- AWS staging e produção;
- E2E real usando identidade, banco, storage, scan e HubSpot sandbox.

## Requisitos superiores resumidos

- a entrega final deve possuir todas as funcionalidades solicitadas pela Estímulo e operar em produção na AWS;
- o produto deve ser desenvolvido e mantido internamente;
- as issues devem ser verificadas continuamente;
- o legado deve ser reutilizado quando seguro e mantido sob arquitetura clara;
- todas as ações relevantes do usuário devem ser armazenadas como dados estruturados;
- todos os dados do usuário capturados ou usados devem possuir representação no HubSpot;
- clientes com crédito devem manter a identidade existente no HubSpot;
- clientes sem crédito devem ser criados sem impedir futura associação ao mesmo registro;
- entrada deve resolver nome, e-mail, CPF, telefone, CNPJ opcional e UTMs;
- a experiência deve seguir o guia da Estímulo e os mockups como referência subordinada;
- diagnóstico, arquétipos, trilhas, biblioteca, engajamento e administração devem ser configuráveis.

## Estrutura

```text
apps/web/                              aplicação Next.js
apps/web/lib/auth/                     identidade e gates de autenticação
apps/web/lib/hubspot/                  porta e utilitários HubSpot
apps/web/lib/configurable-product/     formulário, classificação e ativações
apps/web/lib/journey-runtime/          runtime da jornada e compatibilidade RPC
apps/web/lib/credentials/              emissão e leitura de credenciais
supabase/migrations/                   histórico executável
supabase/canonical-migrations/         manifests e SQL canônico
supabase/functions/                    adapters de desenvolvimento/teste
docs/                                  produto, decisões, arquitetura e operação
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

Preencha credenciais por ambiente seguro. Nunca copie valores reais de materiais de referência para o Git.

### Cadastro público para testes

O cadastro é desabilitado por padrão. Para habilitá-lo somente em desenvolvimento:

```env
APP_ENV=development
PUBLIC_SIGNUP_TEST_MODE=true
```

Esse cadastro não substitui a integração oficial de identidade, site e HubSpot.

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

Validações específicas:

```bash
npm run test:hubspot-contracts
npm run test:legacy-rpc-containment
npm run test:migration-history
npm run test:public-rpc-contracts
npm run test:test-public-signup
npm run test:browser-e2e
```

## Documentação principal

- [Hierarquia das fontes](docs/product/SOURCE_AUTHORITY_HIERARCHY.md)
- [Índice do projeto](PROJECT_INDEX.md)
- [Premissas e escopo](docs/product/PREMISES_AND_SCOPE.md)
- [Registro de decisões](docs/decisions/DECISION_LOG.md)
- [Matriz de rastreabilidade](docs/implementation/PREMISE_TRACEABILITY_MATRIX.md)
- [Bloqueadores da entrega](docs/implementation/DELIVERY_BLOCKERS.md)
- [Motor configurável](docs/implementation/CONFIGURABLE_PRODUCT_ENGINE.md)
- [Fundação da aplicação](docs/implementation/APPLICATION_FOUNDATION.md)
- [Backend E2E](docs/implementation/BACKEND_E2E.md)
- [ADR HubSpot](docs/decisions/ADR-003-HUBSPOT-AUTHORITATIVE-DATA-SOURCE.md)
- [Fluxo HubSpot](docs/integrations/HUBSPOT_LOGICAL_DATA_FLOW.md)
- [Estratégia Supabase → AWS](docs/architecture/SUPABASE_AWS_PORTABILITY.md)

## Regras essenciais

- a fonte superior prevalece sobre ADRs, código e protótipos;
- não fazer commit direto em `main`;
- migrations aplicadas nunca são editadas;
- Supabase nunca é produção oficial;
- todo dado de usuário capturado ou usado deve possuir representação HubSpot;
- toda ação relevante deve gerar evento estruturado;
- nenhuma capacidade é concluída sem teste e evidência proporcionais;
- recursos exclusivos de teste devem falhar fechados em produção;
- código, testes, integração e documentação da mesma capacidade mudam juntos;
- não criar planos, documentos ou refatorações sem necessidade concreta para a entrega.
