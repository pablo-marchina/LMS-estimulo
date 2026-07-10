# Delta de schema e autoridade de dados

**Versão:** 1.0  
**Data:** 2026-07-10  
**Status:** modelo lógico definido; materialização física HubSpot bloqueada pelo inventário da conta  
**DDL funcional HubSpot aplicado:** nenhum  
**DDL técnico aplicado:** M15a, exclusivamente para reduzir um helper legado

## Decisão superior

O ADR-003 estabelece:

```text
all_collected_business_data_persisted_in_hubspot = true
all_business_reads_have_hubspot_origin = true
postgresql_is_independent_user_data_authority = false
```

O HubSpot será a autoridade dos dados de formulário, respostas, arquétipos, políticas de classificação, resultados e regras de utilização. PostgreSQL permanece como plano técnico de idempotência, outbox, auditoria, reconciliação, cache com origem HubSpot e execução transitória.

## Estado técnico comprovado

```text
recovered_migration_count = 244
clean_replay_passed = true
schema_equivalence_passed = true
public_rpc_contracts_passed = true
backend_e2e_replayed = true
```

A M15a substituiu um helper privado opaco sem alterar os 18 RPCs públicos nem o comportamento comprovado pelo backend E2E. Ela não adiciona estrutura de produto e não antecipa o modelo físico do HubSpot.

O replay também encontrou dados de configuração existentes no Supabase fora do histórico original:

```text
4 diagnostic items
16 diagnostic options
2 path templates
2 path steps
29 canonical event schema identifiers
```

Esses registros são fixtures técnicas. Não representam a configuração oficial futura.

## Modelo lógico autoritativo

### Formulários

```text
FormDefinition
FormVersion
QuestionVersion
QuestionOptionVersion
FormSubmission
FormAnswer
```

Requisitos:

- rascunhos editáveis;
- versões publicadas imutáveis;
- submissões vinculadas à versão exata;
- respostas completas armazenadas no HubSpot;
- readback obrigatório antes de qualquer classificação;
- payload recebido pela aplicação nunca alimenta diretamente uma decisão de negócio.

### Arquétipos e classificação

```text
ArchetypeDefinition
ArchetypeVersion
ClassificationPolicyVersion
ArchetypeAssignment
```

Requisitos:

- quantidade e nomes sem hardcode;
- configuração inicial pode possuir quatro arquétipos;
- adição, retirada ou alteração gera nova versão;
- retirada operacional não apaga histórico;
- atribuição, recálculo e override criam registros append-only;
- cada resultado referencia os snapshots HubSpot usados;
- estado atual é projeção do histórico.

### Utilização dos resultados

```text
ActivationRuleVersion
ActivationExecution
```

Cada regra define dados de entrada, condições, contexto, ação, vigência e política de reprocessamento. Cada execução registra versões, decisão, ação, horário e resultado.

### Mapeamento e governança

```text
HubSpotFieldMappingVersion
DataUseDefinition
```

Todo dado coletado precisa de destino HubSpot. Todo dado utilizado precisa de finalidade e origem HubSpot comprovadas.

## Classificação das estruturas PostgreSQL existentes

### Diagnóstico e arquétipos

| Estrutura | Classificação | Regra |
|---|---|---|
| `diagnostic_definitions` | `TECHNICAL_REPLICA_OR_DEPRECATE` | não pode ser autoridade da definição usada |
| `diagnostic_versions` | `TECHNICAL_REPLICA_OR_DEPRECATE` | versão oficial deve vir do HubSpot |
| `items` / `item_options` | `TECHNICAL_REPLICA_OR_DEPRECATE` | somente cache HubSpot-sourced ou fixture |
| `sessions` / `responses` | `AUDIT_OR_TRANSIENT_ONLY` | respostas funcionais devem existir no HubSpot |
| `results` | `AUDIT_REPLICA_ONLY` | resultado oficial deve ser persistido e confirmado no HubSpot |
| `archetype_definitions` / `archetype_versions` | `TECHNICAL_REPLICA_OR_DEPRECATE` | configuração autoritativa no HubSpot |
| `archetype_assignments` | `AUDIT_REPLICA_ONLY` | histórico autoritativo no HubSpot; sem alteração destrutiva |

Nenhuma tabela será removida antes de migração, reconciliação e prova de que os consumidores usam a autoridade correta.

### Integração

| Estrutura | Classificação | Uso |
|---|---|---|
| `integration.connections` | `REUSE_AS_IS` | ambiente, scopes e referência de segredo |
| `mapping_definitions` / `mapping_versions` | `EXTEND_EXISTING` | mapeamento de dados coletados e utilizados |
| `external_object_mappings` | `EXTEND_EXISTING` | objetos de configuração e histórico HubSpot |
| `sync_jobs` / `sync_attempts` | `REUSE_AS_IS` | write, readback, retry, backoff e DLQ |
| `webhook_receipts` | `REUSE_AS_IS` | assinatura, replay e invalidação de cache |
| `conflicts` | `REUSE_AS_IS` | conflitos de versão e autoridade |
| `reconciliation_runs` / `reconciliation_items` | `REUSE_AS_IS` | comparação entre HubSpot e réplicas técnicas |

### Eventos e outbox

`eventing.events` e `eventing.outbox` permanecem como infraestrutura técnica. Nenhuma decisão pode depender exclusivamente do event store local. Fatos críticos precisam registrar o objeto HubSpot relacionado ou o estado `pending_hubspot`, seguido de readback e reconciliação.

## Linhagem HubSpot obrigatória

Toda réplica, cache ou evidência local de dado de negócio deverá carregar, direta ou indiretamente:

```text
hubspot_portal_id
hubspot_object_type
hubspot_object_id
hubspot_source_version
hubspot_updated_at
retrieved_at
source_snapshot_hash
cache_expires_at
readback_status
```

Sem origem completa ou com cache vencido, o dado não pode ser usado. Resultados também precisam ser persistidos e confirmados no HubSpot antes de usos posteriores.

## Fluxo funcional obrigatório

```text
carregar configuração do HubSpot
→ exibir formulário
→ receber respostas
→ persistir submissão e respostas no HubSpot
→ executar readback
→ carregar política e arquétipos do HubSpot
→ classificar usando somente snapshots confirmados
→ persistir atribuição no HubSpot
→ executar readback do resultado
→ carregar regras de ativação
→ executar ações configuradas
→ persistir execuções
→ registrar auditoria técnica, eventos e reconciliação
```

Quando o HubSpot estiver indisponível, os dados podem permanecer tecnicamente `pending_hubspot`, mas classificação e utilização ficam bloqueadas. Retry deve ser idempotente e payload transitório deve ser criptografado, minimizado e retido por período curto.

## Cutover do legado

Os componentes legados serão classificados semanticamente como:

```text
KEEP_AND_RENAME
REPLACE_BY_HUBSPOT_FLOW
DELETE_WITH_LEGACY_VERTICAL
PUBLIC_COMPATIBILITY_ONLY
```

Apenas componentes que permanecerão recebem novos nomes. Componentes substituídos serão removidos integralmente. Os 18 RPCs públicos legados permanecem apenas durante a compatibilidade necessária.

Baseline atual:

```text
legacy_function_count = 114
legacy_private_helper_count = 106
legacy_public_rpc_count = 8
```

## Bloqueio para o modelo físico

Antes de definir objetos e propriedades reais, é necessário inventariar plano contratado, hubs, sandbox, objetos, propriedades, associações, workflows, pipelines, autenticação, scopes, webhooks, limites de API, deduplicação e identificadores de contatos e empresas.

## Gates

```text
hubspot_inventory_complete = false
hubspot_physical_model_approved = false
all_collected_fields_have_hubspot_destination = false
all_business_reads_have_hubspot_origin = false
critical_writes_have_readback = false
hubspot_unavailable_blocks_business_use = true
hardcoded_archetype_count = false
legacy_cutover_classification_complete = false
schema_delta_final = false
new_functional_migration_authorized = false
```
