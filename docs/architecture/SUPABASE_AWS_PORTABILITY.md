# Portabilidade de Supabase para AWS

**Revisado em:** 2026-07-29  
**Status:** fronteiras iniciadas; adapters AWS ainda não implementados

## Direção aprovada

Supabase é uma implementação temporária para desenvolvimento/teste. AWS é a implementação obrigatória de staging e produção conforme [`DEC-075`](../decisions/AWS_PRODUCTION_ARCHITECTURE.md).

A migração deve trocar adapters de plataforma sem reescrever regras de domínio, migrations, eventos ou experiência do produto.

## Matriz canônica

| Capacidade | Adapter temporário | Adapter AWS obrigatório | Estado |
|---|---|---|---|
| compute | Vercel/dev server | Lambda container + Web Adapter | Dockerfile presente; execução não comprovada |
| identidade | Supabase Auth/SSR | Cognito User Pool ou broker corporativo equivalente | contrato decidido; implementação pendente |
| operações PostgreSQL | Edge Function + RPC/PostgREST | adapter server-only via RDS Proxy | selector criado; adapter pendente |
| banco | Supabase PostgreSQL | RDS PostgreSQL Multi-AZ | replay/equivalência pendentes |
| arquivos | Supabase Storage | S3 privado com URL pré-assinada | adapter e fluxo direto pendentes |
| assíncrono | outbox sem worker final | SQS + Lambdas + DLQ | pendente |
| secrets | ambiente Supabase/Vercel | Secrets Manager/KMS corporativo | integração pendente |
| observabilidade | logs das plataformas de teste | CloudWatch/tracing/SLO corporativo | pendente |

## Fronteiras introduzidas

`PLATFORM_RUNTIME_PROVIDER` escolhe o adapter:

```text
supabase → permitido em desenvolvimento/teste
aws      → obrigatório em staging/produção
```

O runtime rejeita `supabase` quando `APP_ENV=production`. A readiness AWS retorna `not_ready` até probes reais dos adapters existirem, evitando uma promoção falsa.

O gateway autenticado já possui uma fronteira única. A implementação Supabase permanece ativa; o caminho AWS falha fechado com código explícito até o adapter RDS ser implementado.

## Migração de identidade

O adapter AWS deve:

1. validar tokens OIDC do Cognito/broker corporativo;
2. normalizar issuer, subject, e-mail verificado e provider;
3. resolver ou vincular a conta interna;
4. carregar organizações e capacidades;
5. manter participant/admin/onboarding como estados internos;
6. não usar claims editáveis como autorização de domínio.

A migração de usuários exige estratégia de linking, recuperação e conflito. Senhas não serão exportadas do Supabase como texto ou hash reutilizável; usuários podem exigir fluxo de reset ou migração suportada pelo provedor aprovado.

## Migração PostgreSQL

A aplicação preservará funções e transações PostgreSQL sempre que portáveis. PostgREST e a Edge Function serão removidos do caminho de produção.

Trabalho obrigatório:

- inventariar extensões, roles e objetos dependentes de Supabase;
- definir roles de migration, aplicação e worker;
- criar o adapter Node server-only para RDS Proxy;
- propagar identidade e contexto transacional de forma auditável;
- executar replay em RDS limpo;
- comparar schema, grants, funções, índices e comportamento;
- testar pooling, concorrência, timeouts e falhas;
- exercitar PITR, restore e rollback.

## Migração de arquivos

A semântica de domínio permanece:

```text
intent
→ chave opaca
→ upload privado
→ checksum e metadata
→ confirmação
→ download temporário autorizado
→ retenção/revogação
```

A implementação AWS altera o transporte:

- bucket provisionado por IaC;
- presigned PUT direto do navegador;
- checksum obrigatório;
- HEAD antes da confirmação;
- S3 version ID e ETag armazenados como metadata;
- presigned GET ou CloudFront assinado após autorização;
- reconciliação de intents expirados e objetos órfãos.

O Lambda web não lê o corpo integral do arquivo.

## Migração assíncrona

O outbox PostgreSQL continua persistente. Um dispatcher publica mensagens em SQS com identificador e idempotency key. Consumidores Lambda executam HubSpot e demais integrações com concorrência limitada, retries, DLQ, readback e reconciliação.

Nenhum estado de idempotência pode depender de memória de processo.

## Dependências temporárias aceitas

Enquanto `PLATFORM_RUNTIME_PROVIDER=supabase`, permanecem autorizados:

- `@supabase/ssr`;
- `@supabase/supabase-js`;
- Supabase Auth;
- Supabase Storage;
- Edge Function `authenticated-rpc`;
- Supabase PostgreSQL.

Essas dependências não podem ser necessárias no bundle/runtime AWS final. A remoção ocorrerá após adapters AWS e paridade de staging, não antes, para manter o ambiente de validação funcional.

## Critério de conclusão

```text
aws_identity_adapter = active
aws_postgres_adapter = active
rds_replay_equivalent = true
aws_s3_adapter = active
direct_uploads = active
sqs_workers = active
supabase_runtime_dependency_in_production = false
aws_transactional_e2e = passed
```
