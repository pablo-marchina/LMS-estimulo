# Domínio e autenticação por ambiente

**Revisado em:** 2026-07-29  
**Status:** Supabase configurado para validação; Cognito/domínio AWS pendentes

## Domínio público

O domínio canônico proposto é:

```text
https://plataforma.estimulo.org
```

A ativação depende do inventário da AWS corporativa, DNS/Route 53, edge/CloudFront, WAF, API Gateway, certificado ACM e owners aprovados.

## Desenvolvimento e preview

Supabase Auth e Vercel podem ser usados somente para desenvolvimento/teste e previews controlados.

Redirects versionados no `supabase/config.toml`:

```text
http://localhost:3000/**
http://127.0.0.1:3000/**
https://lms-estimulo-web.vercel.app/**
https://*-pablo-marchinas-projects.vercel.app/**
```

O domínio final da AWS não é callback Supabase. Isso impede que a configuração de teste seja promovida ou confundida com a identidade de produção.

Rotas atuais do adapter Supabase:

- `/auth/admin/callback` — callback administrativo;
- `/confirm` — confirmação canônica de e-mail;
- `/auth/confirm` — compatibilidade;
- `/` — fallback de códigos OAuth administrativos.

O Google OAuth de desenvolvimento usa o callback do projeto Supabase ativo:

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

## Produção AWS

A produção segue a [`DEC-075`](../decisions/AWS_PRODUCTION_ARCHITECTURE.md):

```text
plataforma.estimulo.org
→ CloudFront/edge corporativo
→ WAF
→ API Gateway HTTP API
→ Lambda alias
→ Cognito User Pool ou broker OIDC corporativo
```

O Cognito deve configurar URLs específicas por ambiente para:

- callback de participantes;
- callback administrativo federado;
- logout;
- recuperação de conta;
- confirmação/verificação quando aplicável.

Wildcards de preview não são permitidos nos callbacks de produção.

A origem pública em staging/produção é obrigatória, HTTPS e não pode fazer fallback para Vercel ou localhost.

## Administração federada

O acesso administrativo mantém quatro verificações independentes:

1. token OIDC válido do provider aprovado;
2. Google/IdP corporativo e e-mail confirmado;
3. domínio exato `@estimulo.org` quando essa política permanecer vigente;
4. membership organizacional e capacidades RBAC no PostgreSQL.

O domínio de e-mail ou o parâmetro `hd` não concede acesso sozinho.

## Cookies e origem

A configuração AWS precisa comprovar:

- origem canônica HTTPS;
- cookies `Secure`, `HttpOnly` e `SameSite` adequados;
- forwarded host/proto confiáveis atrás do edge/API Gateway;
- proteção contra open redirect;
- CSRF nos fluxos mutáveis;
- CORS mínimo e específico;
- expiração, renovação e revogação de sessão;
- nenhuma persistência de tokens em logs ou domínio.

## Ambiente local

```bash
cp .env.example .env
```

```text
APP_ENV=development
PLATFORM_RUNTIME_PROVIDER=supabase
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Informações pendentes da empresa

- domínio e hosted zone responsáveis;
- distribuição CloudFront/edge existente;
- API Gateway e WAF existentes;
- certificado ACM;
- Cognito User Pool ou IdP corporativo;
- Google Workspace/OIDC/SAML;
- política de MFA, senha e recuperação;
- callbacks e logout URLs aprovados;
- migração/linking de usuários Supabase;
- owner operacional e processo de incidente.

Não registrar client secrets, tokens, cookies ou identificadores sensíveis neste documento.
