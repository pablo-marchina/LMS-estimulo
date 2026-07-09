# E12 — Bridge de identidade Supabase/Cognito

**Versão:** 0.2  
**Estado:** contrato e adapter Supabase implementados; prova com token real pendente

## Fluxo

```text
JWT recebido pela API
→ adapter do provedor verifica assinatura, issuer, audience e expiração
→ identidade normalizada {provider, issuer, subject, email, emailVerified, fingerprint}
→ iam.resolve_external_identity(...)
→ user_account_id interno
→ app_private.set_request_context(...)
→ transação de domínio protegida por RLS
```

## Regras

- JWT, refresh token e documento bruto de claims não são persistidos.
- Chave primária do domínio nunca é `sub` do Supabase ou Cognito.
- Identidade externa é única por `(issuer, subject)`.
- E-mail não verificado não cria conta.
- Colisão por e-mail não vincula contas automaticamente.
- Mudança de provedor não troca o `user_account_id`.
- Contexto é `SET LOCAL` e desaparece ao finalizar a transação.

## Supabase

O adapter usa o JWKS do projeto para tokens RS256/ES256 e mantém cache de dez minutos. Para projetos ainda em HS256, ele consulta `/auth/v1/user`, mantendo o Auth server no caminho de validação. A publishable key é usada somente na chamada pública; nunca substitui o JWT do usuário.

## AWS

O futuro adapter Cognito deve implementar o mesmo contrato, validando issuer do user pool, audience/client id, assinatura, expiração e `sub`. Nenhuma policy SQL será alterada quando o provedor mudar.

## Testes

A suíte atual cobre:

- RS256;
- ES256;
- token expirado;
- fallback HS256;
- normalização de e-mail;
- ausência de tokens no retorno.

A prova real requer criar um usuário de teste controlado no Supabase, obter access token e executar o adapter contra o projeto compartilhado.
