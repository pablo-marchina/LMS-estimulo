# E14 — Delta final de schema e autoridade de dados

**Versão:** 0.3  
**Data:** 2026-07-10  
**Status:** Modelo lógico definido; materialização física HubSpot bloqueada por inventário do sandbox  
**DDL aplicado nesta etapa:** nenhum

## 1. Decisão superior

O ADR-003 estabelece:

```text
all_collected_business_data_persisted_in_hubspot = true
all_business_reads_have_hubspot_origin = true
postgresql_is_independent_user_data_authority = false
```

Consequentemente, o delta não criará um novo subsistema PostgreSQL canônico para formulário, respostas, arquétipos ou regras de uso. O HubSpot será a autoridade desses dados.

## 2. Estado técnico comprovado

```text
recovered_migration_count = 243
clean_replay_passed = true
schema_equivalence_passed = true
public_rpc_contracts_passed = true
backend_e2e_replayed = true
```

O replay também comprovou configurações existentes no Supabase fora do histórico de migrations:

```text
4 diagnostic items
16 diagnostic options
2 path templates
2 path steps
29 canonical event schema identifiers
```

Esses dados não podem ser tratados como configuração oficial futura. Permanecem apenas como fixtures técnicas até classificação e migração explícita para o HubSpot.

## 3. Modelo lógico autoritativo no HubSpot

O modelo físico dependerá das capacidades reais da conta, mas o modelo lógico mínimo é obrigatório.

### 3.1 Formulário

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
- perguntas e opções associadas à versão;
- submissão vinculada à versão exata;
- respostas completas armazenadas no HubSpot;
- readback obrigatório antes da classificação;
- nenhuma resposta recebida diretamente da requisição alimenta decisão de negócio.

### 3.2 Arquétipos e classificação

```text
ArchetypeDefinition
ArchetypeVersion
ClassificationPolicyVersion
ArchetypeAssignment
```

Requisitos:

- quantidade de arquétipos sem limite hardcoded;
- configuração inicial pode possuir quatro;
- adição ou retirada cria nova versão da política;
- retirada operacional não apaga histórico;
- cada atribuição, recálculo ou override cria novo registro;
- evidência e snapshots HubSpot usados ficam vinculados ao resultado;
- estado atual é uma projeção do histórico.

### 3.3 Utilização dos resultados

```text
ActivationRuleVersion
ActivationExecution
```

Cada regra define:

- dados HubSpot de entrada;
- condições;
- contexto de uso;
- ação;
- período de vigência;
- política de reprocessamento;
- versão e status.

Cada execução registra os IDs e versões HubSpot usados, decisão, ação, horário e resultado.

### 3.4 Mapeamento e governança

```text
HubSpotFieldMappingVersion
DataUseDefinition
```

Todo dado coletado deve possuir destino HubSpot. Todo dado utilizado deve possuir finalidade e origem HubSpot.

## 4. Classificação das estruturas PostgreSQL existentes

### 4.1 Diagnóstico e arquétipos

| Estrutura | Nova classificação | Regra |
|---|---|---|
| `diagnostic_definitions` | `TECHNICAL_REPLICA_OR_DEPRECATE` | não pode ser autoridade da definição usada |
| `diagnostic_versions` | `TECHNICAL_REPLICA_OR_DEPRECATE` | versão oficial deve vir do HubSpot |
| `items` / `item_options` | `TECHNICAL_REPLICA_OR_DEPRECATE` | somente cache HubSpot-sourced ou fixture |
| `sessions` / `responses` | `AUDIT_OR_TRANSIENT_ONLY` | respostas funcionais devem existir no HubSpot; leitura local não alimenta decisão |
| `results` | `AUDIT_REPLICA_ONLY` | resultado oficial deve ser persistido e confirmado no HubSpot |
| `archetype_definitions` / `archetype_versions` | `TECHNICAL_REPLICA_OR_DEPRECATE` | configuração autoritativa no HubSpot |
| `archetype_assignments` | `AUDIT_REPLICA_ONLY` | histórico autoritativo no HubSpot; sem update/delete destrutivo |

Nenhuma dessas tabelas será removida antes de existir migração, reconciliação e prova de que todos os consumidores usam HubSpot.

### 4.2 Integração

| Estrutura | Classificação | Delta |
|---|---|---|
| `integration.connections` | `REUSE_AS_IS` | conexão, ambiente, scopes e referência de segredo |
| `mapping_definitions` / `mapping_versions` | `EXTEND_EXISTING` | mapear todos os dados coletados e utilizados |
| `external_object_mappings` | `EXTEND_EXISTING` | suportar objetos de configuração e histórico HubSpot |
| `sync_jobs` / `sync_attempts` | `REUSE_AS_IS` | write, readback, retry, backoff e DLQ |
| `webhook_receipts` | `REUSE_AS_IS` | assinatura, replay e invalidação de cache |
| `conflicts` | `REUSE_AS_IS` | conflito de versão e autoridade |
| `reconciliation_runs` / `reconciliation_items` | `REUSE_AS_IS` | comparar HubSpot com réplicas técnicas |

### 4.3 Eventos e outbox

`eventing.events` e `eventing.outbox` permanecem como plano técnico. Porém:

- qualquer fato de usuário usado por uma função deverá ser materializado no HubSpot;
- nenhuma decisão poderá depender exclusivamente do event store local;
- o evento técnico deve registrar o objeto HubSpot resultante ou o estado `pending_hubspot`;
- readback e reconciliação são obrigatórios para fatos críticos.

## 5. Linhagem HubSpot obrigatória

Toda réplica, cache ou evidência local de dado de negócio deverá conter, direta ou indiretamente:

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

Regras:

- sem origem completa, o dado não pode ser usado;
- cache expirado não pode alimentar decisão;
- alteração local independente é proibida;
- cada decisão registra os snapshots usados;
- resultados são persistidos no HubSpot e confirmados antes de usos posteriores.

## 6. Fluxo funcional obrigatório

```text
1. carregar FormVersion do HubSpot
2. exibir formulário
3. receber respostas
4. persistir FormSubmission e FormAnswer no HubSpot
5. executar readback
6. carregar ClassificationPolicyVersion e ArchetypeVersion do HubSpot
7. classificar usando somente snapshots HubSpot
8. persistir ArchetypeAssignment no HubSpot
9. executar readback do resultado
10. carregar ActivationRuleVersion do HubSpot
11. executar usos configurados
12. persistir ActivationExecution no HubSpot
13. registrar auditoria técnica, eventos e reconciliação
```

## 7. Indisponibilidade

Quando HubSpot estiver indisponível:

- dados podem permanecer tecnicamente `pending_hubspot`;
- payload transitório deve ser criptografado e ter retenção curta;
- classificação e uso ficam bloqueados;
- retry é idempotente;
- o estado `submitted` somente ocorre após write + readback;
- nenhuma cópia local pendente pode alimentar decisão.

## 8. Manutenibilidade

O P0 E14-B002 permanece:

- não ampliar helpers opacos;
- novos componentes usam nomes semânticos;
- os 18 RPCs públicos atuais permanecem congelados até uma transição explícita;
- adapter HubSpot, repositórios de leitura, cache e orquestração devem possuir contratos próprios;
- a nova arquitetura não será implementada como condicionais por nome ou quantidade de arquétipo.

## 9. Bloqueio para modelo físico

Antes de definir objetos e propriedades reais, é necessário inventariar:

```text
HubSpot account tier and hubs
sandbox/test account
existing standard and custom objects
app objects availability
existing properties and property limits
associations
workflows and pipelines
private app or OAuth model
scopes
webhook capabilities
API limits
existing deduplication rules
contact/company identifiers
```

O HubSpot recomenda batch e cache para reduzir chamadas e webhooks para receber alterações. A estratégia concreta depende dos limites da conta.

## 10. Gates

```text
hubspot_inventory_complete = false
hubspot_physical_model_approved = false
all_collected_fields_have_hubspot_destination = false
all_business_reads_have_hubspot_origin = false
critical_writes_have_readback = false
hubspot_unavailable_blocks_business_use = true
hardcoded_archetype_count = false
schema_delta_final = false
new_functional_migration_authorized = false
```

## 11. Próxima sequência

```text
inventariar sandbox HubSpot
→ escolher custom objects, app objects, propriedades, associações e eventos
→ definir modelo físico e scopes
→ definir contratos do adapter e do cache HubSpot-sourced
→ atualizar interaction/data-use registry
→ concluir delta final
→ definir migrations técnicas mínimas de linhagem e integração
→ implementar write + readback do formulário
→ implementar classificação HubSpot-sourced
→ implementar regras de ativação HubSpot-sourced
```
