# Plataforma Estímulo

Plataforma web LMS para desenvolvimento de empreendedores, capacitação integrada à jornada do Estímulo e geração estruturada de dados educacionais e operacionais.

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

A fundação técnica e as principais capacidades genéricas estão implementadas e reproduzíveis. O produto oficial ainda não pode ser liberado para usuários reais porque faltam entradas, credenciais, homologações e provas externas listadas em [DELIVERY_BLOCKERS.md](docs/implementation/DELIVERY_BLOCKERS.md).

```text
Supabase = desenvolvimento e teste
AWS staging = scaffolding implementado, ainda não aplicado
AWS produção = ambiente oficial futuro
PostgreSQL = banco operacional, eventos e outbox
HubSpot = vínculo mínimo, engajamento e dados úteis para cálculos aprovados
```

### Comprovado no repositório e no ambiente de desenvolvimento

- 245 migrations recuperadas mais 30 migrations ativas, totalizando 275 migrations executáveis;
- replay limpo, equivalência estrutural e contratos públicos históricos de RPC;
- backend E2E sintético com publicação, matrícula, diagnóstico, atividade, avaliações, progresso, pontos, eventos e outbox;
- aplicação Next.js com áreas de participante e operação;
- cadastro público com confirmação de e-mail, first-touch UTM e papel inicial de participante;
- RBAC administrativo explícito, revogável, temporal e auditável, sem concessão por domínio de e-mail;
- comentários, uploads privados e revisão por aula;
- quarentena, estados de scan e adapter de scanner externo fail-closed;
- avaliação multiquestão com tentativas;
- avaliação opcional de utilidade de 1 a 5 com histórico append-only;
- emissão idempotente de selos e certificados;
- biblioteca versionada;
- motor configurável de formulários e arquétipos;
- diagnóstico de maturidade versionado em draft, sem atribuição, crédito ou sincronização CRM;
- pré-visualização administrativa da maturidade sem persistência;
- adapter HubSpot HTTP real, server-only e allowlist, bloqueado sem inventário e sandbox;
- integração por links controlados com Data Hub, IA de entrevista e plataforma existente;
- Browser E2E sintético de interface;
- imagem standalone não-root, liveness e readiness fail-closed;
- baseline Terraform de staging com ECS, ALB, RDS, S3, SQS/DLQ, KMS e CloudWatch;
- instalação reproduzível em Ubuntu e Windows em provas anteriores.

Essas provas não equivalem ao produto final. Ainda faltam:

- configuração oficial e homologada dos quatro arquétipos;
- pacote editorial publicável da Jornada OpenAI;
- integração oficial com site e identidade;
- inventário físico, matriz, credenciais e prova HubSpot em sandbox;
- provedor real de malware configurado e testado com arquivos clean e infected;
- adapters ativos para identidade, RDS, S3 e SQS na AWS;
- AWS staging aplicado, com backup, restore, rollback e E2E real;
- decisões e aprovações de segurança, privacidade, jurídico, crédito, acessibilidade e conteúdo;
- rotação/revogação confirmada da credencial historicamente exposta;
- autorização/licença para eventual cópia literal do projeto de referência.

## Política HubSpot

A integração do LMS com o HubSpot armazena somente:

- identificadores mínimos para associar o registro ao usuário correto;
- sinais agregados de engajamento aprovados;
- entradas ou resultados úteis para cálculos, classificações, personalização, análise ou pesquisa aprovados.

O PostgreSQL preserva o detalhe completo.

Não são sincronizados por padrão:

- configurações editoriais e conteúdo integral;
- estado transacional detalhado;
- respostas brutas e textos abertos sem finalidade aprovada;
- arquivos binários e URLs assinadas;
- logs, traces, filas, retries e segredos.

Nenhum sinal educacional ou comportamental pode influenciar decisão de crédito sem validação metodológica, revisão de equidade, governança humana e aprovação jurídica e de privacidade.

## Estrutura

```text
apps/web/                              aplicação Next.js
apps/web/lib/auth/                     identidade e gates
apps/web/lib/hubspot/                  política e adapter HubSpot
apps/web/lib/configurable-product/     formulário, classificação e ativações
apps/web/lib/journey-runtime/          runtime da jornada e compatibilidade RPC
apps/web/lib/credentials/              credenciais
infra/aws/terraform/                   scaffolding parametrizado de staging
supabase/migrations/                   histórico executável
supabase/canonical-migrations/         manifests e SQL canônico
supabase/functions/                    adapters de desenvolvimento/teste
scripts/application/                   validações da aplicação
scripts/database/                      replay, contratos e E2E
docs/                                  produto, decisões, arquitetura e operação
```

## Execução local

Pré-requisitos:

- Node.js 22;
- npm 10.9.2;
- PostgreSQL/Supabase autorizado somente para desenvolvimento e teste.

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

## Validações principais

```bash
npm run validate:repository
npm run validate:migration-history
npm run test:database-gates
npm run test:application-foundation
npm run test:configurable-product
npm run test:hubspot-contracts
npm run typecheck:web
npm run build:web
npm run test:browser-e2e
```

Os workflows do PR devem executar essas provas. Uma execução com job encerrado antes de qualquer step é tratada como indisponibilidade externa do GitHub Actions, não como aprovação nem como falha funcional comprovada.

## Documentação principal

- [Hierarquia das fontes](docs/product/SOURCE_AUTHORITY_HIERARCHY.md)
- [Índice do projeto](PROJECT_INDEX.md)
- [Premissas e escopo](docs/product/PREMISES_AND_SCOPE.md)
- [DEC-070 — Escopo HubSpot](docs/decisions/HUBSPOT_SCOPE_DECISION.md)
- [Registro de decisões](docs/decisions/DECISION_LOG.md)
- [Matriz de rastreabilidade](docs/implementation/PREMISE_TRACEABILITY_MATRIX.md)
- [Bloqueadores](docs/implementation/DELIVERY_BLOCKERS.md)
- [Contrato HubSpot](docs/integrations/HUBSPOT_ADAPTER_CONTRACT.md)
- [Estratégia Supabase → AWS](docs/architecture/SUPABASE_AWS_PORTABILITY.md)
- [Baseline AWS](infra/aws/terraform/README.md)

## Regras essenciais

- a fonte superior prevalece sobre ADRs, código e protótipos;
- não fazer commit direto em `main`;
- migrations aplicadas nunca são editadas;
- Supabase nunca é produção oficial;
- toda ação relevante gera evento estruturado;
- o HubSpot recebe somente dados previstos na DEC-070 e em destino explicitamente aprovado;
- nenhuma capacidade é concluída sem evidência proporcional;
- recursos de teste e integrações não configuradas falham fechados em produção;
- código, testes, integração e documentação mudam juntos.
