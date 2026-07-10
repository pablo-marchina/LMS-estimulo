# Registro de bloqueadores

**Versão:** 2.0  
**Data:** 2026-07-10  
**Status:** ativo

## Regras

- `P0` bloqueia expansão do runtime ou do schema afetado;
- `P1` deve ser resolvido antes do gate de release;
- encerramento exige prova executável e reproduzível;
- componentes destinados à remoção não são renomeados antes da decisão de cutover;
- toda escrita remota exige prova efêmera e autorização explícita.

## Bloqueadores ativos

| ID | Severidade | Área | Descrição | Critério de encerramento |
|---|---|---|---|---|
| `LEGACY-RPC-NAMING` | P0 | Manutenibilidade | 106 helpers privados e 8 RPCs públicos ainda possuem argumentos opacos | aliases eliminados do runtime retido e componentes substituídos removidos, preservando contratos durante a compatibilidade |
| `HUBSPOT-PHYSICAL-INTEGRATION` | P0 | Autoridade de dados | conta, modelo físico e adapter real ainda não foram inventariados ou testados | inventário completo, modelo físico aprovado, adapter real, matriz campo→HubSpot e E2E no sandbox |
| `BROWSER-ACCESSIBILITY` | P1 | Experiência | fluxo pelo navegador e acessibilidade não foram comprovados | E2E dos fluxos críticos com contas técnicas e auditoria de acessibilidade |
| `PRODUCT-CONFIGURATION` | P1 | Entradas de produto | formulário, configuração inicial dos arquétipos, conteúdo e direitos ainda não foram aprovados | entradas oficiais versionadas e aprovadas |
| `UNUSED-TEST-ADAPTERS` | P1 | Operação | `file-storage` e `file-scan-worker` estão ativos no Supabase de teste sem consumidor atual | integração comprovada ou remoção integral de função, scheduler, configuração, secrets e dependências |

## Gates encerrados

### Banco e runtime

```text
remote_migration_source_materialized = true
recovered_migration_count = 244
clean_replay_passed = true
schema_equivalence_passed = true
public_rpc_contracts_passed = true
backend_e2e_replayed = true
rls_negative_checks_passed = true
idempotency_and_concurrency_passed = true
events_and_outbox_passed = true
```

### Build e CI reproduzíveis

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

### Contenção inicial do legado

```text
legacy_database_surface_inventoried = true
legacy_function_count = 114
legacy_private_helper_count = 106
legacy_public_rpc_count = 8
opaque_helper_inventory_frozen = true
legacy_public_rpc_aliases_isolated = true
application_direct_alias_construction_allowed = false
new_opaque_database_helpers_allowed = false
first_semantic_replacement_applied_to_remote = true
first_semantic_replacement_materialized_in_git = true
public_rpc_count = 18
public_rpc_fingerprint_changed = false
backend_e2e_passed_after_replacement = true
physical_legacy_replacement_complete = false
```

A M15a substituiu `e14_close_activity_session(uuid)` por `e14_close_completed_activity_session(p_activity_session_id uuid)`. Esses nomes permanecem registrados porque fazem parte do histórico aplicado e da compatibilidade remota, não como identidade de novos componentes.

### Fundação independente do acesso ao HubSpot

```text
hubspot_gateway_contract_defined = true
hubspot_test_adapter_implemented = true
write_readback_use_gate_tested = true
raw_request_payload_used_for_business_decision = false
local_only_data_used_for_business_decision = false
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

## Estado atual

```text
p0_open = 2
p1_open = 3
clean_replay_passed = true
schema_equivalence_passed = true
public_rpc_contracts_passed = true
backend_e2e_replayed = true
reproducible_install_passed = true
semantic_naming_gate_enabled = true
legacy_cutover_classification_complete = false
opaque_helper_physical_replacement_complete = false
hubspot_authoritative_source_decided = true
hubspot_inventory_complete = false
hubspot_physical_model_approved = false
hubspot_real_adapter_implemented = false
new_functional_migration_authorized = false
supabase_production_authorized = false
aws_staging_gate_required = true
```
