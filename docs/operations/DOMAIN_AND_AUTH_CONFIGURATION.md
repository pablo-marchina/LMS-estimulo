# Configuração atual de domínio e autenticação

**Revisado em:** 2026-07-29  
**Status:** desenvolvimento e preview; produção AWS pendente

## Domínio canônico desejado

`plataforma.estimulo.org` é o domínio recomendado para a experiência pública. A associação definitiva deve ser feita no ambiente AWS aprovado.

## Hospedagem temporária

O projeto `lms-estimulo-web` na Vercel pode ser usado para preview e validação controlada. Ele não é o ambiente oficial de produção.

Em previews, o runtime pode usar `VERCEL_BRANCH_URL` ou `VERCEL_URL`. Não reutilizar uma URL de produção como configuração global de preview.

## Supabase Auth

O ambiente Supabase de desenvolvimento/teste deve permitir:

```text
http://localhost:3000/**
http://127.0.0.1:3000/**
https://lms-estimulo-web.vercel.app/**
https://*-pablo-marchinas-projects.vercel.app/**
https://plataforma.estimulo.org/**
```

A última URL é uma reserva de domínio; não comprova DNS ou deploy AWS.

Rotas da aplicação:

- `/auth/admin/callback`: callback administrativo;
- `/confirm`: confirmação canônica de e-mail;
- `/auth/confirm`: compatibilidade;
- `/`: encaminha códigos OAuth administrativos recebidos na raiz para o callback correto.

No Google OAuth, o redirect autorizado aponta para o callback do projeto Supabase ativo:

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

Não registrar client secret, tokens ou cookies neste documento.

## Ambiente local

Na raiz:

```bash
cp .env.example .env
```

```text
APP_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`supabase/config.toml` mantém a configuração local equivalente. Valores hospedados continuam dependentes da configuração do dashboard do Supabase e devem ser verificados antes de cada prova real.

## Produção

A produção AWS exigirá nova configuração de domínio, certificado, callbacks e provedor de identidade. Este documento não autoriza promover a configuração Vercel/Supabase atual para produção.
