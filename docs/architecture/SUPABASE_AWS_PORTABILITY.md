# Portabilidade de Supabase para AWS

**Revisado em:** 2026-07-29  
**Status:** fronteiras implementadas; adapters AWS ainda não implementados

## Direção aprovada

Supabase é a implementação de desenvolvimento/teste. AWS é a implementação obrigatória de staging e produção conforme [`DEC-075`](../decisions/AWS_PRODUCTION_ARCHITECTURE.md).

A migração troca adapters de plataforma sem reescrever regras de domínio, migrations, eventos ou experiência do produto.

## Matriz canônica

| Capacidade | Adapter de teste | Adapter AWS obrigatório | Estado |
|---|---|---|---|
| compute | dev server/Vercel preview | Lambda container + Web Adapter | único Dockerfile presente; execução não comprovada |
| identidade | Supabase Auth/SSR | Cognito User Pool ou broker corporativo equivalente | fronteira fail-closed; adapter pendente |
| operações PostgreSQL | Edge Function + RPC/PostgREST | adapter server-only via RDS Proxy | fronteira fail-closed; adapter pendente |
| banco | Supabase PostgreSQL | RDS PostgreSQL Multi-AZ | replay/equivalência pendentes |
| arquivos | Supabase Storage | S3 privado com URL pré-assinada | contrato criado; adapter e fluxo direto pendentes |
| assíncrono | outbox sem worker final | SQS + Lambdas + DLQ | pendente |
| secrets | ambiente de teste | Secrets Manager/KMS corporativo | integração pendente |
| observabilidade | logs da plataforma de teste | CloudWatch/tracing/SLO corporativo | pendente |

## Fronteiras implementadas

```text
supabase → permitido em local, test e preview
aws      → obrigatório em staging e production
```

A política é aplicada em toda resolução do provider. Os clientes Supabase de sessão e acesso privilegiado também rejeitam o provider AWS, evitando acesso acidental por um módulo que importe o adapter diretamente.

A readiness AWS retorna `not_ready` até probes reais dos adapters existirem.

O gateway autenticado possui uma fronteira única. A implementação Supabase permanece ativa em teste; o caminho AWS falha fechado até o adapter RDS ser implementado.

Os módulos de storage usam uma fronteira comum. Em AWS:

- criação de bucket durante requisição é proibida;
- upload usando buffer pelo Lambda web é proibido;
- presigned upload e inspeção de objeto permanecem fail-closed até o adapter S3 existir.

## Verificação Supabase

```bash
npm run verify:supabase
```

A verificação read-only comprova:

- Supabase Auth acessível;
- `get_application_readiness` pronto no PostgreSQL;
- Edge Function `authenticated-rpc` acessível e protegida contra chamada sem sessão.

O build não faz chamadas remotas. Verificação de ambiente e compilação são responsabilidades separadas.

## Migração de identidade

O adapter AWS deve:

1. validar tokens OIDC do Cognito/broker corporativo;
2. normalizar issuer, subject, e-mail verificado e provider;
3. resolver ou vincular a conta interna;
4. carregar organizações e capacidades;
5. manter participant/admin/onboarding como estados internos;
6. não usar claims editáveis como autorização de domínio.

A migração de usuários exige estratégia de linking, recuperação e conflito. Senhas não serão exportadas do Supabase como texto ou hash reutilizável; usuários podem exigir reset ou migração suportada pelo provedor aprovado.

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

`supabase/migrations/` é a única fonte de implementação do schema. Após o replay, as suítes executam somente SQLs `test-*`.

## Migração de arquivos

```text
intent
→ chave opaca
→ upload privado
→ checksum e metadata
→ confirmação
→ download temporário autorizado
→ retenção/revogação
```

A implementação AWS usa:

- bucket provisionado pela infraestrutura corporativa;
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

A imagem Lambda não recebe configuração Supabase. A remoção completa das bibliotecas do artefato AWS será realizada após os adapters Cognito, RDS e S3 substituírem todas as importações de plataforma.

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
