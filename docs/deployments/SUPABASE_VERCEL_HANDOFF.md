# Supabase + Vercel handoff

Este runbook prepara a implantação web atual da Estímulo para ser recriada em outro projeto/conta de Supabase e outro projeto/time da Vercel sem depender da infraestrutura anterior.

> Escopo arquitetural: no estado atual do repositório, Supabase + Vercel continuam autorizados para desenvolvimento, teste, preview, demonstração e validação controlada. Este procedimento não altera a decisão de que `staging` e `production` institucionais dependem da arquitetura AWS aprovada.

## Princípios

- Nenhuma URL de projeto Vercel, project ref do Supabase ou segredo deve ser fixada no código versionado.
- O repositório é a fonte para schema, funções e aplicação; credenciais e URLs de ambiente pertencem ao provedor de destino.
- Schema e dados são migrações diferentes: migrations recriam a estrutura; usuários, dados operacionais e objetos de Storage precisam de migração explícita quando houver necessidade de preservá-los.
- A infraestrutura antiga só deve ser desativada depois da validação completa do novo ambiente e de um período de rollback seguro.
- Um deployment Vercel em estado `READY` prova que o build terminou, não que o runtime está pronto. Previews Supabase incompletos podem compilar em modo *fail-closed* e manter `/api/health/ready` em `503`.

## O que já é portátil no repositório

- PostgreSQL é reconstruível pelo histórico em `supabase/migrations/` e pelos gates de migration history.
- Supabase Auth, Storage e Edge Functions estão encapsulados como adapters do runtime atual.
- O frontend usa variáveis de ambiente para selecionar URLs e credenciais.
- `npm run verify:supabase` valida a integração Supabase configurada.
- `npm run verify:deployment` executa o E2E autenticado contra uma URL fornecida por `REAL_E2E_BASE_URL`.
- `npm run verify:infra-portability` impede que os arquivos de configuração portáveis voltem a fixar um hostname Vercel.

## Inventário do destino

Preencher fora do Git quando a migração for executada:

| Item | Valor do destino |
|---|---|
| Conta/organização Supabase | |
| Projeto Supabase | |
| Região Supabase | |
| Time/conta Vercel | |
| Projeto Vercel | |
| URL Vercel de validação | |
| Domínio final, se aplicável | |
| Responsável pela configuração de segredos | |
| Data planejada de cutover | |

Não registrar chaves, tokens ou project refs sensíveis neste documento.

## 1. Criar o novo Supabase

1. Criar um projeto vazio no destino.
2. Configurar a CLI autenticada para o projeto novo sem alterar a infraestrutura antiga.
3. Aplicar o histórico versionado de `supabase/migrations/` no banco vazio.
4. Executar os gates locais antes de importar dados:

```bash
npm run validate:migration-history
npm run replay:database-clean
npm run test:database
npm run verify:infra-portability
```

5. Configurar no projeto hospedado os providers de Auth necessários, templates, SMTP e redirect URLs do novo ambiente.
6. Implantar as Edge Functions necessárias e configurar seus secrets exclusivamente no projeto de destino.

### Dados que migrations não substituem

Quando a continuidade de dados for necessária, migrar e reconciliar explicitamente:

- usuários/identidades de Auth;
- tabelas operacionais e históricas;
- objetos binários do Storage;
- metadados de buckets que não sejam criados pelas migrations;
- configurações/secrets de providers OAuth;
- secrets de Edge Functions;
- qualquer integração externa dependente de URL, token ou webhook.

Não assumir que copiar apenas o schema preserva identidade, sessões, arquivos ou integrações.

## 2. Configurar Auth no Supabase de destino

No painel do projeto de destino:

- definir o Site URL para a URL do novo deploy quando ele estiver disponível;
- adicionar somente redirect URLs necessárias para preview/validação;
- atualizar callbacks de Google OAuth e outros providers para o novo projeto;
- copiar configurações funcionais, mas gerar/armazenar secrets no destino em vez de versioná-los;
- validar confirmação de e-mail, recuperação de senha, login de participante e login administrativo.

`supabase/config.toml` permanece local e neutro. URLs hospedadas pertencem à configuração do projeto Supabase de destino, não ao arquivo versionado.

## 3. Criar o novo projeto Vercel

Importar o mesmo repositório GitHub no novo time/conta e manter:

- Framework: Next.js;
- branch principal: `main`;
- Node.js: `24.x` para reproduzir a configuração Vercel atualmente utilizada, salvo mudança intencional validada pelos gates;
- integração Git habilitada para Preview Deployments.

O repositório não depende de `vercel.json`; as configurações específicas da conta devem permanecer no projeto Vercel.

## 4. Replicar variáveis de ambiente

Cadastrar valores próprios do destino separadamente para Development, Preview e para qualquer implantação web operacional autorizada. Nunca copiar valores sem revisar o ambiente ao qual pertencem.

Variáveis obrigatórias para um runtime Supabase realmente pronto:

```dotenv
APP_ENV=
PLATFORM_RUNTIME_PROVIDER=supabase
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CPF_ENCRYPTION_KEY=
CPF_LOOKUP_HMAC_KEY=
ADMIN_LOCAL_OAUTH_BRIDGE_ORIGIN=
SOURCE_VERSION=
```

As duas chaves de CPF devem ser valores Base64 independentes que decodificam para exatamente 32 bytes. Elas não podem ser reutilizadas entre si.

Também revisar todas as demais variáveis declaradas em `.env.example`, em especial:

- URLs das Edge Functions/RPCs;
- configuração de AI grading;
- ETL;
- nomes de buckets;
- limites do gateway/readiness;
- canais públicos de suporte.

`ADMIN_LOCAL_OAUTH_BRIDGE_ORIGIN` é opcional e deve ser preenchida somente no ambiente que realmente usar o bridge local, apontando para a origem do novo deploy. Nunca deve voltar a conter um hostname fixo no `.env.example`.

Depois de alterar variáveis na Vercel, gerar um novo deployment; deployments já existentes não recebem retroativamente os novos valores.

### Regra de aceite da configuração Vercel

Não considerar o destino pronto apenas porque a Vercel mostra `READY`. O build de Preview permite configuração Supabase incompleta para permanecer *fail-closed*. Antes do handoff, o novo deployment deve ter todas as variáveis obrigatórias acima e `/api/health/ready` deve responder `200`.

## 5. Migrar Storage quando necessário

Para cada bucket utilizado:

1. confirmar que bucket e policies existem no Supabase de destino;
2. copiar os objetos do ambiente antigo para o novo;
3. reconciliar quantidade, paths e metadados relevantes;
4. testar upload, download e autorização usando a aplicação nova.

Os buckets atualmente parametrizados no `.env.example` incluem credenciais, templates de certificado, entregas, banners e imagens de recompensa. Objetos binários não são recriados por migrations SQL.

## 6. Validar antes do cutover

Executar no SHA que será usado no novo ambiente:

```bash
npm run validate:release-candidate
npm run typecheck:web
npm run build:web
npm run scan:secrets
npm run verify:supabase
```

Depois, apontar o E2E real para o novo deploy:

```bash
REAL_E2E_BASE_URL=https://<novo-deploy> \
REAL_E2E_PARTICIPANT_EMAIL=<usuario-de-teste> \
REAL_E2E_PARTICIPANT_PASSWORD=<senha-de-teste> \
REAL_E2E_ADMIN_SESSION_COOKIES_FILE=<arquivo-local-de-cookies> \
npm run verify:deployment
```

A validação mínima de handoff deve cobrir:

- `/api/health/live` e `/api/health/ready` em 200;
- cadastro/confirmação quando aplicável;
- login e logout de participante;
- dashboard, perfil, biblioteca e jornada;
- login administrativo Google + RBAC;
- leituras e gravações protegidas por RLS/RPC;
- verificação rápida e persistência do resultado;
- upload/download dos buckets utilizados;
- Edge Functions/RPCs;
- recuperação de senha e links de e-mail;
- layout mobile e assets de marca.

## 7. Cutover

Somente depois dos gates e E2E passarem:

1. congelar alterações de dados no ambiente antigo se a migração exigir consistência final;
2. executar a sincronização final de dados/Storage necessária;
3. promover o deployment validado no novo projeto Vercel;
4. ajustar Site URL e redirects finais no Supabase;
5. mover domínio/DNS, se houver domínio próprio;
6. executar novamente health checks e E2E no endereço final;
7. manter o ambiente antigo disponível para rollback durante a janela definida;
8. após aceite, revogar/rotacionar secrets antigos e remover callbacks obsoletos.

## Rollback

Antes de desativar qualquer recurso antigo, registrar:

- URL do último deploy saudável antigo;
- snapshot/backup do banco conforme a política do projeto;
- ponto de consistência da migração de dados;
- procedimento para reverter DNS/domínio;
- responsáveis pelo rollback.

Se qualquer gate crítico falhar, manter o tráfego no ambiente antigo e corrigir o destino. Não resolver falha de migração alterando diretamente o schema novo fora do histórico versionado.

## Critério de pronto para transferência

A infraestrutura está pronta para ser transferida quando:

- o repositório não contém domínio Vercel ou credenciais específicas do ambiente antigo nos arquivos portáveis;
- um Supabase vazio consegue receber o schema a partir das migrations versionadas;
- todas as configurações não versionáveis estão inventariadas;
- um novo projeto Vercel consegue fazer build do mesmo SHA;
- `/api/health/ready` responde `200` no destino com configuração Supabase completa;
- Auth, RLS/RPC, Storage e Edge Functions funcionam no destino;
- `verify:infra-portability`, gates de release, build e E2E passam;
- existe caminho de rollback antes do cutover.
