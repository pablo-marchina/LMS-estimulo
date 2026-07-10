# Fonte, contratos e comportamento do runtime

**Versão:** 1.0  
**Data:** 2026-07-10  
**Status:** fundação atual reproduzida  
**Ambiente de referência:** Supabase de desenvolvimento/teste `cfpfeavjlgheqqiaqtzv`

## Histórico executável

| Grupo | Quantidade | SQL remoto | Fingerprint ordenado |
|---|---:|---:|---|
| M00–M12 | 76 | 411.340 bytes | `663173105a16924db650127f437900de0ad3422b2f7bf50a5e804f19d1a570a3` |
| M13 | 165 | 123.636 bytes | `6df68289eb6de6a47f84f6bb8dae0761c75e4480058e79e6a63006ec10920336f` |
| M14/M14b | 2 | 12.045 bytes | `8b3cb9b361f2bbff69d784ef92767de14795f761c1159321e8b163ccde96fde0` |
| M15a | 1 | 1.536 bytes | `8fbc1cc944fefa9e9bd5cfed4deb572c07d730162b5267b3074ce511fd867d96` |
| **Total** | **244** | **548.557 bytes** | quatro manifests validados |

As versões, nomes e hashes remotos estão materializados em `supabase/migrations` e `supabase/canonical-migrations`.

## Replay e equivalência

O workflow `.github/workflows/database-gates.yml` usa `supabase/postgres:17.6.1.136` e:

1. valida os quatro manifests;
2. aplica as 244 migrations, uma transação por migration;
3. compara nove categorias estruturais com o baseline remoto;
4. valida os 18 contratos públicos;
5. executa o backend E2E.

```text
clean_replay_passed = true
schema_equivalence_passed = true
```

As categorias equivalentes são schemas, relações/RLS, colunas, constraints, índices, triggers, policies, rotinas e tipos.

## Contratos públicos

```text
rpc_count = 18
commands = 11
queries = 6
identity_operations = 1
contract_sha256 = b751369fb873eb50a423ed7d74614a6c75e4480058e79e6a63006ec10920336f
public_rpc_contracts_passed = true
```

Execução permitida: `postgres`, `service_role` e `app_worker`. `PUBLIC`, `anon` e `authenticated` não executam os RPCs.

## Backend E2E

A vertical foi reproduzida em PostgreSQL efêmero, com uma transação independente por RPC:

- publicação e matrícula;
- jornada e diagnóstico;
- caminho `standard`;
- atividade e quatro seções;
- quick check reprovado e aprovado;
- progresso e pontos;
- eventos e outbox;
- consultas de participante e operador;
- autorização e RLS negativas;
- idempotência e concorrência otimista.

```text
backend_e2e_replayed = true
journey_events = 35
total_event_delta = 39
outbox_delta = 39
successful_submission_correlated_events = 8
point_ledger_entries = 2
point_ledger_sum = 7
```

Evidência detalhada: [BACKEND_E2E.md](BACKEND_E2E.md).

## Dados fora do histórico original

O E2E identificou configurações no Supabase de teste que não foram criadas pelo histórico original:

- quatro itens diagnósticos e dezesseis opções;
- dois caminhos e duas etapas;
- vinte e nove IDs canônicos de schemas de eventos.

Esses registros são fixtures no banco efêmero. A revisão do modelo físico deve decidir quais serão configuração oficial versionada no HubSpot e quais permanecerão sintéticos.

## Dívida técnica remanescente

O runtime contém helpers remotos `app_private.e14_*` com nomes opacos. Esses nomes são compatibilidade histórica do banco aplicado. Novos módulos da aplicação usam nomes semânticos e o padrão legado não pode ser ampliado.

Regras:

1. preservar os 18 RPCs públicos durante a compatibilidade;
2. usar nomes semânticos em novos componentes;
3. comparar resultados, erros, eventos e outbox;
4. remover aliases somente depois de eliminar consumidores;
5. não criar subsistemas paralelos;
6. não usar PostgreSQL como autoridade independente dos dados de negócio.

## Comandos permanentes

```bash
npm run validate:migration-history
npm run replay:database-clean
npm run validate:schema-equivalence
npm run validate:public-rpc-contracts
npm run test:backend-e2e
npm run test:database-gates
```

## Estado de saída

```text
migration_history_reconciled = true
clean_replay_passed = true
schema_equivalence_passed = true
public_rpc_contracts_passed = true
backend_e2e_replayed = true
legacy_cutover_classification_complete = false
hubspot_physical_model_approved = false
```

Supabase permanece restrito a desenvolvimento/teste. AWS continua obrigatória para staging e produção.
