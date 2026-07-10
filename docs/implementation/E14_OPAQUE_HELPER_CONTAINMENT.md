# E14 — contenção de helpers e aliases opacos

**Versão:** 0.1  
**Data:** 2026-07-10  
**Status:** Em implementação; nenhuma migration nova nesta etapa

## Objetivo

Conter o legado E14 com nomes ou argumentos opacos sem alterar o histórico aplicado nem quebrar os 18 RPCs públicos.

```text
inventariar estado atual
→ isolar aliases públicos em uma fronteira semântica
→ bloquear novos helpers/argumentos opacos
→ substituir incrementalmente
→ remover somente quando não houver consumidores
```

## Regra de detecção

O baseline considera legado opaco toda definição final de função E14 em `app_private` ou `public` que ainda possua ao menos um argumento nomeado com uma única letra, como `a`, `b`, `c` ou `d`.

O inventário registra:

- schema, nome e assinatura;
- nomes e tipos dos argumentos;
- migration que contém a definição final;
- funções E14 que ainda consomem diretamente o helper.

## Fronteira da aplicação

Os oito RPCs públicos com argumentos opacos são chamados exclusivamente por `apps/web/lib/e14/legacy-rpc-arguments.ts`.

O restante da aplicação usa nomes semânticos, como:

```text
actorUserAccountId
journeyInstanceId
activitySessionId
expectedAggregateVersion
idempotencyKey
```

Nenhum outro arquivo da aplicação pode construir objetos `{ a, b, c, ... }` para esses RPCs.

## Estratégia de substituição

1. escolher um helper legado com consumidores conhecidos;
2. criar substituto semântico somente em migration autorizada;
3. redirecionar consumidores internos;
4. provar replay, equivalência comportamental, eventos e outbox;
5. manter o RPC público congelado quando necessário;
6. remover o helper antigo apenas quando o inventário mostrar zero consumidores;
7. atualizar o baseline reduzindo, nunca ampliando, o conjunto legado.

## Gates

```text
legacy_database_surface_inventoried = pending
new_opaque_database_helpers_allowed = false
legacy_public_rpc_aliases_isolated = true
application_direct_alias_construction_allowed = false
public_rpc_count = 18
new_functional_migration_created = false
```
