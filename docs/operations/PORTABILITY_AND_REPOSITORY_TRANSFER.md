# Portabilidade e transferência de repositório

Este runbook prepara a Plataforma Estímulo para ser transferida para outro repositório GitHub e reconstruída em outros projetos Supabase e Vercel sem alterar o código da aplicação para cada destino.

> O runtime Supabase/Vercel continua restrito a desenvolvimento, teste, preview, demonstração e validação controlada. A arquitetura institucional definitiva de produção continua condicionada às decisões e gates de AWS documentados no projeto.

## Invariante de portabilidade

Um commit aprovado deve poder ser usado em um destino limpo apenas com configuração operacional e migração de estado externo. O repositório não deve depender de:

- URL específica de um projeto Vercel;
- slug, `team_` ou `prj_` de uma conta Vercel;
- ref, hostname ou chave real de um projeto Supabase;
- URL absoluta do repositório GitHub de origem;
- secrets, tokens, senhas ou dados pessoais versionados;
- branch histórica usada para um deploy ou auditoria pontual.

O contrato legível por máquina fica em `config/platform/portable-runtime.json` e é validado por `npm run validate:portability`.

## O que é fonte de verdade no Git

Os seguintes artefatos devem acompanhar a transferência do histórico Git:

- `supabase/migrations/` e `supabase/canonical-migrations/`;
- `supabase/functions/`;
- `supabase/config.toml` para configuração local reproduzível;
- `supabase/templates/`;
- `supabase/provider-role-grants.sql` quando aplicável ao destino;
- `config/platform/portable-runtime.json`;
- `.env.example` sem valores reais;
- scripts de validação, testes, segurança e verificação;
- workflows genéricos de CI;
- documentação canônica.

## O que não deve ser transferido pelo Git

Os itens abaixo pertencem ao ambiente e precisam ser inventariados e recriados ou migrados de forma controlada:

- secrets e variáveis do GitHub Actions;
- GitHub Environments, rulesets, proteção de branches, apps, webhooks e deploy keys;
- API keys, secrets e configuração remota do Supabase;
- usuários/identidades de Auth e sessões;
- dados do PostgreSQL;
- objetos de Storage;
- secrets das Edge Functions;
- configuração de OAuth/SMTP/Auth do Supabase;
- variáveis de ambiente da Vercel;
- domínios, aliases, proteção de deployment e integrações da Vercel;
- DNS e configuração no provedor do domínio;
- tokens de serviços externos.

Nenhum export com PII, senha, token, cookie, chave ou `service_role` deve ser commitado.

## Folha de transferência

Preencha estes valores fora do repositório antes do cutover:

```text
TARGET_GITHUB_REPOSITORY=
TARGET_DEFAULT_BRANCH=main
TARGET_SUPABASE_PROJECT_REF=
TARGET_SUPABASE_REGION=
TARGET_VERCEL_TEAM=
TARGET_VERCEL_PROJECT=
TARGET_APP_ORIGIN=
TARGET_CUSTOM_DOMAIN=
```

Registre também, em local seguro, quem é o proprietário de cada destino e quem pode autorizar alterações em Auth, DNS, secrets e dados pessoais.

## Fase 1 — congelar e validar a origem

Antes de qualquer mudança de destino:

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run validate:portability
npm run validate:release-candidate
npm run test:application
npm run test:product
npm run test:integrations
npm run typecheck:web
npm run scan:secrets
```

Para uma reconstrução completa do banco, execute também os gates de banco no ambiente apropriado:

```bash
npm run test:database
npm run replay:database-clean
```

Registre o SHA exato aprovado para a transferência. Não faça cutover a partir de uma working tree diferente desse SHA.

## Fase 2 — novo repositório GitHub

Há duas estratégias válidas.

### Transferir o repositório no GitHub

Use a transferência nativa quando o objetivo for preservar o máximo possível da identidade e do histórico do repositório. Antes da transferência, inventarie rulesets, environments, secrets, GitHub Apps, webhooks, deploy keys e integrações e confirme o comportamento de cada item no novo owner.

Depois da transferência:

1. confirme `main` como branch padrão;
2. confira rulesets/proteções;
3. recrie ou reautorize Actions secrets e environments;
4. confira permissões de equipes e colaboradores;
5. reautorize integrações com Vercel e outros GitHub Apps;
6. valide todos os workflows no novo owner;
7. atualize clones locais com o novo remote.

### Criar um repositório novo

Quando a identidade do repositório também precisa ser nova, preserve o histórico Git explicitamente:

```bash
git remote add target <TARGET_GIT_URL>
git push target main
git push target --tags
```

Se todas as branches de trabalho precisarem ser preservadas, revise primeiro quais são válidas e só então use:

```bash
git push target --all
```

Não use `--mirror` sem revisar refs remotas e branches temporárias: ele replica mais estado do que normalmente é necessário.

Issues, pull requests, project boards, Actions settings, environments e secrets não são recriados apenas por `git push` e precisam de migração separada quando forem necessários.

## Fase 3 — reconstruir o Supabase de destino

### Banco

1. crie/seleciona o projeto de destino na organização aprovada;
2. vincule a CLI local apenas ao destino escolhido;
3. aplique o histórico versionado de migrations em um banco limpo;
4. execute os gates de banco e equivalência;
5. confira grants de Data API e RLS;
6. rode os advisors de segurança e performance;
7. migre dados somente por processo aprovado, com reconciliação de contagens e integridade.

O estado `supabase/.temp/` e `supabase/.branches/` é local e permanece ignorado pelo Git.

### Edge Functions canônicas

O destino deve receber apenas as funções declaradas em `config/platform/portable-runtime.json`:

- `authenticated-rpc` — JWT obrigatório;
- `authenticated-media-rpc` — JWT obrigatório;
- `platform-extensions-rpc` — JWT obrigatório;
- `ai-grade-submission` — JWT obrigatório;
- `public-landing-journey` — JWT desabilitado conforme o contrato atual da função pública.

Funções remotas de smoke test, migração, experimento, bridge ou operação que não existam em `supabase/functions/` não fazem parte automaticamente do produto transferível. Elas devem ser auditadas e aprovadas individualmente antes de serem recriadas.

Depois do deploy, configure secrets das funções pelo mecanismo do Supabase; nunca por arquivo commitado.

### Auth

No projeto de destino:

1. defina o **Site URL** como a origem exata aprovada do novo deploy;
2. adicione somente redirects necessários ao destino e ao desenvolvimento local;
3. atualize o callback do provedor Google/OAuth para o novo projeto Supabase;
4. confira template de confirmação, SMTP e políticas de Auth;
5. valide cadastro, confirmação, login, recuperação de senha e login administrativo;
6. trate a migração de identidades separadamente das migrations da aplicação — não presuma que `auth.users` será recriado por elas;
7. revogue/rote credenciais antigas após o cutover e a janela de rollback.

### Storage

Recrie e valide os buckets declarados no contrato de portabilidade:

- `credential-files`;
- `certificate-templates`;
- `delivery-submissions`;
- `announcement-banners`;
- `reward-images`.

Antes de copiar objetos, valide policies, ownership, MIME/limites e requisitos de acesso privado. Após a cópia, reconcilie quantidade de objetos e amostras de leitura por fluxo real da aplicação.

## Fase 4 — novo projeto Vercel

Importe o novo repositório no projeto/time de destino.

### Diretório e runtime

O build deve partir da **raiz do repositório**. Não configure `apps/web` como Root Directory: o workspace web usa scripts e contratos compartilhados existentes fora dessa pasta.

O major de Node é definido por `package.json` como `22.x`; `.node-version` fixa a versão de desenvolvimento/CI. O projeto Vercel de destino deve respeitar esse contrato.

### Variáveis mínimas

Configure os valores reais na Vercel, com o escopo correto de Development/Preview/Production conforme o ambiente operacional:

```text
APP_ENV
PLATFORM_RUNTIME_PROVIDER
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
CPF_ENCRYPTION_KEY
CPF_LOOKUP_HMAC_KEY
```

Configure também integrações opcionais usadas pelo ambiente, como URLs de Edge Functions, analytics, ETL e provedor de correção por IA.

`NEXT_PUBLIC_*` é enviado ao browser. `SUPABASE_SERVICE_ROLE_KEY`, chaves de CPF, tokens de ETL e chaves de IA são exclusivamente server-side.

Não copie `VERCEL_PROJECT_ID`, `VERCEL_ORG_ID`, `.vercel/project.json` ou tokens para o Git. O vínculo com o projeto de destino é configuração externa.

## Fase 5 — ordem de cutover

A ordem recomendada reduz falhas de Auth e rollback difícil:

1. destino GitHub pronto e CI verde;
2. Supabase de destino reconstruído e validado;
3. Google/OAuth aceita o callback do novo Supabase;
4. Supabase Auth aceita a origem do novo deploy;
5. Vercel de destino recebe todas as env vars;
6. deploy de preview do SHA aprovado;
7. smoke tests públicos e autenticados;
8. deploy/alias final no ambiente operacional;
9. mudança de domínio/DNS, se houver;
10. reconciliação final de dados e Storage;
11. somente depois, revogação gradual das credenciais antigas.

## Verificações obrigatórias no destino

Com as env vars do destino carregadas:

```bash
npm run validate:portability
npm run validate:release-candidate
npm run verify:supabase
npm run build:web
```

Depois do deploy:

```bash
NEXT_PUBLIC_APP_URL=<TARGET_APP_ORIGIN> npm run verify:deployment
```

Além dos scripts, valide manualmente ou por E2E:

- landing pública;
- cadastro e confirmação de e-mail;
- login/logout e recuperação de senha;
- OAuth administrativo;
- listagem de jornadas e abertura de aula;
- verificação rápida de aula;
- atividades e entregas;
- upload/download de arquivos privados;
- biblioteca;
- diagnóstico;
- administração/RBAC;
- Edge Functions autenticadas;
- health `/api/health/live` e `/api/health/ready` retornando `200` no ambiente esperado.

## Critérios de aceite da transferência

A troca só está concluída quando:

- `npm run validate:portability` passa no SHA transferido;
- nenhum identificador do provedor de origem é necessário no código;
- schema e migrations são reproduzíveis no destino limpo;
- as cinco Edge Functions canônicas estão no destino com o modo JWT correto;
- RLS/grants e advisors foram revisados;
- Auth e OAuth funcionam com os novos callbacks;
- buckets e objetos necessários foram reconciliados;
- Vercel usa Node 22 e build a partir da raiz;
- secrets foram configurados fora do Git;
- liveness/readiness estão verdes;
- fluxos críticos autenticados funcionam no destino;
- rollback continua possível sem destruir a origem.

## Rollback

Não apague, pause ou altere destrutivamente a origem durante o cutover.

Se o destino falhar:

1. restaure o alias/domínio para o deploy anterior ou origem anterior;
2. mantenha o banco de origem disponível conforme a política aprovada;
3. interrompa escrita no destino se houver risco de divergência;
4. reconcilie qualquer escrita ocorrida durante a tentativa;
5. corrija o destino e repita os gates antes de novo cutover.

## Descomissionamento da origem

Somente após aceite, reconciliação e janela de observação aprovada:

- remova callbacks OAuth antigos;
- revogue tokens, API keys e secrets antigos;
- remova webhooks/apps sem uso;
- arquive ou restrinja o repositório anterior, se houver um novo;
- desassocie domínios do projeto Vercel antigo;
- pause/remova recursos Supabase antigos somente após backup e aprovação explícita;
- registre o SHA e os destinos finais no registro operacional apropriado, não em código específico do provedor.

## Ações intencionalmente não automatizadas

Este repositório não automatiza criação/destruição do projeto de destino, transferência de PII, cópia de secrets, alteração de DNS ou troca de propriedade de contas. Essas ações exigem escolha explícita de organização, autorização e validação de segurança. O objetivo da automação versionada é tornar todo o restante reproduzível e detectar acoplamentos antes do cutover.
