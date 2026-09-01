# Portabilidade da plataforma

A plataforma deve poder ser reconstruída em outro repositório e em novos ambientes autorizados sem depender de IDs de projeto, URLs de deployment ou credenciais versionadas.

## Fonte de verdade

O contrato legível por máquina é [`../../config/platform/portable-runtime.json`](../../config/platform/portable-runtime.json). O comando `npm run validate:portability` verifica esse contrato contra o repositório.

## GitHub

A transferência deve preservar código, histórico necessário, branch principal, regras de proteção, ambientes, secrets/variables, permissões, integrações e webhooks. Valores de secrets não pertencem ao Git.

## Supabase para desenvolvimento, teste e preview

Um ambiente novo é reconstruído a partir de `supabase/migrations/`, `supabase/functions/`, `supabase/templates/` e `supabase/config.toml`. Usuários Auth, objetos de Storage, configuração hospedada, SMTP, OAuth e secrets são recursos de ambiente e precisam de provisionamento próprio.

As Edge Functions canônicas e os buckets esperados são enumerados no contrato de portabilidade. Função existente apenas em um projeto remoto não é fonte de verdade da plataforma.

## Vercel para preview

O projeto web deve construir a partir da raiz do repositório, respeitar o engine Node versionado e receber URLs, integrações e variáveis pelo ambiente. Nenhum domínio ou identificador de projeto Vercel é requisito do código.

## Produção institucional

A portabilidade de desenvolvimento/preview não altera a fronteira de produção. A arquitetura institucional segue [`../architecture/ENVIRONMENT_AND_CLOUD_STRATEGY.md`](../architecture/ENVIRONMENT_AND_CLOUD_STRATEGY.md) e [`../architecture/AWS_ARCHITECTURE_STATUS.md`](../architecture/AWS_ARCHITECTURE_STATUS.md).

## Verificação

```bash
npm run validate:portability
npm run validate:release-candidate
npm run test:database
npm run test:application
npm run typecheck:web
npm run build:web
```

A reconstrução só é considerada equivalente quando schema, contratos, autenticação, storage, Edge Functions e fluxos críticos são comprovados no ambiente alvo.
