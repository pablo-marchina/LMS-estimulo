# Plataforma Estímulo

Plataforma web LMS para desenvolvimento de empreendedores, capacitação integrada à jornada do Estímulo e geração estruturada de dados educacionais e operacionais.

Os requisitos ativos do produto estão em [`premissas-desenvolvimento.md`](premissas-desenvolvimento.md).

## Estado atual

A fundação técnica, a experiência do participante e a administração integral estão implementadas no repositório e no ambiente de desenvolvimento. O produto oficial ainda não deve ser liberado para usuários reais enquanto os bloqueadores operacionais de [`DELIVERY_BLOCKERS.md`](docs/implementation/DELIVERY_BLOCKERS.md) permanecerem abertos.

```text
Supabase = desenvolvimento e teste
AWS staging = scaffolding implementado, ainda não aplicado
AWS produção = ambiente oficial futuro
PostgreSQL = banco operacional, eventos e outbox
HubSpot = somente classes aprovadas e destinos explicitamente autorizados
```

### Implementado

- 293 migrations executáveis, replay limpo, equivalência estrutural e contratos públicos de RPC;
- aplicação Next.js com áreas distintas de participante e administração;
- cadastro público com confirmação de e-mail, first-touch UTM e CPF obrigatório protegido;
- CPF validado, cifrado com AES-256-GCM e deduplicado por HMAC server-only;
- entrada administrativa separada, exclusivamente por Google OAuth, com e-mail verificado `@estimulo.org` e autorização RBAC;
- RBAC revogável, temporal e auditável;
- painel do participante com carrossel administrável, métricas, retomada, recompensas e ranking pseudonimizado;
- perfil com diagnóstico, jornadas, histórico de pontos e credenciais;
- trilha com blocos expansíveis e abertura de qualquer atividade liberada pelo backend;
- comentários, uploads privados, moderação e revisão de práticas;
- arquivos privados validados por autorização, tipo, extensão, tamanho e SHA-256;
- avaliações multiquestão e nota de utilidade em cinco estrelas;
- progresso, ledger de pontos, selos, certificados e biblioteca versionada;
- administração integral de jornadas, versões, trilhas, blocos, atividades, conteúdos e regras;
- administração de diagnóstico, dimensões, perguntas, opções e arquétipos;
- administração de pontos, selos, certificados, anúncios, usuários, papéis, biblioteca e integrações;
- relatórios reais de participação, progresso, avaliações, práticas, pontos e credenciais;
- motor configurável de formulários, arquétipos e ativações;
- diagnóstico de maturidade em draft, sem atribuição, crédito ou CRM;
- adapter HubSpot HTTP server-only e fail-closed;
- integração controlada com sistemas externos existentes;
- identidade visual Estímulo com assets locais, Poppins e paleta institucional;
- Browser E2E sintético e harness E2E real autenticado;
- imagem standalone não-root, liveness e readiness;
- Terraform de staging com ECS, ALB, RDS, S3, KMS e CloudWatch.

O cadastro público de teste, sua variável de ambiente, a rota privilegiada e a função SQL associada foram removidos. O histórico de migrations permanece imutável e uma migration posterior elimina a função no estado final do banco.

O subsistema de scanner de malware foi removido integralmente do produto, banco, workers, filas, cron, contratos e configuração. Não existe provider, fila ou estado de scan ativo.

### Gates externos ainda necessários

- configuração oficial e homologada dos quatro arquétipos;
- pacote editorial publicável da Jornada OpenAI;
- telefone, CNPJ opcional e integração oficial com site e identidade;
- inventário, credenciais e prova HubSpot em sandbox;
- gestão institucional e rotação das chaves de CPF;
- configuração do Google OAuth no Supabase, consent screen, client credentials e URLs autorizadas do ambiente-alvo;
- adapters AWS ativos e staging aplicado;
- E2E real autenticado executado contra o ambiente implantado;
- backup, restore e rollback;
- aprovações de segurança, privacidade, jurídico, crédito, acessibilidade e conteúdo;
- rotação/revogação confirmada da credencial historicamente exposta.

## Identidade e acesso

Participantes usam cadastro público, senha e confirmação de e-mail. O CPF é solicitado na conclusão do cadastro e não é armazenado em metadata, URL, logs ou eventos brutos.

A entrada administrativa fica em `/entrar/administracao` e exige simultaneamente:

1. autenticação pelo provider Google configurado no Supabase;
2. e-mail verificado no domínio exato `@estimulo.org`;
3. vínculo organizacional ativo;
4. permissões RBAC correspondentes à operação.

O parâmetro Google `hd=estimulo.org` melhora a seleção da conta, mas não é tratado como controle de segurança. O callback no servidor valida novamente o provider, o domínio e o RBAC. O domínio não concede poderes automaticamente.

## Administração

A administração integral está dividida em superfícies especializadas:

- `/admin`: publicação, matrícula, comentários e revisão de práticas;
- `/admin/produto`: jornadas, atividades, conteúdos, trilhas, blocos e regras;
- `/admin/diagnostico`: dimensões, perguntas, opções e arquétipos;
- `/admin/gamificacao`: pontos, selos e certificados;
- `/admin/engajamento`: anúncios;
- `/admin/biblioteca`: catálogo e publicação de conteúdos;
- `/admin/usuarios`: vínculos e RBAC;
- `/admin/relatorios`: indicadores e eventos operacionais;
- `/admin/integracoes`: sistemas externos controlados.

Drafts são editáveis; versões publicadas permanecem imutáveis. Toda gravação relevante é idempotente e auditada.

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
apps/web/lib/admin/                    contratos da administração integral
apps/web/lib/engagement/               anúncios, ranking, recompensas e histórico
apps/web/lib/hubspot/                  política e adapter HubSpot
apps/web/lib/configurable-product/     formulário, classificação e ativações
apps/web/lib/journey-runtime/          runtime de jornadas
apps/web/lib/credentials/              credenciais
infra/aws/terraform/                   scaffolding de staging
supabase/migrations/                   histórico executável
supabase/functions/                    adapters de desenvolvimento/teste
scripts/application/                   validações da aplicação
scripts/database/                      replay, contratos e E2E de banco
scripts/browser-e2e/                   E2E sintético e real autenticado
docs/                                  produto, decisões, arquitetura e operação
```

## Execução local

Pré-requisitos:

- Node.js 22;
- npm 10.9.2;
- PostgreSQL/Supabase autorizado para desenvolvimento e teste;
- duas chaves server-only independentes de 32 bytes em base64 para proteção do CPF;
- Google provider configurado no Supabase para testar a área administrativa.

```bash
cp .env.example apps/web/.env.local
npm ci --ignore-scripts
npm run typecheck:web
npm run test:application-foundation
npm run test:database-gates
npm run build:web
npm run dev:web
```

Nunca registre credenciais, cookies de sessão ou dados pessoais reais no Git.

## Validações principais

```bash
npm run validate:repository
npm run validate:migration-history
npm run test:database-gates
npm run test:real-database-e2e
npm run test:application-foundation
npm run test:configurable-product
npm run test:hubspot-contracts
npm run typecheck:web
npm run build:web
npm run test:browser-e2e
```

A prova real autenticada exige um ambiente implantado, uma conta própria de participante e um arquivo efêmero de cookies obtido depois de um login Google administrativo real:

```bash
REAL_E2E_BASE_URL=https://staging.example.org \
REAL_E2E_PARTICIPANT_EMAIL=participant-e2e@example.org \
REAL_E2E_PARTICIPANT_PASSWORD=... \
REAL_E2E_ADMIN_SESSION_COOKIES_FILE=.secrets/admin-google-session-cookies.json \
npm run test:browser-e2e-real
```

O arquivo deve conter um array JSON de cookies aceitos pelo Chrome DevTools Protocol, pertencer somente ao domínio testado, permanecer fora do Git e ser destruído após o teste. O runner verifica a tela separada de Google e reutiliza a sessão real para validar a administração integral.

## Documentação principal

- [Requisitos do produto](premissas-desenvolvimento.md)
- [Índice do projeto](PROJECT_INDEX.md)
- [Decisões](docs/decisions/DECISION_LOG.md)
- [Escopo HubSpot](docs/decisions/HUBSPOT_SCOPE_DECISION.md)
- [Bloqueadores de entrega](docs/implementation/DELIVERY_BLOCKERS.md)
- [Contrato HubSpot](docs/integrations/HUBSPOT_ADAPTER_CONTRACT.md)
- [Estratégia Supabase → AWS](docs/architecture/SUPABASE_AWS_PORTABILITY.md)
- [Arquitetura-alvo AWS](docs/architecture/AWS_TARGET_ARCHITECTURE.md)
- [Baseline AWS](infra/aws/terraform/README.md)

## Regras essenciais

- não fazer commit direto em `main`;
- migrations aplicadas nunca são editadas;
- Supabase nunca é produção oficial;
- toda ação relevante gera evento estruturado;
- HubSpot recebe somente classes e destinos aprovados;
- integrações não configuradas falham fechadas;
- código, testes e documentação operacional mudam juntos.
