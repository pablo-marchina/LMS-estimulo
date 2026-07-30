# Portas e adapters de provedores

**Revisado em:** 2026-07-30  
**Estado:** portas lógicas vigentes; adapters AWS pendentes de arquitetura

## Objetivo

Impedir que regras de domínio, casos de uso, contratos de eventos ou componentes de interface dependam diretamente de Supabase ou de serviços AWS ainda não decididos.

## Regra de dependência

```text
domínio
  ↑
casos de uso
  ↑
portas lógicas
  ↑
adapters de ambiente
```

SDKs e semânticas físicas ficam exclusivamente nos adapters.

## Portas lógicas

### IdentityProvider

Responsabilidades:

- validar identidade externa;
- retornar identidade normalizada;
- expor somente claims permitidas;
- não transformar subject externo em chave de domínio;
- nunca expor token bruto aos casos de uso.

Estado:

- adapter Supabase disponível em desenvolvimento, teste e preview;
- adapter AWS não definido nem implementado.

### DataProvider

Responsabilidades:

- executar comandos e consultas autorizados;
- preservar transações, idempotência e códigos públicos de erro;
- aplicar identidade, organização e RBAC;
- não vazar conexão, SQL ou provider aos módulos de domínio.

Estado:

- PostgreSQL/RPC do ambiente Supabase atende o runtime de teste;
- tecnologia, conexão e adapter AWS permanecem pendentes.

### ObjectStorageProvider

Responsabilidades:

- autorizar upload e acesso temporário;
- confirmar metadados e vínculo de domínio;
- aplicar retenção, arquivamento e exclusão;
- reconciliar registro lógico e objeto físico;
- não expor localização ou credencial física ao domínio.

Estado:

- adapter Supabase atende desenvolvimento, teste e preview;
- provider, upload, verificação e lifecycle AWS permanecem pendentes.

### AsyncWorkProvider

Responsabilidades:

- publicar trabalho com chave idempotente;
- claimar, renovar, concluir ou solicitar retry;
- isolar dead letters e permitir redrive autorizado;
- preservar correlação, observabilidade e reconciliação.

Estado:

- não existe provider assíncrono de produção aprovado;
- estruturas históricas de banco ou teste não constituem adapter AWS.

### SecretsProvider

Responsabilidades:

- resolver segredo por nome lógico e escopo;
- impedir listagem ampla;
- permitir rotação sem recompilar a aplicação;
- nunca expor segredo ao cliente ou ao log.

Estado:

- desenvolvimento e CI usam injeção de ambiente controlada;
- mecanismo institucional de produção permanece pendente.

### TelemetryProvider

Responsabilidades:

- logs estruturados;
- métricas e tracing;
- propagação de correlação;
- redaction de dados pessoais, tokens e segredos;
- suporte a SLOs, alertas e incidentes.

Estado:

- console e evidências de CI atendem o desenvolvimento;
- plataforma operacional AWS permanece pendente.

## Identidade interna

A identidade externa é vinculada a uma conta interna por contrato equivalente a:

```text
(provider, external_subject) → iam.user_accounts.id
```

Nenhum identificador externo se torna automaticamente a chave primária da plataforma.

## Proibições

- importar SDK de provider no domínio ou nos casos de uso;
- usar identidade do provider como identidade de negócio;
- salvar URL, fila, bucket, ARN, receipt ou endpoint físico em contrato de domínio;
- acoplar eventos à semântica de um serviço específico;
- usar Supabase como fallback no provider AWS;
- declarar adapter AWS implementado sem código, teste e ambiente correspondente;
- escolher serviço AWS em documentação antes de ADR aprovado.

## Critérios de aceite de um adapter AWS futuro

1. ADR da fronteira e do provider;
2. implementação atrás da porta existente ou revisada;
3. contrato lógico preservado;
4. testes positivos, negativos e de falha;
5. segurança e isolamento aprovados;
6. observabilidade e operação definidas;
7. capacidade no staging AWS;
8. migração e rollback exercitados.

Até esses critérios, a fronteira de produção permanece fail-closed.
