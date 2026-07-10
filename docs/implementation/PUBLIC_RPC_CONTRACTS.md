# Contratos públicos de RPC

**Versão:** 2.0  
**Data:** 2026-07-10  
**Status:** fronteira estrutural e comportamento reproduzidos

## Escopo

A camada pública legada contém 18 RPCs consumidos exclusivamente pelo backend em `apps/web/lib/journey-runtime/rpc.ts`:

- 11 comandos transacionais;
- 6 consultas;
- 1 operação de resolução de identidade.

O navegador não chama o banco diretamente:

```text
browser → Next.js server action/BFF → client privilegiado → RPC PostgreSQL
```

Os nomes remotos `e14_*` permanecem por compatibilidade com o banco aplicado. Eles não definem a nomenclatura dos módulos da aplicação.

## Contrato congelado

O artefato `public-rpc-contracts-v1.json` fixa:

- nomes e assinaturas PostgreSQL;
- quantidade de RPCs;
- argumentos e retorno por fingerprint do catálogo;
- linguagem, volatilidade e corpo SQL;
- `SECURITY DEFINER`;
- `search_path=pg_catalog`;
- grants para `postgres`, `service_role` e `app_worker`;
- bloqueio de `PUBLIC`, `anon` e `authenticated`;
- correspondência entre métodos TypeScript e RPCs;
- classificação entre comandos, consultas e identidade.

Fingerprint autorizado:

```text
b751369fb873eb50a423ed7d74614a6c75e4480058e79e6a63006ec10920336f
```

Alterar apenas o baseline para fazer o CI passar é proibido.

## Envelope de comandos

```text
request_id
idempotency_key
replayed
data
```

A camada TypeScript propaga o código PostgreSQL por `JourneyRpcError.code`. O fallback `JOURNEY_RPC_ERROR` é usado apenas quando o provedor não entrega código.

## Erros comprovados

- `PUBLISHED_VERSION_IMMUTABLE`;
- `AGGREGATE_VERSION_CONFLICT`;
- `IDEMPOTENCY_KEY_REUSED`;
- `FORBIDDEN`.

## Compatibilidade técnica

Oito RPCs ainda expõem argumentos opacos:

- `e14_acknowledge_section`;
- `e14_complete_diagnostic`;
- `e14_get_operator_result`;
- `e14_get_participant_state`;
- `e14_record_quick_check_answer`;
- `e14_start_activity`;
- `e14_start_quick_check`;
- `e14_submit_quick_check`.

Essa realidade permanece congelada para impedir divergência silenciosa. A aplicação constrói os aliases exclusivamente pela fronteira `legacyRpcArguments`. Substituições futuras devem manter compatibilidade até que todos os consumidores tenham migrado.

## Validação

```bash
npm run validate:public-rpc-contracts
npm run test:backend-e2e
```

## Estado comprovado

```text
public_rpc_count = 18
public_rpc_database_fingerprint_matches = true
public_rpc_grants_match = true
public_rpc_security_boundary_matches = true
application_rpc_mapping_matches = true
public_rpc_contracts_passed = true
backend_e2e_replayed = true
```
