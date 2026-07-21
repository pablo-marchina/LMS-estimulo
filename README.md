# Plataforma Estímulo

Plataforma web LMS para desenvolvimento de empreendedores, capacitação integrada à jornada do Estímulo e geração estruturada de dados educacionais e operacionais.

Os requisitos ativos do produto estão em [`premissas-desenvolvimento.md`](premissas-desenvolvimento.md). Auditorias, cobertura e decisões de reaproveitamento de materiais externos não são documentadas neste repositório.

## Estado atual

A fundação técnica e as principais capacidades genéricas estão implementadas e reproduzíveis. O produto oficial ainda não deve ser liberado para usuários reais enquanto os bloqueadores operacionais de [`DELIVERY_BLOCKERS.md`](docs/implementation/DELIVERY_BLOCKERS.md) permanecerem abertos.

```text
Supabase = desenvolvimento e teste
AWS staging = scaffolding implementado, ainda não aplicado
AWS produção = ambiente oficial futuro
PostgreSQL = banco operacional, eventos e outbox
HubSpot = somente classes aprovadas e destinos explicitamente autorizados
```

### Implementado no repositório e no ambiente de desenvolvimento

- migrations executáveis, replay limpo, equivalência estrutural e contratos públicos de RPC;
- aplicação Next.js com áreas de participante e administração;
- cadastro público com confirmação de e-mail, first-touch UTM e CPF obrigatório protegido;
- CPF validado, cifrado com AES-256-GCM e deduplicado por HMAC server-only;
- entrada administrativa restrita a e-mail confirmado `@estimulo.org` e autorização RBAC;
- RBAC revogável, temporal e auditável;
- comentários, uploads privados, moderação e revisão de práticas;
- quarentena, estados de scan e adapter de scanner externo fail-closed;
- avaliações multiquestão e nota de utilidade em cinco estrelas;
- progresso, pontos, selos, certificados e biblioteca versionada;
- motor configurável de formulários, arquétipos e ativações;
- diagnóstico de maturidade em draft, sem atribuição, crédito ou CRM;
- adapter HubSpot HTTP server-only e fail-closed;
- integração controlada com sistemas externos existentes;
- identidade visual Estímulo com assets locais;
- Browser E2E sintético;
- imagem standalone não-root, liveness e readiness;
- Terraform de staging com ECS, ALB, RDS, S3, SQS/DLQ, KMS e CloudWatch.

Essas provas ainda não equivalem ao produto final. Permanecem necessários, entre outros:

- configuração oficial e homologada dos quatro arquétipos;
- pacote editorial publicável da Jornada OpenAI;
- experiência completa de participante e administração com dados oficiais;
- integração oficial com site e identidade;
- inventário, credenciais e prova HubSpot em sandbox;
- scanner real configurado e testado;
- adapters AWS ativos e staging aplicado;
- E2E real, backup, restore e rollback;
- aprovações de segurança, privacidade, jurídico, crédito, acessibilidade e conteúdo;
- rotação/revogação confirmada da credencial historicamente exposta.

## Identidade e acesso

Participantes usam cadastro público e confirmação de e-mail. O CPF é solicitado na conclusão do cadastro e não é armazenado em metadata, URL, logs ou eventos brutos.

A área `/admin` exige simultaneamente:

1. e-mail confirmado no domínio exato `@estimulo.org`;
2. vínculo organizacional ativo;
3. permissões RBAC correspondentes à operação.

O domínio habilita a entrada administrativa, mas não concede poderes automaticamente.

## Política HubSpot

Somente estas classes podem produzir candidatos de sincronização:

```text
linking_identifier
engagement_signal
calculation_input_or_result
```

Sem um destino aprovado, o resultado é `not_synced`. O PostgreSQL preserva o detalhe completo.

Não são sincronizados por padrão:

- conteúdo e configuração editorial;
- estado transacional detalhado;
- respostas brutas e textos abertos sem finalidade aprovada;
- arquivos e URLs assinadas;
- logs, traces, filas, retries e segredos.

Nenhum sinal educacional ou comportamental pode influenciar crédito sem validação metodológica, revisão de equidade, governança humana e aprovação jurídica e de privacidade.

## Estrutura

```text
apps/web/                              aplicação Next.js
apps/web/lib/auth/                     identidade e gates
apps/web/lib/identity/                 proteção de identificadores pessoais
apps/web/lib/hubspot/                  política e adapter HubSpot
apps/web/lib/configurable-product/     formulário, classificação e ativações
apps/web/lib/journey-runtime/          runtime de jornadas
apps/web/lib/credentials/              credenciais
infra/aws/terraform/                   scaffolding de staging
supabase/migrations/                   histórico executável
supabase/functions/                    adapters de desenvolvimento/teste
scripts/application/                   validações da aplicação
scripts/database/                      replay, contratos e E2E
docs/                                  produto, decisões, arquitetura e operação
```

## Execução local

Pré-requisitos:

- Node.js 22;
- npm 10.9.2;
- PostgreSQL/Supabase autorizado para desenvolvimento e teste;
- duas chaves server-only independentes de 32 bytes em base64 para proteção do CPF.

```bash
cp .env.example apps/web/.env.local
npm ci --ignore-scripts
npm run typecheck:web
npm run test:application-foundation
npm run test:configurable-product
npm run build:web
npm run dev:web
```

Nunca registre credenciais ou dados pessoais reais no Git.

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

## Documentação principal

- [Requisitos do produto](premissas-desenvolvimento.md)
- [Índice do projeto](PROJECT_INDEX.md)
- [Decisões](docs/decisions/DECISION_LOG.md)
- [Escopo HubSpot](docs/decisions/HUBSPOT_SCOPE_DECISION.md)
- [Bloqueadores de entrega](docs/implementation/DELIVERY_BLOCKERS.md)
- [Contrato HubSpot](docs/integrations/HUBSPOT_ADAPTER_CONTRACT.md)
- [Estratégia Supabase → AWS](docs/architecture/SUPABASE_AWS_PORTABILITY.md)
- [Baseline AWS](infra/aws/terraform/README.md)

## Regras essenciais

- não fazer commit direto em `main`;
- migrations aplicadas nunca são editadas;
- Supabase nunca é produção oficial;
- toda ação relevante gera evento estruturado;
- HubSpot recebe somente classes e destinos aprovados;
- integrações não configuradas falham fechadas;
- código, testes e documentação operacional mudam juntos.
