# Domínio e redirects da Plataforma Estímulo

## Domínio recomendado

Use `plataforma.estimulo.org` como domínio público da plataforma de capacitação.

Ele preserva a marca institucional `estimulo.org`, diferencia o produto educacional do fluxo de crédito em `app.estimulo.org` e permite trocar a infraestrutura Vercel no futuro sem mudar a URL dos participantes.

## Vercel

1. Abra o projeto `lms-estimulo-web`.
2. Em **Settings > Domains**, adicione `plataforma.estimulo.org`.
3. Crie no provedor DNS do domínio `estimulo.org` o registro solicitado pela Vercel.
4. Defina a variável de produção:

```text
NEXT_PUBLIC_APP_URL=https://plataforma.estimulo.org
```

Não defina a URL de produção como variável compartilhada de Preview: o runtime usa automaticamente `VERCEL_BRANCH_URL`/`VERCEL_URL` em previews.

## Supabase Auth > URL Configuration

**Site URL**

```text
https://plataforma.estimulo.org
```

**Redirect URLs**

```text
http://localhost:3000/**
http://127.0.0.1:3000/**
https://lms-estimulo-web.vercel.app/**
https://*-pablo-marchinas-projects.vercel.app/**
https://plataforma.estimulo.org/**
```

Os caminhos usados atualmente são `/auth/admin/callback` para o OAuth administrativo e `/auth/confirm` para confirmação de cadastro.

## Google OAuth

No provedor Google, mantenha como URI de redirecionamento autorizada o callback do Supabase:

```text
https://cfpfeavjlgheqqiaqtzv.supabase.co/auth/v1/callback
```

As URLs da aplicação ficam na allowlist do Supabase; o Google retorna primeiro ao Supabase Auth.

## Local

No `.env` da raiz:

```text
APP_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

O arquivo `supabase/config.toml` contém a configuração equivalente para o Supabase local.
