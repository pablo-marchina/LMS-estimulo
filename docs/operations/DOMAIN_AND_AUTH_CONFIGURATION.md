# Domínio e autenticação por ambiente

**Revisado em:** 2026-08-24  
**Status:** Supabase/Vercel portáveis para desenvolvimento e preview; domínio e identidade AWS pendentes de arquitetura

## Domínio público

O domínio oficial ainda precisa ser confirmado institucionalmente. Nenhuma escolha de DNS, certificado, entrada pública, edge ou proteção de borda está aprovada.

A origem de staging e produção institucional deverá ser HTTPS, explícita e não poderá fazer fallback para Vercel ou localhost. O domínio e sua topologia serão definidos por ADR conforme [`AWS_ARCHITECTURE_STATUS.md`](../architecture/AWS_ARCHITECTURE_STATUS.md).

## Desenvolvimento e preview

Supabase Auth e Vercel podem ser usados somente para desenvolvimento, teste, demonstração e previews controlados.

O `supabase/config.toml` versiona somente redirects locais reproduzíveis:

```text
http://localhost:3000/**
http://127.0.0.1:3000/**
```

A origem hospedada de cada destino é configuração operacional, não identidade do repositório. Depois que o novo deploy for conhecido, configure no projeto Supabase de destino:

```text
Site URL: <TARGET_APP_ORIGIN>
Redirect Allow List: <TARGET_APP_ORIGIN>/**
```

Adicione outros redirects hospedados apenas quando houver necessidade explícita e revisão de segurança. Não versione wildcard que contenha slug de time/projeto Vercel.

O futuro domínio AWS não pode ser callback Supabase enquanto Supabase permanecer um provider de desenvolvimento/preview. Isso impede que a configuração de teste seja promovida ou confundida com identidade institucional de produção.

Rotas atuais do adapter Supabase:

- `/auth/admin/start` — inicia OAuth administrativo por navegação GET;
- `/auth/admin/callback` — callback administrativo;
- `/confirm` — confirmação canônica de e-mail;
- `/auth/confirm` — compatibilidade;
- `/` — fallback de códigos OAuth administrativos.

O callback do provedor OAuth deve apontar para o projeto Supabase do ambiente ativo:

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

Ao trocar o projeto Supabase, atualize o callback no provedor OAuth antes de validar o novo deploy. Durante a janela de cutover, mantenha somente os callbacks necessários para origem e destino e remova o antigo após o aceite e a janela de rollback.

A resolução de origem preserva o host e a porta da requisição local, usa a origem efetiva do preview no ambiente controlado e exige origem HTTPS configurada em staging/produção institucional.

## Variáveis relacionadas à origem

No ambiente local:

```text
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_LOCAL_OAUTH_BRIDGE_ORIGIN=
```

No destino hospedado, `NEXT_PUBLIC_APP_URL` deve ser a origem exata aprovada. `ADMIN_LOCAL_OAUTH_BRIDGE_ORIGIN` permanece vazio por padrão e só recebe a origem exata do ambiente quando o bridge de compatibilidade de desenvolvimento for realmente necessário.

Nunca coloque `service_role`, client secret, token ou chave privada em variável `NEXT_PUBLIC_*`.

## Produção AWS

A única decisão de runtime é o empacotamento da aplicação por `Dockerfile.lambda`. Permanecem abertas:

- origem e domínio oficiais;
- identidade, federação e sessão;
- confirmação, recuperação, logout e revogação;
- vínculo de identidades externas com contas internas;
- cookies, CSRF e CORS;
- MFA e políticas de credenciais;
- proteção de borda e abuso;
- disponibilidade, observabilidade e resposta a incidentes.

Enquanto essas decisões estiverem abertas:

- o proxy protegido retorna `503 aws_identity_architecture_pending`;
- a resolução de identidade retorna `AWS_IDENTITY_ARCHITECTURE_PENDING`;
- `/api/health/ready` retorna `503 aws_architecture_pending`;
- nenhum provider de teste é usado como fallback.

## Administração

O modelo lógico mantém verificações independentes, qualquer que seja o provider futuro:

1. credencial externa válida e verificada;
2. identidade vinculada à conta interna correta;
3. política institucional de domínio ou IdP, quando aprovada;
4. membership organizacional e capacidades RBAC ativas;
5. auditoria da concessão, uso, revogação e expiração.

O domínio de e-mail ou um parâmetro de OAuth nunca concede acesso sozinho.

## Requisitos da futura decisão de identidade

O ADR deve avaliar e registrar:

- requisitos de participantes e administradores;
- provedores, protocolos e integração corporativa;
- fluxo de cadastro, confirmação, recuperação e exclusão;
- linking, deduplicação e migração dos usuários de teste;
- MFA, risco adaptativo e proteção de credenciais;
- sessão, refresh, revogação e logout global;
- callbacks específicos por ambiente, sem wildcards de produção;
- cookies `Secure`, `HttpOnly` e `SameSite` adequados;
- host/protocolo encaminhados de forma confiável;
- proteção contra open redirect, CSRF e CORS excessivo;
- logs sem tokens, cookies, CPF ou claims proibidos;
- capacidade, disponibilidade, limites e custo;
- operação, suporte e resposta a incidente.

## Ambiente local

```bash
cp .env.example .env
```

```text
APP_ENV=development
PLATFORM_RUNTIME_PROVIDER=supabase
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

O procedimento completo de troca de repositório, Supabase e Vercel está em [`PORTABILITY_AND_REPOSITORY_TRANSFER.md`](PORTABILITY_AND_REPOSITORY_TRANSFER.md).

Não registrar client secrets, tokens, cookies ou identificadores sensíveis neste documento.
