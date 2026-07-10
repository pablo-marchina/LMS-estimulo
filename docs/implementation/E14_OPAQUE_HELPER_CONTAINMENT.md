# E14 — contenção de helpers e aliases opacos

**Versão:** 0.2  
**Data:** 2026-07-10  
**Status:** Contenção implementada; substituição física incremental permanece aberta

## Objetivo

Conter o legado E14 com nomes ou argumentos opacos sem alterar o histórico aplicado nem quebrar os 18 RPCs públicos.

```text
inventariar estado atual
→ isolar aliases públicos em uma fronteira semântica
→ bloquear novos helpers/argumentos opacos
→ substituir incrementalmente
→ remover somente quando não houver consumidores
```

## Baseline comprovado

O [baseline canônico](e14-opaque-helper-baseline-v1.json) foi gerado deterministicamente a partir das 243 migrations executáveis.

```text
legacy_function_count = 115
legacy_private_helper_count = 107
legacy_public_rpc_count = 8
inventory_sha256 = 9b4b81e184d40bd6385bf0c24dae401469150076c48d5da369cdec7aa0d3046b
```

## Regra de detecção

O baseline considera legado opaco toda definição final de função E14 em `app_private` ou `public` que ainda possua ao menos um argumento nomeado com uma única letra, como `a`, `b`, `c` ou `d`.

O inventário registra:

- schema, nome e assinatura;
- nomes e tipos dos argumentos;
- migration que contém a definição final;
- funções E14 que ainda consomem diretamente o helper.

O gate falha quando o conjunto, a assinatura ou a cadeia de consumidores muda sem atualização explícita do baseline. Atualizações que ampliem a quantidade legada não são aceitas como manutenção normal.

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

Nenhum outro arquivo da aplicação pode construir objetos `{ a, b, c, ... }` para esses RPCs. O gate também impede que outro arquivo da aplicação referencie diretamente os nomes dos oito RPCs congelados.

A mudança corrigiu `completeDiagnostic`, que antes enviava nomes de argumentos semânticos para uma assinatura PostgreSQL ainda composta por aliases de uma letra.

## Estratégia de substituição

1. escolher um helper legado com consumidores conhecidos;
2. criar substituto semântico somente em migration autorizada;
3. redirecionar consumidores internos;
4. provar replay, equivalência comportamental, eventos e outbox;
5. manter o RPC público congelado quando necessário;
6. remover o helper antigo apenas quando o inventário mostrar zero consumidores;
7. atualizar o baseline reduzindo, nunca ampliando, o conjunto legado.

A contenção impede crescimento da dívida, mas não equivale à remoção das 107 funções privadas. O E14-B002 permanece aberto até a substituição e remoção incremental comprovada.

## Gates

```text
legacy_database_surface_inventoried = true
legacy_function_count = 115
legacy_private_helper_count = 107
legacy_public_rpc_count = 8
new_opaque_database_helpers_allowed = false
legacy_public_rpc_aliases_isolated = true
application_direct_alias_construction_allowed = false
public_rpc_count = 18
public_rpc_fingerprint_changed = false
new_functional_migration_created = false
physical_legacy_replacement_complete = false
```
