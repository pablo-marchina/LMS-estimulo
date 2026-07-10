# E14 — registro de bloqueadores

**Versão:** 0.7  
**Data:** 2026-07-10  
**Status:** Ativo

## Regras

- `P0` bloqueia mudanças que ampliem o runtime ou o schema afetado;
- `P1` deve ser resolvido antes do gate de release;
- encerramento exige prova executável e reproduzível;
- decisões explícitas posteriores prevalecem sobre arquitetura anterior.

## Bloqueadores ativos

| ID | Severidade | Área | Descrição | Bloqueia | Critério de encerramento |
|---|---|---|---|---|---|
| E14-B002 | P0 | Maintainability | helpers privados E14 possuem nomes opacos e aliases extensos | expansão do padrão opaco | substituição incremental sem quebra dos 18 RPCs, resultados, eventos ou outbox |
| E14-B003 | P1 | Build/CI | não existe lockfile npm canônico | instalação reproduzível | `package-lock.json`, `npm ci` e instalação limpa Windows/Linux |
| E14-B004 | P1 | Browser E2E | fluxo pelo navegador e acessibilidade não foram comprovados | conclusão da vertical | E2E com contas técnicas e auditoria de acessibilidade |
| E14-B005 | P1 | Product inputs | conteúdo externo e configuração inicial dos arquétipos ainda não foram aprovados | implementação final | entradas oficiais versionadas e aprovadas |
| E14-B006 | P1 | Test adapters | storage/scan estão ativos no Supabase de teste sem consumidor atual | gate operacional | integrar com E2E ou remover integralmente função, scheduler e dependências |
| E14-B007 | P0 | HubSpot authority | o HubSpot foi definido como autoridade de todos os dados coletados e utilizados, mas o sandbox, plano, objetos, propriedades, associações, scopes, webhooks e limites ainda não foram inventariados | modelo físico, novas migrations e implementação de formulário/arquétipos | inventário completo, modelo físico aprovado, adapter/readback definidos e matriz campo→HubSpot completa |

## Gate encerrado

`E14-B001 — Database/runtime` foi encerrado:

```text
remote_migration_source_materialized = true
recovered_migration_count = 243
clean_replay_passed = true
schema_equivalence_passed = true
public_rpc_contracts_passed = true
backend_e2e_replayed = true
rls_negative_checks_passed = true
idempotency_and_concurrency_passed = true
events_and_outbox_passed = true
```

## Dependências

```text
E14-B007
  → inventariar a conta HubSpot
  → escolher objetos, propriedades, associações e eventos
  → definir write + readback e origem das leituras
  → concluir o delta físico
  → somente então autorizar migrations técnicas

E14-B002
  → impedir novos helpers opacos
  → novos componentes de HubSpot usam nomes e contratos semânticos

E14-B003
  → tornar instalação e CI determinísticos
  → obrigatório antes do AWS staging

E14-B004 + E14-B005
  → fechar a vertical funcional

E14-B006
  → eliminar runtime de teste sem consumidor
```

## Estado atual

```text
p0_open = 2
p1_open = 4
clean_replay_passed = true
schema_equivalence_passed = true
public_rpc_contracts_passed = true
backend_e2e_replayed = true
hubspot_authoritative_source_decided = true
hubspot_inventory_complete = false
hubspot_physical_model_approved = false
new_functional_migration_authorized = false
supabase_production_authorized = false
aws_staging_gate_required = true
```

A próxima atividade bloqueante é o inventário do sandbox HubSpot. Até lá, nenhuma migration funcional de formulário, arquétipo ou regra de ativação será criada.
