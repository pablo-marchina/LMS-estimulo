# Operação Supabase e Vercel

Este documento descreve provisionamento e validação dos ambientes autorizados de desenvolvimento, teste e preview baseados em Supabase e Vercel.

## Supabase

Para criar um ambiente equivalente:

1. criar projeto vazio;
2. aplicar `supabase/migrations/` na ordem suportada;
3. executar replay e gates de banco;
4. configurar Auth providers, Site URL e redirects;
5. configurar Storage, Edge Functions e secrets;
6. sincronizar templates Auth versionados;
7. validar health, identidade e fluxos centrais.

### Template de confirmação

O template canônico é `supabase/templates/confirmation.html`. A configuração hospedada pode ser sincronizada e verificada com:

```bash
SUPABASE_ACCESS_TOKEN=... \
SUPABASE_PROJECT_REF=... \
npm run sync:supabase-confirmation-email
```

Tokens e referências de projeto não são versionados.

## Vercel

O projeto Vercel usa o mesmo repositório e variáveis segregadas por ambiente. Preview deployment deve preservar associação com o commit que o produziu.

Para evidência visual de pull request, o GitHub Deployment precisa identificar o SHA do candidato e fornecer uma `environment_url` correspondente. A captura não deve apontar silenciosamente para outra versão.

## Dados fora das migrations

Migrations não recriam automaticamente:

- usuários e identidades do provider Auth;
- dados operacionais preservados;
- objetos de Storage;
- secrets de OAuth/Edge Functions;
- SMTP e outras configurações hospedadas;
- webhooks e integrações externas.

Esses itens exigem procedimento próprio por ambiente.

## Validação

```bash
npm run validate:release-candidate
npm run test:database
npm run typecheck:web
npm run build:web
npm run verify:supabase
```

Smoke de ambiente deve cobrir identidade participante, administração, jornada, atividade/avaliação, diagnóstico, gamificação, uploads e health endpoints conforme as capacidades habilitadas.

## Mudança de ambiente

Divergência de schema é corrigida por migration ou reconstrução controlada. Edição manual não é promovida a fonte de verdade. Mudanças de configuração geram novo deployment quando o provider exigir.