# Portabilidade Supabase → AWS

**Versão:** 0.1  
**Status:** Obrigatória para a primeira release de produção

## 1. Objetivo

Permitir que o mesmo produto seja desenvolvido e testado rapidamente no Supabase, mas implantado na AWS sem reescrita do domínio, migrations ou fluxos centrais.

## 2. Matriz de equivalência

| Capacidade | Local/test | AWS staging/production | Estratégia de portabilidade |
|---|---|---|---|
| PostgreSQL | Supabase Postgres | Amazon RDS for PostgreSQL | SQL PostgreSQL portável e migrations únicas |
| Autenticação | Supabase Auth | Amazon Cognito User Pools | adapter OIDC/JWT + identidade interna |
| Arquivos | Supabase Storage | Amazon S3 | `StorageProvider` e URLs assinadas |
| API | aplicação containerizada | ECS/Fargate + ALB | mesma imagem/container |
| Workers | processo local/test | ECS/Fargate workers | mesmo código e contrato de job |
| Fila | adapter de teste/Postgres outbox | Amazon SQS + DLQ | `QueueProvider` |
| Agendamento | runner de teste | EventBridge Scheduler | `SchedulerProvider` |
| Secrets | `.env` seguro/CI secrets | AWS Secrets Manager/SSM | `SecretProvider` |
| E-mail | sink/sandbox | Amazon SES | `MailProvider` |
| Observabilidade | OpenTelemetry local/test | ADOT + CloudWatch/X-Ray | instrumentação OTel única |
| CDN/WAF/DNS | não aplicável/teste | CloudFront + WAF + Route 53 + ACM | camada de edge AWS |

## 3. Banco portátil

### Permitido no núcleo

- PostgreSQL SQL padrão e recursos suportados no RDS;
- schemas, FKs, checks, triggers e funções PL/pgSQL justificadas;
- RLS PostgreSQL;
- JSONB para configurações versionadas e payloads validados;
- `pgcrypto` quando suportado e aprovado;
- migrations SQL versionadas.

### Proibido sem adapter ou plano de equivalência

- lógica central em Supabase Edge Functions;
- dependência direta de Supabase Realtime;
- uso do PostgREST como única API de domínio;
- policies acopladas diretamente a `auth.uid()`;
- URLs e IDs internos do Supabase persistidos como domínio;
- webhooks de banco como mecanismo único de integração;
- extensões indisponíveis no RDS escolhido.

## 4. Identidade portátil

O token externo nunca será a identidade de domínio.

```text
JWT Supabase ou Cognito
→ validação pelo adapter OIDC
→ external_identity(provider, subject)
→ iam.user_account
→ contexto interno da transação
```

A API resolverá o usuário interno e definirá contexto transacional PostgreSQL:

```sql
SET LOCAL app.user_account_id = '<uuid>';
SET LOCAL app.organization_id = '<uuid>';
```

As funções de RLS deverão ler esse contexto neutro, e não claims proprietários do provedor.

## 5. Storage portátil

O domínio persiste somente:

- `file_object_id`;
- provider lógico;
- bucket lógico;
- object key opaca;
- hash;
- tamanho;
- MIME validado;
- status de scan;
- classificação de privacidade.

Nunca persistir URL assinada. Supabase Storage e S3 implementam o mesmo contrato:

```text
request_upload
confirm_upload
scan
promote
request_download
revoke
```

## 6. Filas e processamento

O compromisso atômico termina no PostgreSQL:

```text
transação de domínio
+ evento
+ outbox
```

Um dispatcher lê a outbox. Em testes pode usar um adapter síncrono/controlado; em AWS publicará no SQS. Consumidores usam inbox/idempotência em ambos.

## 7. Testes de portabilidade obrigatórios

- aplicar todas as migrations no Supabase limpo;
- aplicar todas as migrations no RDS PostgreSQL limpo;
- comparar schemas esperados;
- executar a mesma suíte de integração;
- validar diferenças de timezone, extensões e tipos;
- validar RLS com tokens Supabase e Cognito;
- executar testes de storage em Supabase e S3;
- executar testes de fila em adapter de teste e SQS;
- impedir importações de SDK Supabase dentro dos módulos de domínio.

## 8. Lint arquitetural

O CI deverá falhar quando módulos de domínio importarem diretamente:

- SDK Supabase;
- SDK AWS;
- cliente HubSpot;
- cliente OpenAI;

Esses imports pertencem à camada de infraestrutura/adapters.
