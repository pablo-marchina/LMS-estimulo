# E14 — registro de bloqueadores

**Versão:** 0.6  
**Data:** 2026-07-10  
**Status:** Ativo

## Regras

- `P0` bloqueia mudanças que ampliem o runtime ou o schema afetado;
- `P1` deve ser resolvido antes do gate de release;
- este documento é a fonte única dos bloqueadores técnicos do E14;
- criar issue separada somente quando houver trabalho independente, responsável próprio ou ciclo de vida diferente;
- encerramento exige prova executável e reproduzível.

## Bloqueadores ativos

| ID | Severidade | Área | Descrição | Rastreamento | Bloqueia | Critério de encerramento |
|---|---|---|---|---|---|---|
| E14-B002 | P0 | Maintainability | helpers privados E14 possuem nomes opacos e aliases extensos | `RUNTIME_GAP_E14.md`, contratos públicos e E2E congelados | expansão do padrão opaco | substituição incremental comprovada sem quebra de resultados, eventos, outbox ou dos 18 contratos públicos |
| E14-B003 | P1 | Build/CI | não existe lockfile npm canônico | `README.md` e CI | instalação totalmente reproduzível | `package-lock.json`, `npm ci` e instalação limpa Windows/Linux |
| E14-B004 | P1 | Browser E2E | fluxo real pelo navegador e acessibilidade não foram comprovados | plano E14 | conclusão da vertical | E2E com contas técnicas e auditoria de acessibilidade |
| E14-B005 | P1 | Product inputs | quatro arquétipos, conteúdo externo e inventário HubSpot ainda não estão materializados | matriz E14 | implementação final | entradas oficiais versionadas e aprovadas |
| E14-B006 | P1 | Test adapters | storage/scan estão ativos no Supabase de teste sem uso funcional atual | runtime de teste | gate operacional | integrar ao produto com E2E ou remover integralmente função, scheduler e dependências por migration reconciliada |

## Gate encerrado

`E14-B001 — Database/runtime` foi encerrado porque:

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

Evidência: [E14_BACKEND_E2E.md](E14_BACKEND_E2E.md).

## Dependências

```text
E14-B002
  → impede ampliar helpers e aliases opacos
  → o próximo passo é concluir o delta final de schema
  → novas capacidades devem usar nomes semânticos e preservar contratos

E14-B003
  → torna instalação e CI determinísticos
  → obrigatório antes do AWS staging

E14-B004 + E14-B005
  → fecham a vertical funcional

E14-B006
  → elimina runtime de teste sem consumidor
  → exige integração real ou remoção integral
```

## Estado atual

```text
p0_open = 1
p1_open = 4
clean_replay_passed = true
schema_equivalence_passed = true
public_rpc_contracts_passed = true
backend_e2e_replayed = true
new_functional_migration_authorized = false
supabase_production_authorized = false
aws_staging_gate_required = true
```

A nova migration funcional continua bloqueada até a conclusão do delta final de schema e a comprovação de que a mudança não amplia o padrão opaco de E14-B002.
