# Contratos públicos de RPC

**Revisado em:** 2026-07-30  
**Status:** fronteira versionada; conformidade avaliada por replay no SHA atual

## Escopo

A camada de jornada em `apps/web/lib/journey-runtime/rpc.ts` consome uma superfície PostgreSQL versionada de comandos, consultas e resolução de identidade.

O navegador não chama essa superfície diretamente:

```text
browser → Next.js server action/BFF → gateway privilegiado → RPC PostgreSQL
```

Os nomes remotos `e14_*` permanecem por compatibilidade com o banco aplicado. Eles não definem a nomenclatura dos módulos da aplicação.

## Fonte de verdade

O contrato legível por máquina é [`public-rpc-contracts-v1.json`](public-rpc-contracts-v1.json). Ele fixa:

- nomes e assinaturas PostgreSQL;
- quantidade e fingerprint da superfície;
- `SECURITY DEFINER` e `search_path=pg_catalog`;
- grants obrigatórios e grantees proibidos;
- correspondência entre métodos TypeScript e RPCs;
- classificação entre comandos, consultas e identidade;
- argumentos opacos ainda preservados por compatibilidade;
- códigos de erro observáveis.

Este documento não replica contagens, fingerprint ou estado de execução. Alterar apenas o contrato JSON para fazer o CI passar é proibido; toda mudança exige migration, consumidor, justificativa e replay comportamental.

## Envelope de comandos

```text
request_id
idempotency_key
replayed
data
```

A camada TypeScript propaga o código PostgreSQL por `JourneyRpcError.code`. O fallback `JOURNEY_RPC_ERROR` é usado somente quando o provider não entrega código.

## Segurança

- a função PostgreSQL valida autorização e invariantes de domínio;
- o gateway valida sessão, identidade interna e correspondência do ator;
- `PUBLIC`, `anon` e `authenticated` não recebem execução direta;
- aplicação e gateway devem usar exatamente a superfície permitida;
- mensagens internas do banco não são devolvidas ao cliente;
- comandos exigem idempotency key e envelope transacional.

## Compatibilidade

Os argumentos opacos listados no contrato JSON permanecem contidos pela fronteira `legacyRpcArguments`. Novos helpers ou argumentos opacos são proibidos. Uma substituição futura deve preservar compatibilidade até a migração de todos os consumidores.

## Validação

```bash
npm run validate:public-rpc-contracts
npm run validate:rpc-gateway-coverage
npm run test:database
```

A validação compara o contrato JSON com o catálogo reconstruído desde zero, o código da aplicação e o gateway. O resultado pertence aos artefatos do workflow do SHA avaliado.
