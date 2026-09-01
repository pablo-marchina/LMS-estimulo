# Domínio e autenticação por ambiente

## Superfícies de autenticação

No adapter Supabase, as rotas de autenticação incluem:

- `/entrar` — participante;
- `/entrar/administracao` — entrada administrativa;
- `/auth/admin/start` — início do OAuth administrativo;
- `/auth/admin/callback` — callback e resolução de acesso;
- `/confirm` — confirmação de e-mail;
- `/auth/confirm` — compatibilidade de confirmação.

## Participante

Cadastro e login usam o provider público autorizado. Dados protegidos de perfil são persistidos apenas no fluxo autenticado correspondente. Recuperação e confirmação preservam as regras do provider sem introduzir credenciais privilegiadas no browser.

## Administração

O fluxo administrativo exige:

1. sessão válida obtida pelo provider federado aprovado;
2. usuário e e-mail verificados conforme o contrato do provider;
3. identidade externa compatível com o mecanismo administrativo;
4. resolução da identidade interna;
5. membership ativa na organização Estímulo;
6. capabilities verificadas por RBAC.

Domínio de e-mail pode classificar uma conta corporativa, mas não substitui identidade, membership ou permissão.

## Confirmação de e-mail no Supabase

O template versionado é `supabase/templates/confirmation.html`. O fluxo usa token hash e redirect controlado para a rota de confirmação da aplicação.

A configuração hospedada pode ser sincronizada por:

```bash
SUPABASE_ACCESS_TOKEN=... \
SUPABASE_PROJECT_REF=... \
npm run sync:supabase-confirmation-email
```

Credenciais e identificadores de projeto pertencem ao ambiente e não ao Git.

## Redirects e origens

Cada ambiente deve declarar explicitamente suas origens e redirects autorizados. Localhost e previews não são usados como fallback de um ambiente institucional.

## Fronteira de provider

Identidade de produção é definida pela estratégia de cloud e pelos ADRs aplicáveis. Enquanto um adapter de produção não satisfizer seu contrato, ele deve falhar fechado em vez de reutilizar silenciosamente credenciais ou endpoints de desenvolvimento.