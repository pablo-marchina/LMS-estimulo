# Portas e adapters — Supabase em teste, AWS em produção

**Versão:** 0.1  
**Status:** baseline para E12

## Objetivo

Impedir que regras de domínio, casos de uso ou contratos de eventos dependam diretamente de Supabase ou AWS.

## Portas obrigatórias

### IdentityProvider

Responsabilidades:

- validar token externo;
- retornar identidade normalizada;
- não criar usuário de domínio automaticamente;
- expor `provider`, `subject`, `email_verified` e claims permitidas;
- nunca expor o token bruto ao domínio.

Adapters:

- `SupabaseIdentityAdapter` em desenvolvimento/teste;
- `CognitoIdentityAdapter` em staging/produção.

### ObjectStorageProvider

Responsabilidades:

- emitir upload/download assinados;
- confirmar objeto, hash, tamanho e MIME;
- mover/quarentenar evidências;
- excluir ou reter conforme política;
- não expor bucket físico ao domínio.

Adapters:

- `SupabaseStorageAdapter` em teste;
- `S3StorageAdapter` em AWS.

### QueueProvider

Responsabilidades:

- publicar mensagem com chave de idempotência;
- receber e confirmar processamento;
- aplicar retry e dead-letter;
- preservar correlação e trace context.

Adapters:

- `InMemoryQueueAdapter` apenas para testes unitários;
- adapter de teste compartilhado a definir;
- `SqsQueueAdapter` em AWS.

### SecretsProvider

Responsabilidades:

- ler segredos por nome lógico;
- não disponibilizar listagem ampla;
- permitir rotação sem recompilar a aplicação.

Adapters:

- ambiente local/CI;
- AWS Secrets Manager/SSM em staging/produção.

### TelemetryProvider

Responsabilidades:

- logs estruturados;
- métricas;
- spans e propagação de contexto;
- redaction de dados pessoais e segredos.

Adapters:

- console/OTLP de teste;
- OpenTelemetry para CloudWatch/X-Ray na AWS.

## Regras de dependência

```text
Domínio
  ↑
Casos de uso
  ↑
Portas
  ↑
Adapters Supabase/AWS
```

É proibido:

- importar SDK do Supabase em `domain` ou `application`;
- importar AWS SDK em `domain` ou `application`;
- usar `auth.uid()` como identidade de domínio;
- salvar URL física de bucket como contrato de negócio;
- usar semântica de SQS no contrato de evento;
- acoplar migrations a extensões exclusivas não disponíveis no RDS sem decisão explícita.

## Identidade interna

A identidade externa é mapeada por:

```text
(provider, external_subject) → iam.user_accounts.id
```

O `sub` do Cognito e o subject do Supabase nunca serão a chave primária principal da plataforma.

## Critérios de aceite

- mesmos casos de uso executam com adapters Supabase e AWS;
- contratos de domínio não mudam entre ambientes;
- migrations PostgreSQL são únicas;
- testes de contrato passam para adapters em memória;
- staging AWS valida as diferenças físicas antes de produção.
