# Supabase + Vercel handoff

**Revisado em:** 2026-09-01

Este runbook recria o ambiente web autorizado de desenvolvimento/teste/preview em outro projeto Supabase/Vercel. Não promove esses providers a produção institucional.

## Supabase

1. criar projeto vazio;
2. aplicar `supabase/migrations/` na ordem;
3. executar replay/gates;
4. configurar Auth providers, Site URL e redirects;
5. configurar Storage/Edge Functions/secrets;
6. sincronizar templates Auth versionados;
7. validar readiness e fluxos reais.

### E-mail de confirmação

O template canônico é `supabase/templates/confirmation.html` e usa `RedirectTo + TokenHash + type=email` para o fluxo SSR `/confirm`.

Com credenciais de administração do **projeto correto** fora do Git:

```bash
SUPABASE_ACCESS_TOKEN=... \
SUPABASE_PROJECT_REF=... \
npm run sync:supabase-confirmation-email
```

O script falha se placeholders estiverem incorretos, se o PATCH falhar, se o GET de verificação falhar ou se assunto/HTML remotos não forem exatamente os esperados. Essa verificação é necessária antes de afirmar que a customização está aplicada no ambiente hospedado.

## Vercel

Importar o mesmo repositório, manter integração Git/Preview Deployments e configurar variáveis por ambiente. `READY` de build não prova readiness da aplicação.

### Requisito para captura visual de PR

O Preview Deployment deve publicar no GitHub um Deployment/status bem-sucedido com `environment_url` e o **SHA exato do head do PR**. Sem isso, `Production visual capture` não possui alvo confiável e falha por design.

Depois de alterar env vars, gerar novo deployment; deployments antigos não recebem valores retroativamente.

## Dados não recriados por migrations

- usuários/identidades Auth;
- dados operacionais que precisem ser preservados;
- objetos Storage;
- secrets OAuth/Edge Functions;
- SMTP e configuração hospedada do Auth;
- qualquer webhook/integração externa.

## Validação

```bash
npm run validate:release-candidate
npm run test:database
npm run typecheck:web
npm run build:web
npm run verify:supabase
```

No deployment alvo, verificar pelo menos cadastro/confirmação, login/logout participante, Google admin + membership/RBAC, home/jornada, quick check, diagnóstico, ranking, badges, uploads, recuperação, `/api/health/*` e mobile.

## Cutover/rollback

Só promover um ambiente autorizado depois de gates/E2E e plano de rollback. Divergência de schema é corrigida por migration ou recriação controlada, nunca por edição manual adotada como nova fonte de verdade.