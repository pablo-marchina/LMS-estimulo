# E14 — registro de bloqueadores

**Versão:** 1.4  
**Data:** 2026-07-10  
**Status:** Ativo

## Regras

- `P0` bloqueia mudanças que ampliem o runtime ou o schema afetado;
- `P1` deve ser resolvido antes do gate de release;
- encerramento exige prova executável e reproduzível;
- decisões explícitas posteriores prevalecem sobre arquitetura anterior;
- não se renomeia componente destinado à remoção: primeiro se define o estado de cutover;
- toda escrita remota exige prova efêmera e autorização explícita.

## Bloqueadores ativos

| ID | Severidade | Área | Descrição | Bloqueia | Critério de encerramento |
|---|---|---|---|---|---|
| E14-B002 | P0 | Maintainability | 106 helpers privados e 8 RPCs públicos ainda possuem argumentos opacos; a primeira substituição física já foi aplicada e reconciliada | criação de novos aliases opacos e expansão do legado | aliases eliminados do runtime retido e componentes substituídos removidos integralmente, sem quebra dos 18 RPCs durante a compatibilidade, resultados, eventos ou outbox |
| E14-B004 | P1 | Browser E2E | fluxo pelo navegador e acessibilidade não foram comprovados | conclusão da experiência navegável | E2E dos fluxos críticos com contas técnicas e auditoria de acessibilidade; a integração real HubSpot permanece em E14-B007 |
| E14-B005 | P1 | Product inputs | conteúdo externo, formulário e configuração inicial dos arquétipos ainda não foram aprovados | implementação final e conteúdo real | entradas oficiais, direitos, versões e critérios de aceitação aprovados |
| E14-B006 | P1 | Test adapters | storage/scan estão ativos no Supabase de teste sem consumidor atual | gate operacional | integrar com E2E ou remover integralmente função, scheduler, configuração, secrets e dependências |
| E14-B007 | P0 | HubSpot authority | contratos, adapter de teste, gate de origem e motor lógico configurável foram comprovados, mas a conta, o modelo físico e o adapter real ainda não foram inventariados | modelo físico, migrations dependentes do provider e ativação final | inventário completo, modelo físico aprovado, adapter real testado, matriz campo→HubSpot completa e E2E no sandbox |

## Gates encerrados

### E14-B001 — Database/runtime

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

### Subgate de contenção e primeira redução de E14-B002

```text
legacy_database_surface_inventoried = true
legacy_function_count = 114
legacy_private_helper_count = 106
legacy_public_rpc_count = 8
opaque_helper_inventory_frozen = true
legacy_public_rpc_aliases_isolated = true
application_direct_alias_construction_allowed = false
new_opaque_database_helpers_allowed = false
first_semantic_replacement_selected = true
first_semantic_replacement_applied_to_remote = true
first_semantic_replacement_materialized_in_git = true
public_rpc_count = 18
public_rpc_fingerprint_changed = false
backend_e2e_passed_after_replacement = true
physical_legacy_replacement_complete = false
```

A M15a substitui `e14_close_activity_session(uuid)` por `e14_close_completed_activity_session(p_activity_session_id uuid)`, redireciona seu único consumidor e remove o helper antigo. O Supabase de desenvolvimento/teste, o histórico Git e o replay limpo agora representam o mesmo estado.

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
E14-B002
  → inventário e bloqueio de expansão = concluídos
  → fronteira semântica dos oito RPCs públicos = concluída
  → primeira substituição física aplicada e reconciliada
  → classificar os 114 componentes em KEEP / REPLACE / DELETE / COMPATIBILITY
  → não renomear componentes destinados à exclusão
  → preparar ondas por componente com risco e cobertura mensurados
  → provar cada onda no PostgreSQL efêmero
  → obter autorização explícita antes de cada escrita remota
  → remover aliases do runtime retido e eliminar componentes substituídos

E14-B006
  → inventariar consumidores, schedulers, secrets e dependências
  → integrar se existir caso de uso comprovado
  → caso contrário, preparar remoção integral
  → obter autorização antes da exclusão remota
  → reconciliar Git e Supabase

E14-B004
  → integrar motor configurável à aplicação usando adapter de teste
  → browser E2E dos fluxos administrativos, participante e operação
  → auditoria de acessibilidade
  → registrar interações e usos de dados

E14-B005
  → preparar contrato de conteúdo e adapter sintético
  → obter formulário, quatro arquétipos iniciais, conteúdo e direitos aprovados
  → versionar entradas oficiais

E14-B007
  → porta, adapter de teste e motor lógico = concluídos
  → inventariar a conta HubSpot
  → escolher objetos, propriedades, associações e eventos
  → implementar adapter real com write + readback
  → validar scopes, limites, webhooks e reconciliação
  → mapear contratos lógicos para o modelo físico
  → executar cutover e E2E no sandbox
  → somente então autorizar migrations dependentes do provider
```

## Ordem operacional vigente

```text
1. atualizar o plano de ação
2. classificar o legado e definir o mapa de cutover
3. auditar storage/scan e preparar integração ou remoção
4. integrar o motor configurável às interfaces
5. executar browser E2E, acessibilidade e registros de interação/uso
6. preparar conteúdo externo e coletar entradas oficiais
7. quando houver acesso, concluir o fluxo HubSpot real
8. provar AWS staging
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
opaque_helper_containment_passed = true
first_semantic_helper_applied_to_remote = true
first_semantic_helper_materialized_in_git = true
legacy_cutover_classification_complete = false
opaque_helper_physical_replacement_complete = false
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

Enquanto não houver acesso ao HubSpot, o desenvolvimento avança sobre classificação e remoção do legado, interface administrativa, preview sintético, browser E2E, acessibilidade, registro de interações e conteúdo provider-agnostic. Novas escritas remotas continuam exigindo autorização explícita.