# Contratos públicos de RPC

**Versão:** 1.0  
**Data:** 2026-07-10  
**Status:** fronteira estrutural congelada; replay comportamental pendente

## Escopo

A camada pública E14 contém 18 RPCs consumidos exclusivamente pelo backend da aplicação em `apps/web/lib/journey-runtime/rpc.ts`:

- 11 comandos transacionais;
- 6 consultas;
- 1 operação de resolução de identidade.

O navegador não chama o banco diretamente. O caminho obrigatório permanece:

```text
browser -> Next.js server action/BFF -> client privilegiado do servidor -> RPC E14 -> PostgreSQL
```

## Contrato congelado

O artefato `public-rpc-contracts-v1.json` fixa:

- nomes e assinaturas PostgreSQL;
- quantidade de RPCs;
- tipos de argumentos e retorno por meio do fingerprint do catálogo;
- linguagem, volatilidade e corpo SQL;
- `SECURITY DEFINER`;
- `search_path=pg_catalog`;
- grants exclusivamente para `postgres`, `service_role` e `app_worker`;
- bloqueio de `PUBLIC`, `anon` e `authenticated`;
- correspondência entre os 18 métodos TypeScript e os 18 RPCs;
- classificação entre comandos, consultas e identidade.

Fingerprint autorizado:

```text
b751369fb873eb50a423ed7d74614a6c75e4480058e79e6a63006ec10920336f
```

Qualquer mudança de assinatura, corpo, grant, configuração ou mapeamento da aplicação exige revisão explícita do contrato. Alterar apenas o baseline para fazer o CI passar é proibido.

## Envelope de comandos

Os 11 comandos retornam o envelope:

```text
request_id
idempotency_key
replayed
data
```

A camada TypeScript deve continuar propagando o código de erro PostgreSQL por `JourneyRpcError.code`. O fallback `JOURNEY_RPC_ERROR` só é usado quando o provedor não entrega um código.

## Erros já comprovados

As provas de runtime anteriores registraram:

- `PUBLISHED_VERSION_IMMUTABLE`;
- `AGGREGATE_VERSION_CONFLICT`;
- `IDEMPOTENCY_KEY_REUSED`;
- `FORBIDDEN`.

Esses códigos fazem parte da fronteira observada. A cobertura completa de erros, efeitos, eventos, outbox e respostas continua pertencendo ao backend E2E.

## Dívida técnica preservada

Oito RPCs ainda expõem argumentos opacos como `a`, `b`, `c`, `d` e `e`:

- `e14_acknowledge_section`;
- `e14_complete_diagnostic`;
- `e14_get_operator_result`;
- `e14_get_participant_state`;
- `e14_record_quick_check_answer`;
- `e14_start_activity`;
- `e14_start_quick_check`;
- `e14_submit_quick_check`.

A E14-R1c congela essa realidade para impedir divergência silenciosa. Ela não autoriza ampliar o padrão. A substituição futura deve manter o contrato público antigo durante uma migração compatível e comprovada.

## Validação

O comando executado depois do replay limpo é:

```bash
npm run validate:public-rpc-contracts
```

O gate compara o banco reconstruído com o fingerprint autorizado e valida o mapa real da aplicação. Os testes unitários do validador também rodam em `Repository governance`.

## Critério de saída

```text
public_rpc_count = 18
public_rpc_database_fingerprint_matches = true
public_rpc_grants_match = true
public_rpc_security_boundary_matches = true
application_rpc_mapping_matches = true
public_rpc_contracts_passed = true
backend_e2e_replayed = false
```

O próximo passo é reproduzir o backend E2E em banco limpo, cobrindo respostas, erros, RLS negativa, idempotência, concorrência, eventos e outbox.
