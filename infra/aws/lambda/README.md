# Runtime web em AWS Lambda

**Estado:** Dockerfile e contrato versionados; build, adapters e infraestrutura ainda não comprovados

Este diretório descreve o caminho canônico para executar o Next.js da Plataforma Estímulo em AWS Lambda, conforme a [`DEC-075`](../../../docs/decisions/AWS_PRODUCTION_ARCHITECTURE.md).

## Papel do container

`Dockerfile.lambda` usa o AWS Lambda Web Adapter para encaminhar eventos HTTP ao servidor Next.js standalone na porta `3000`.

A imagem:

- executa o mesmo monólito modular Next.js;
- define `APP_ENV=production`;
- define `PLATFORM_RUNTIME_PROVIDER=aws`;
- usa `/api/health/ready` como readiness fail-closed;
- trata respostas `500-599` como falha da invocação;
- usa `/tmp` somente para cache local descartável;
- não incorpora secrets;
- não contém identidade, banco, storage ou RPC sintéticos.

A readiness AWS permanece `503` até os adapters reais de identidade, RDS Proxy/PostgreSQL e S3 estarem implementados. Assim, a presença da imagem não permite um deploy produtivo incompleto.

## Build

A arquitetura da imagem precisa coincidir com a arquitetura da função Lambda. O build de CI usa:

```bash
docker buildx build \
  --load \
  --provenance=false \
  --platform linux/amd64 \
  --file Dockerfile.lambda \
  --build-arg NEXT_PUBLIC_APP_URL=https://staging.example.org \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://temporary-build.example.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=temporary-public-build-key \
  --tag lms-estimulo-lambda:<commit> \
  .
```

Os argumentos públicos Supabase ainda são necessários temporariamente porque a interface atual possui código cliente do adapter de desenvolvimento/teste. Eles não constituem configuração válida de produção e deverão desaparecer do build AWS quando o adapter Cognito substituir o cliente Supabase no navegador.

A imagem aprovada deve ser:

1. construída uma vez para o ambiente;
2. escaneada;
3. publicada no ECR da mesma região;
4. referenciada por digest;
5. promovida por versão e alias Lambda.

## Front door canônico

O padrão escolhido é:

```text
CloudFront ou edge corporativo
→ AWS WAF ou controle equivalente
→ API Gateway HTTP API
→ alias Lambda
```

Componentes corporativos equivalentes podem ser reutilizados. A integração precisa preservar:

- domínio e TLS aprovados;
- forwarded headers e origem canônica;
- cookies seguros e redirects OIDC;
- throttling e limites por rota;
- access logs sem payload sensível;
- proteção contra abuso;
- promoção canary e rollback por alias.

Lambda Function URL não é o front door padrão de produção. Pode ser usada somente para teste controlado quando a política corporativa permitir.

## Configuração de runtime AWS

A função precisa, no mínimo:

```text
APP_ENV=production
PLATFORM_RUNTIME_PROVIDER=aws
AWS_REGION
NEXT_PUBLIC_APP_URL
COGNITO_USER_POOL_ID
COGNITO_APP_CLIENT_ID
DATABASE_PROXY_ENDPOINT
DATABASE_NAME
PRACTICE_EVIDENCE_BUCKET
LIBRARY_CONTENT_BUCKET
CREDENTIAL_FILES_BUCKET
CERTIFICATE_TEMPLATE_BUCKET
ANNOUNCEMENT_BANNER_BUCKET
CPF_ENCRYPTION_KEY
CPF_LOOKUP_HMAC_KEY
```

Secrets e chaves são injetados por Secrets Manager/KMS ou solução corporativa equivalente. Valores não entram em build arguments, imagem, Terraform state, logs ou documentação.

## Identidade

A implementação final usa Cognito User Pool ou broker OIDC corporativo equivalente. Participantes e administradores são resolvidos para a conta interna, organização e capacidades do LMS.

O adapter atual Supabase continua funcional somente em desenvolvimento/teste. No provider AWS, o runtime falha fechado até o adapter Cognito ser implementado.

## PostgreSQL

O destino é RDS PostgreSQL Multi-AZ acessado por RDS Proxy. O adapter server-only substituirá Edge Function, PostgREST e RPC Supabase no caminho de produção.

A função web não deve abrir pools ilimitados. Concorrência Lambda, tamanho do pool e limites do RDS Proxy serão definidos por testes de carga.

Antes da ativação são obrigatórios:

- replay das migrations em RDS limpo;
- equivalência de schema, roles, grants, funções e comportamento;
- timeouts e cancelamento;
- PITR, restore e rollback de migrations;
- probes reais na readiness.

## S3 e uploads diretos

O Lambda web não receberá binários de participantes ou administradores em produção. As rotas atuais de multipart permanecem apenas no adapter de desenvolvimento/teste durante a migração.

Fluxo obrigatório:

```text
browser solicita intent autorizado
→ aplicação persiste intent e chave opaca
→ aplicação retorna URL pré-assinada curta com checksum
→ browser faz PUT direto no S3 privado
→ aplicação executa HEAD e valida metadata/versão
→ confirmação transacional
→ reconciliação assíncrona de expirados e órfãos
```

Buckets são provisionados pela infraestrutura corporativa; a aplicação não cria buckets durante requisições.

## Estado, cache e trabalho assíncrono

`/tmp` é local ao execution environment e descartável. Não pode armazenar:

- sessão;
- locks distribuídos;
- outbox ou fila;
- estado de idempotência;
- arquivos permanentes;
- cache necessário para correção.

O Lambda HTTP não é worker. Outbox, HubSpot e reconciliação usam dispatcher, SQS, Lambdas consumidoras, retries, DLQ e idempotência persistente.

## Integração com a AWS existente

Antes de declarar ou aplicar recursos, concluir [`infra/aws/PLATFORM_INTEGRATION_REQUIREMENTS.md`](../PLATFORM_INTEGRATION_REQUIREMENTS.md).

Não criar VPC, Cognito, RDS, buckets, filas, WAF, KMS keys ou pipelines paralelos enquanto não for conhecido o que a empresa já possui.

## Gates antes de staging

- inventário corporativo aprovado;
- imagem construída e invocada localmente/CI;
- Cognito/OIDC adapter ativo;
- RDS Proxy e adapter PostgreSQL ativos;
- S3 e uploads diretos ativos;
- API Gateway, edge, WAF, domínio e TLS configurados;
- SQS, workers e DLQ ativos;
- CloudWatch/tracing, dashboards e alarmes;
- carga, soak, cold starts e concorrência;
- backup, restore, canary e rollback;
- E2E transacional autenticado.

## Estado atual

```text
lambda_dockerfile_present = true
lambda_image_build_verified = false
lambda_image_runtime_verified = false
lambda_function_deployed = false
api_gateway_deployed = false
aws_identity_adapter = pending
aws_postgres_adapter = pending
aws_s3_adapter = pending
direct_uploads = pending
sqs_workers = pending
corporate_aws_inventory = pending
production_release = blocked
```
