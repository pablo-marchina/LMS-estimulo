# Estratégia de ambientes

**Revisado em:** 2026-07-29  
**Status:** política vigente; AWS corporativa ainda não inventariada

## Ambientes

| Ambiente | Provider obrigatório | Finalidade | Dados |
|---|---|---|---|
| `local` | `supabase` | desenvolvimento e testes rápidos | sintéticos |
| `development/test` | `supabase` | integração, QA e validação temporária | sintéticos ou anonimizados aprovados |
| `preview` | `supabase` | revisão controlada de interface e fluxos | somente teste |
| `aws-staging` | `aws` | paridade, operação, carga, segurança e migração | sintéticos/anonimizados |
| `aws-production` | `aws` | operação oficial | reais após gates |

Supabase e Vercel não são ambientes oficiais de produção.

## Promoção

```text
mudança revisada
→ validações locais
→ CI funcional
→ Supabase development/test
→ npm run verify:supabase
→ build imutável da imagem Lambda
→ AWS staging com adapters AWS
→ E2E transacional, carga, restore e rollback
→ aprovação de produção
→ alias Lambda de produção
```

Não existe promoção direta de Supabase para produção. Dados, configuração e evidência de desenvolvimento não são tratados como prova AWS.

## Provider policy

```text
APP_ENV=development|test + PLATFORM_RUNTIME_PROVIDER=supabase  permitido
APP_ENV=staging|production + PLATFORM_RUNTIME_PROVIDER=aws     obrigatório
APP_ENV=staging|production + PLATFORM_RUNTIME_PROVIDER=supabase rejeitado
```

A política é aplicada em toda consulta ao provider e pelos próprios adapters Supabase.

A readiness de um ambiente AWS só pode ficar verde após probes reais de Cognito/IdP, RDS Proxy/PostgreSQL, S3 e configuração de segurança.

## Paridade

Devem permanecer iguais entre os adapters:

- modelo de domínio;
- identidade interna, organizações e RBAC;
- migrations e funções PostgreSQL aplicáveis;
- eventos, outbox e idempotência;
- regras de diagnóstico, jornada e credenciais;
- metadados e autorização de arquivos;
- contratos HubSpot.

A implementação física muda:

| Capacidade | Desenvolvimento/teste | AWS staging/produção |
|---|---|---|
| identidade | Supabase Auth | Cognito/OIDC corporativo |
| gateway de operações | Edge Function + RPC/PostgREST | adapter server-only + RDS Proxy |
| PostgreSQL | Supabase PostgreSQL | RDS PostgreSQL Multi-AZ |
| arquivos | Supabase Storage | S3 privado e upload direto |
| assíncrono | contratos/outbox sem worker final | SQS, Lambdas consumidoras e DLQ |
| secrets | ambiente gerenciado de teste | Secrets Manager/KMS corporativo |
| observabilidade | logs da plataforma de teste | CloudWatch/tracing e SLOs corporativos |

## Infraestrutura corporativa

Antes de criar ou aplicar recursos, o inventário de [`infra/aws/PLATFORM_INTEGRATION_REQUIREMENTS.md`](../../infra/aws/PLATFORM_INTEGRATION_REQUIREMENTS.md) precisa identificar contas, rede, edge, identidade, RDS, S3, filas, secrets, observabilidade e pipeline existentes.

A árvore ativa não contém stack genérica de infraestrutura. A implementação física usará os recursos, módulos e pipelines oficiais da empresa.

## Dados, secrets e isolamento

- desenvolvimento usa dados sintéticos por padrão;
- cópias de produção exigem processo de anonimização e aprovação;
- contas e recursos de staging/produção devem ser separados conforme a política corporativa;
- secrets nunca entram em Git, build arguments, imagens ou logs;
- callbacks, domínios e buckets são específicos por ambiente;
- integrações externas usam sandbox antes de produção;
- migrations são executadas por identidade operacional separada da aplicação.

## Evidência mínima de staging

1. imagem por digest e alias de staging;
2. identidade real de teste e RBAC;
3. replay e equivalência em RDS;
4. upload/download direto em S3;
5. outbox, SQS, retry e DLQ;
6. HubSpot em sandbox;
7. logs, métricas e alarmes;
8. teste transacional em navegador;
9. teste de carga e concorrência;
10. backup, PITR, restore e rollback;
11. segurança, privacidade e acessibilidade aprovadas.
