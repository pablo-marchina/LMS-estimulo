# E14 — registro de bloqueadores

**Versão:** 1.0  
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
| E14-B004 | P1 | Browser E2E | fluxo pelo navegador e acessibilidade não foram comprovados | conclusão da vertical | E2E com contas técnicas e auditoria de acessibilidade |
| E14-B005 | P1 | Product inputs | conteúdo externo e configuração inicial dos arquétipos ainda não foram aprovados | implementação final | entradas oficiais versionadas e aprovadas |
| E14-B006 | P1 | Test adapters | storage/scan estão ativos no Supabase de teste sem consumidor atual | gate operacional | integrar com E2E ou remover integralmente função, scheduler e dependências |
| E14-B007 | P0 | HubSpot authority | contratos, adapter de teste, gate de origem e motor lógico configurável foram comprovados, mas a conta, o modelo físico e o adapter real ainda não foram inventariados | modelo físico, migrations dependentes do provider e ativação final | inventário completo, modelo físico aprovado, adapter real testado e matriz campo→HubSpot completa |

## Gates encerrados

### E14-B001 — Database/runtime

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

### E14-B003 — Build/CI reproduzível

```text
canonical_package_lock_present = true
lockfile_version = 3
package_manager = npm@10.9.2
registry_specific_resolved_urls = 0
web_ci_uses_npm_ci = true
clean_install_linux_passed = true
clean_install_windows_passed = true
lockfile_drift_check_enabled = true
```

O lockfile é validado pela governança e por um workflow matricial Ubuntu/Windows. Alterações em manifests sem atualização compatível do lockfile falham em `npm ci`.

### Subgate de integração independente de E14-B007

```text
hubspot_gateway_contract_defined = true
hubspot_test_adapter_implemented = true
write_readback_use_gate_tested = true
raw_request_payload_used_for_business_decision = false
local_only_data_used_for_business_decision = false
```

### Subgate de produto configurável independente de E14-B007

```text
configurable_form_contract_defined = true
variable_archetype_count_supported = true
published_configuration_required = true
classification_abstention_supported = true
fabricated_confidence_generated = false
assignment_history_append_only = true
recalculation_reads_existing_hubspot_submission = true
override_audited = true
activation_rules_versioned = true
activation_execution_persisted_in_hubspot = true
```

Esses subgates reduzem o trabalho bloqueado pelo acesso, mas não encerram E14-B007 porque ainda não provam a conta, os limites, os objetos nem a API reais.

## Dependências

```text
E14-B007
  → porta, adapter de teste e motor lógico = concluídos
  → inventariar a conta HubSpot
  → escolher objetos, propriedades, associações e eventos
  → implementar adapter real com write + readback
  → validar scopes, limites, webhooks e reconciliação
  → mapear contratos lógicos para o modelo físico
  → somente então autorizar migrations dependentes do provider

E14-B002
  → impedir novos helpers opacos
  → novos componentes usam nomes e contratos semânticos

E14-B004 + E14-B005
  → fechar a vertical funcional e validar a configuração oficial

E14-B006
  → eliminar runtime de teste sem consumidor
```

## Estado atual

```text
p0_open = 2
p1_open = 3
clean_replay_passed = true
schema_equivalence_passed = true
public_rpc_contracts_passed = true
backend_e2e_replayed = true
reproducible_install_passed = true
hubspot_authoritative_source_decided = true
hubspot_gateway_contract_defined = true
hubspot_test_adapter_implemented = true
write_readback_use_gate_tested = true
configurable_product_engine_implemented = true
configurable_product_engine_tested = true
hubspot_inventory_complete = false
hubspot_physical_model_approved = false
hubspot_real_adapter_implemented = false
new_functional_migration_authorized = false
supabase_production_authorized = false
aws_staging_gate_required = true
```

Enquanto não houver acesso, o desenvolvimento pode avançar sobre interface administrativa local, preview sintético, browser E2E, acessibilidade e contenção dos helpers opacos. Nenhuma propriedade, object type ID, associação ou migration dependente do modelo físico será inventada.
