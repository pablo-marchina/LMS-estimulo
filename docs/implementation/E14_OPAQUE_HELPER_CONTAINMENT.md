# E14 — contenção de helpers e aliases opacos

**Versão:** 0.3  
**Data:** 2026-07-10  
**Status:** Contenção implementada; primeiro delta técnico preparado e comprovado em banco efêmero

## Objetivo

Conter e reduzir o legado E14 com nomes ou argumentos opacos sem alterar o histórico aplicado nem quebrar os 18 RPCs públicos.

```text
inventariar estado atual
→ isolar aliases públicos em uma fronteira semântica
→ bloquear novos helpers/argumentos opacos
→ substituir incrementalmente
→ remover somente quando não houver consumidores
```

## Baseline recuperado

O [baseline canônico](e14-opaque-helper-baseline-v1.json) é gerado deterministicamente a partir das 243 migrations executáveis já aplicadas no Supabase de teste.

```text
legacy_function_count = 115
legacy_private_helper_count = 107
legacy_public_rpc_count = 8
inventory_sha256 = 9b4b81e184d40bd6385bf0c24dae401469150076c48d5da369cdec7aa0d3046b
```

O baseline recuperado não é reescrito para fingir que um delta pendente já foi aplicado remotamente.

## Regra de detecção

O baseline considera legado opaco toda definição final de função E14 em `app_private` ou `public` que ainda possua ao menos um argumento nomeado com uma única letra, como `a`, `b`, `c` ou `d`.

O inventário registra:

- schema, nome e assinatura;
- nomes e tipos dos argumentos;
- migration que contém a definição final;
- funções E14 que ainda consomem diretamente o helper.

O gate falha quando o conjunto, a assinatura ou a cadeia de consumidores muda sem atualização explícita do baseline. Atualizações que ampliem a quantidade legada não são aceitas.

## Fronteira da aplicação

Os oito RPCs públicos com argumentos opacos são chamados exclusivamente por `apps/web/lib/e14/legacy-rpc-arguments.ts`:

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

## Primeiro delta técnico

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

O único consumidor é `app_private.e14_i1_state(jsonb,uuid)`. A função apenas define `ended_at` e `last_seen_at` para uma sessão de atividade ainda aberta.

O delta pendente:

1. cria `app_private.e14_close_completed_activity_session(p_activity_session_id uuid)`;
2. mantém `SECURITY DEFINER` e `search_path=pg_catalog`;
3. remove execução de `PUBLIC`, `anon` e `authenticated`;
4. redireciona o único consumidor;
5. remove `app_private.e14_close_activity_session(uuid)`;
6. preserva os 18 RPCs públicos;
7. executa o backend E2E completo após a substituição.

Arquivo:

```text
supabase/pending-migrations/20260710160000_m15a_e14_semantic_activity_session_close.sql
```

Ele é intencionalmente um delta pendente. O PR não aplica SQL no Supabase remoto.

### Resultado esperado e comprovado no PostgreSQL efêmero

```text
legacy_function_count = 114
legacy_private_helper_count = 106
legacy_public_rpc_count = 8
old_helper_exists = false
semantic_replacement_exists = true
public_rpc_fingerprint_changed = false
backend_e2e_passed_after_delta = true
```

## Estratégia de substituição

1. selecionar uma cadeia por consumidores, centralidade e efeitos;
2. criar um substituto com nome e argumentos semânticos;
3. redirecionar todos os consumidores;
4. remover o helper antigo no mesmo delta;
5. provar contratos públicos, comportamento, eventos e outbox;
6. aplicar remotamente somente após autorização explícita;
7. atualizar o baseline recuperado apenas depois que o remoto também contiver a mudança.

A contenção impede crescimento da dívida, mas o E14-B002 permanece aberto até a substituição física incremental do restante do legado.

## Gates

```text
legacy_database_surface_inventoried = true
recovered_legacy_function_count = 115
pending_delta_legacy_function_count = 114
pending_delta_private_helper_count = 106
legacy_public_rpc_count = 8
new_opaque_database_helpers_allowed = false
legacy_public_rpc_aliases_isolated = true
application_direct_alias_construction_allowed = false
public_rpc_count = 18
public_rpc_fingerprint_changed = false
pending_delta_tested_in_ephemeral_postgres = true
pending_delta_applied_to_remote = false
physical_legacy_replacement_complete = false
```
