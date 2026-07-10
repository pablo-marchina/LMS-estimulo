# contenção de helpers e aliases opacos

**Versão:** 0.4  
**Data:** 2026-07-10  
**Status:** Contenção implementada; primeira substituição física aplicada e reconciliada

## Objetivo

Conter e reduzir o legado E14 com nomes ou argumentos opacos sem quebrar os 18 RPCs públicos.

```text
inventariar estado atual
→ isolar aliases públicos em uma fronteira semântica
→ bloquear novos helpers/argumentos opacos
→ substituir incrementalmente
→ remover somente quando não houver consumidores
```

## Baseline atual

O [baseline canônico](opaque-helper-baseline-v1.json) é gerado deterministicamente a partir das 244 migrations executáveis aplicadas no Supabase de desenvolvimento/teste.

```text
legacy_function_count = 114
legacy_private_helper_count = 106
legacy_public_rpc_count = 8
inventory_sha256 = 4970dd5691a824aafdfc70688addcdf63397df6903440e281e7233a1075d6aaf
```

O parser processa definições, redefinições e `DROP FUNCTION`, garantindo que funções fisicamente removidas não permaneçam artificialmente no inventário.

## Regra de detecção

O baseline considera legado opaco toda definição final de função E14 em `app_private` ou `public` que ainda possua ao menos um argumento nomeado com uma única letra, como `a`, `b`, `c` ou `d`.

O inventário registra:

- schema, nome e assinatura;
- nomes e tipos dos argumentos;
- migration que contém a definição final;
- funções E14 que ainda consomem diretamente o helper.

O gate falha quando o conjunto, a assinatura ou a cadeia de consumidores muda sem atualização explícita do baseline. Atualizações que ampliem a quantidade legada não são aceitas.

## Fronteira da aplicação

Os oito RPCs públicos com argumentos opacos são chamados exclusivamente por `apps/web/lib/journey-runtime/legacy-rpc-arguments.ts`:

```text
completeDiagnostic
startActivity
acknowledgeSection
startQuickCheck
recordQuickCheckAnswer
submitQuickCheck
getParticipantState
getOperatorResult
```

O restante da aplicação usa nomes semânticos, como:

```text
actorUserAccountId
journeyInstanceId
activitySessionId
expectedAggregateVersion
idempotencyKey
```

Nenhum outro arquivo pode construir objetos `{ a, b, c, ... }` para esses RPCs ou referenciar diretamente os oito nomes congelados.

## Primeira substituição física

A primeira função escolhida foi:

```text
app_private.e14_close_activity_session(uuid)
```

### Critérios de seleção

```text
direct_consumers = 1
tables_mutated = 1
event_or_outbox_calls = 0
public_exposure = false
business_result_returned = false
```

O único consumidor era `app_private.e14_i1_state(jsonb,uuid)`. A função apenas definia `ended_at` e `last_seen_at` para uma sessão de atividade ainda aberta.

A migration M15a:

1. cria `app_private.e14_close_completed_activity_session(p_activity_session_id uuid)`;
2. mantém `SECURITY DEFINER` e `search_path=pg_catalog`;
3. remove execução de `PUBLIC`, `anon` e `authenticated`;
4. redireciona o único consumidor;
5. remove `app_private.e14_close_activity_session(uuid)`;
6. preserva os 18 RPCs públicos;
7. preserva o backend E2E completo.

Histórico executável:

```text
supabase/migrations/20260710165530_m15a_e14_semantic_activity_session_close.sql
```

Registro remoto:

```text
version = 20260710165530
sql_bytes = 1536
sql_sha256 = 8fbc1cc944fefa9e9bd5cfed4deb572c07d730162b5267b3074ce511fd867d96
```

### Resultado remoto e reproduzido

```text
legacy_function_count = 114
legacy_private_helper_count = 106
legacy_public_rpc_count = 8
old_helper_exists = false
semantic_replacement_exists = true
public_rpc_count = 18
public_rpc_contract_sha256 = b751369fb873eb50a423ed7d74614a6c75e4480058e79e6a63006ec10920336f
backend_e2e_passed = true
```

## Estratégia de substituição

1. selecionar uma cadeia por consumidores, centralidade e efeitos;
2. criar um substituto com nome e argumentos semânticos;
3. redirecionar todos os consumidores;
4. remover o helper antigo no mesmo delta;
5. provar contratos públicos, comportamento, eventos e outbox;
6. aplicar remotamente somente após autorização explícita;
7. materializar a versão remota exata no Git;
8. atualizar o baseline e repetir a seleção para a próxima cadeia.

A contenção impede crescimento da dívida, mas o E14-B002 permanece aberto até a substituição física incremental do restante do legado.

## Gates

```text
legacy_database_surface_inventoried = true
recovered_migration_count = 244
legacy_function_count = 114
legacy_private_helper_count = 106
legacy_public_rpc_count = 8
new_opaque_database_helpers_allowed = false
legacy_public_rpc_aliases_isolated = true
application_direct_alias_construction_allowed = false
public_rpc_count = 18
public_rpc_fingerprint_changed = false
first_semantic_replacement_applied_to_remote = true
first_semantic_replacement_materialized_in_git = true
physical_legacy_replacement_complete = false
```
