# E14 — registro de bloqueadores

**Versão:** 0.4  
**Data:** 2026-07-10  
**Status:** Ativo

## Regras

- `P0` bloqueia mudanças que ampliem o runtime ou o schema afetado;
- `P1` deve ser resolvido antes do gate de release;
- este documento é a fonte única dos bloqueadores técnicos do E14;
- criar issue separada somente quando houver trabalho independente, responsável próprio ou ciclo de vida diferente;
- PR substituído deve ser fechado e branch deve ser excluído;
- encerramento exige prova executável e reproduzível.

## Bloqueadores

| ID | Severidade | Área | Descrição | Rastreamento | Bloqueia | Critério de encerramento |
|---|---|---|---|---|---|---|
| E14-B001 | P0 | Database/runtime | As 243 migrations M00–M14 foram recuperadas, validadas, reproduzidas do zero e comparadas estruturalmente com o Supabase de teste; contratos públicos e backend E2E ainda não foram comprovados | `RUNTIME_GAP_E14.md`, três manifests e `e14-clean-replay.yml` | novas migrations funcionais | contratos públicos, backend E2E, RLS negativo, idempotência e concorrência comprovados |
| E14-B002 | P0 | Maintainability | helpers privados E14 possuem nomes opacos e aliases extensos | `RUNTIME_GAP_E14.md` | expansão do padrão | contratos públicos congelados e substituição incremental comprovada |
| E14-B003 | P1 | Build/CI | não existe lockfile npm canônico | `README.md` e CI | instalação totalmente reproduzível | `package-lock.json`, `npm ci` e instalação limpa Windows/Linux |
| E14-B004 | P1 | Browser E2E | fluxo real pelo navegador e acessibilidade não foram comprovados | plano E14 | conclusão da vertical | E2E com contas técnicas e auditoria de acessibilidade |
| E14-B005 | P1 | Product inputs | quatro arquétipos, conteúdo externo e inventário HubSpot ainda não estão materializados | matriz E14 | implementação final | entradas oficiais versionadas e aprovadas |
| E14-B006 | P1 | Test adapters | storage/scan estão ativos no Supabase de teste sem uso funcional atual | runtime de teste | gate operacional | integrar ao produto com E2E ou remover integralmente função, scheduler e dependências por migration reconciliada |

## Dependências

```text
E14-B001
  → histórico remoto integral está no Git
  → replay limpo e equivalência estrutural passaram
  → contratos públicos e backend E2E continuam obrigatórios
  → somente depois libera o delta final de schema e novas migrations

E14-B002
  → impede ampliação da dívida técnica
  → é tratado incrementalmente depois de congelar os contratos públicos

E14-B003
  → torna instalação e CI determinísticos
  → é obrigatório antes do AWS staging

E14-B004 + E14-B005
  → fecham a vertical funcional

E14-B006
  → elimina runtime de teste sem consumidor
  → não pode ser resolvido por simples desativação documental
```

## Estado atual

```text
p0_open = 2
p1_open = 4
remote_migration_source_materialized = true
recovered_migration_count = 243
clean_replay_passed = true
schema_equivalence_passed = true
public_rpc_contracts_passed = false
backend_e2e_replayed = false
new_functional_migration_authorized = false
supabase_production_authorized = false
aws_staging_gate_required = true
```
