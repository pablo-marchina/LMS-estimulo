# Domínio e autenticação por ambiente

**Revisado em:** 2026-09-01  
**Status:** Supabase configurável para desenvolvimento/teste/preview; identidade AWS pendente

## Rotas Supabase atuais

- `/entrar` — participante;
- `/entrar/administracao` — entrada administrativa explícita;
- `/auth/admin/start` — inicia Google OAuth;
- `/auth/admin/callback` — troca código e valida acesso administrativo;
- `/confirm` — confirmação canônica de e-mail;
- `/auth/confirm` — compatibilidade.

## Callback administrativo

Após `exchangeCodeForSession`, o callback usa `auth.getUser()` e exige usuário válido, e-mail confirmado e evidência de provider Google em `user.identities` ou `app_metadata.provider/providers`. Em seguida resolve a identidade interna e exige membership na organização Estímulo.

`getClaims()` pode continuar sendo útil em outras camadas, como proxy/sessão, mas **não é requisito do callback para identificar o provider Google**. Isso evita rejeitar conta Google válida por ausência/formato de AMR.

O domínio `estimulo.org` continua classificando conta corporativa em alguns fluxos administrativos de gestão/recuperação, mas não concede acesso sozinho. RBAC determina capabilities.

## Confirmação de e-mail

Template versionado: `supabase/templates/confirmation.html`.

```bash
SUPABASE_ACCESS_TOKEN=... \
SUPABASE_PROJECT_REF=... \
npm run sync:supabase-confirmation-email
```

O comando valida placeholders SSR, faz PATCH da configuração Auth e GET de confirmação. Não versionar token/project ref.

## Redirects e preview

Localhost e previews autorizados devem estar configurados no Supabase de destino. Em staging/produção institucional, origem, identidade e callbacks dependem da arquitetura AWS; não existe fallback silencioso para URLs de teste.

## AWS

Enquanto identidade AWS estiver pendente, o provider permanece *fail-closed*. O futuro ADR deve definir sessão, MFA, linking, callbacks, cookies, CSRF/CORS, revogação e operação de credenciais.