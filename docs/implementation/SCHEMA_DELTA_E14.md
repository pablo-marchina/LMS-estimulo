# E14-R1 — Delta de schema e runtime

**Versão:** 0.2  
**Data:** 2026-07-09  
**Status:** PARTIAL — delta estrutural identificado; nova migration bloqueada  
**Ambiente inspecionado:** Supabase de desenvolvimento/teste `cfpfeavjlgheqqiaqtzv`  
**DDL aplicado nesta etapa:** nenhum

## 1. Objetivo

Determinar o que deve ser reutilizado, estendido ou recuperado antes de criar qualquer nova migration funcional. Esta análise segue o `Estimulo_all`, o ADR-002 e a regra de que Supabase é somente desenvolvimento/teste; estruturas aprovadas devem permanecer PostgreSQL-portáveis e ser validadas no AWS staging.

## 2. Bloqueio P0 de fonte de verdade

O runtime remoto contém 165 versões M13, totalizando 123.636 bytes de SQL, que não estão integralmente versionadas no Git. Também existem nove versões temporárias de transporte/exportação e duas versões M14.

Os identificadores M14 divergem:

| Capacidade | Supabase | Git |
|---|---|---|
| Application read surfaces | `20260709183504` | `20260709183000` |
| Operator workspace | `20260709184749` | `20260709184500` |

Consequências:

- o Git ainda não reconstrói o backend E14 comprovado;
- não existe replay limpo equivalente ao ambiente testado;
- migrations locais M14 podem ser interpretadas como ainda não aplicadas;
- a portabilidade para AWS não está provada;
- nova DDL ampliaria uma baseline não reproduzível.

O plano completo está em `RUNTIME_GAP_E14.md`.

```text
new_functional_migration_authorized = false
```

## 3. Evidência do ambiente de teste

### 3.1 Dados atuais

| Relação | Linhas |
|---|---:|
| `diagnostics.diagnostic_definitions` | 1 |
| `diagnostics.diagnostic_versions` | 1 |
| `diagnostics.items` | 4 |
| `diagnostics.item_options` | 16 |
| `diagnostics.sessions` | 1 |
| `diagnostics.responses` | 4 |
| `diagnostics.results` | 1 |
| `diagnostics.archetype_definitions` | 0 |
| `diagnostics.archetype_versions` | 0 |
| `diagnostics.archetype_assignments` | 0 |
| `catalog.content_assets` | 0 |
| `integration.connections` | 0 |
| `integration.mapping_definitions` | 0 |
| `integration.sync_jobs` | 0 |
| `eventing.events` | 39 |
| `eventing.outbox` | 39 |

Não há dados de arquétipo, conteúdo ou HubSpot a migrar atualmente. Mudanças aditivas continuam exigindo replay e compatibilidade.

### 3.2 Controles confirmados

Todas as 24 tabelas auditadas possuem RLS. Também foram confirmados:

- imutabilidade de `diagnostic_versions` publicados;
- proteção de `items` e `item_options` quando a versão está publicada;
- `responses` append-only;
- revisão única por `(session_id, item_id, revision)`;
- no máximo uma sessão `in_progress` por `journey_instance_id`;
- `events` append-only com redaction/hash;
- versão agregada única em eventos;
- rota única por `(event_id, route_key)` na outbox;
- idempotency key única em `integration.sync_jobs`;
- tentativas de sincronização append-only;
- mappings e integrações versionados.

Esses controles devem ser preservados.

## 4. Classificação final por capacidade

### 4.1 Formulário e respostas

| Estrutura | Classificação | Evidência | Delta necessário |
|---|---|---|---|
| `diagnostic_definitions` | `REUSE_AS_IS` | definição por organização, código, finalidade e status | nenhum |
| `diagnostic_versions` | `EXTEND_EXISTING` | versão, configuração, hash e trigger de imutabilidade já existem | permitir ciclo draft/publicação consistente; `published_at` não deve ser obrigatório em draft |
| `items` | `REUSE_AS_IS` | versão, tipo, prompt, configuração, posição e obrigatoriedade | validar tipos do formulário oficial |
| `item_options` | `REUSE_AS_IS` | código, label, valor e posição por item | armazenar regra/peso em configuração versionada, sem hardcode |
| `sessions` | `REUSE_AS_IS` | versão, empreendedor, jornada, estado e optimistic concurrency | formalizar estados e política de retomada nos comandos |
| `responses` | `REUSE_AS_IS` | append-only, revision, supersessão, tempo e evento de origem | validar cadeia de revisão e idempotência no RPC |
| `results` | `EXTEND_EXISTING` | resultado por sessão e versão de cálculo | ligação explícita ao resultado de arquétipo e evidência de cálculo |

**Decisão:** não criar `forms`, `form_versions`, `answers` ou subsistema paralelo.

### 4.2 Quatro arquétipos

| Estrutura | Classificação | Evidência | Delta necessário |
|---|---|---|---|
| `archetype_definitions` | `REUSE_AS_IS` | definição configurável por organização; código único | cadastrar exatamente quatro definições ativas quando os nomes oficiais forem fornecidos |
| `archetype_versions` | `EXTEND_EXISTING` | versão, referência de modelo, status e publicação | configuração versionada, hash, mensagens, critérios, associações de trilha e imutabilidade após publicação |
| `archetype_assignments` | `EXTEND_EXISTING` | empreendedor, jornada, versão e probabilidades | origem, justificativa, evidência, tipo, autor, supersessão, override e evento de origem |

Problema confirmado: `archetype_assignments` permite `UPDATE` e `DELETE` por worker e não possui trigger append-only. Isso contradiz histórico, recálculo e override auditável.

Direção obrigatória:

- cada atribuição, recálculo ou override cria uma nova linha;
- atribuições anteriores nunca são sobrescritas;
- uma cadeia `supersedes_assignment_id` preserva a evolução;
- o estado atual é uma projeção da cadeia;
- o RPC serializa concorrência e grava estado, evento e outbox atomicamente;
- probabilidade/confiança permanece nula quando o método real não a sustentar.

Campos candidatos, ainda sujeitos ao formulário oficial:

```text
diagnostic_session_id
diagnostic_result_id
assignment_strategy
assignment_reason
evidence_snapshot
assigned_by_user_account_id
supersedes_assignment_id
override_reason
source_event_id
created_at
```

Não adicionar `effective_to` se ele exigir mutação da linha histórica; preferir cadeia append-only e projeção atual.

### 4.3 Conteúdo próprio e de terceiros

| Estrutura | Classificação | Evidência | Delta necessário |
|---|---|---|---|
| `catalog.content_assets` | `EXTEND_EXISTING` | exige exatamente um entre arquivo e URL externa; posição única por atividade | provider, direitos, embed, tracking, disponibilidade, conclusão e fallback |

Campos candidatos:

```text
ownership_type
provider
external_id
canonical_url
embed_policy
rights_status
license_reference
availability_status
tracking_capabilities jsonb
completion_policy jsonb
fallback_configuration jsonb
metadata_version
```

Antes da DDL, verificar se metadados equivalentes existem em outra estrutura do catálogo. A primeira integração usará um único provedor real autorizado.

### 4.4 Eventos e outbox

| Estrutura | Classificação | Evidência | Delta necessário |
|---|---|---|---|
| `eventing.event_schemas` | `REUSE_AS_IS` | schema, versão, hash e publicação | registrar novos contratos |
| `eventing.events` | `REUSE_AS_IS` | append-only, contexto, ordenação, correlação, privacidade e redaction | nenhum delta estrutural previsto |
| `eventing.outbox` | `REUSE_AS_IS` | rota, disponibilidade, claim, tentativa e erro | nenhum delta estrutural previsto |

Novos contratos necessários:

```text
diagnostic.answer_revised
diagnostic.archetype_assigned
diagnostic.archetype_recalculated
diagnostic.archetype_overridden
content.opened
content.started
content.progress_observed
content.completed
integration.hubspot_projection_requested
integration.hubspot_projection_succeeded
integration.hubspot_projection_failed
integration.hubspot_reconciled
```

Nomes finais devem ser reconciliados com o catálogo canônico antes de publicação.

### 4.5 HubSpot e integrações

| Estrutura | Classificação | Evidência | Delta necessário |
|---|---|---|---|
| `integration.connections` | `REUSE_AS_IS` | provider, ambiente, segredo por referência e configuração | conexão real após sandbox/scopes |
| `mapping_definitions` / `mapping_versions` | `REUSE_AS_IS` | mapping versionado com schema e hash | materializar matriz User 360 |
| `external_object_mappings` | `REUSE_AS_IS` | vínculo interno/externo | nenhum delta inicial |
| `sync_jobs` / `sync_attempts` | `REUSE_AS_IS` | idempotência, scheduling, tentativas e erros | adapter, worker, backoff e política de DLQ |
| `conflicts` | `REUSE_AS_IS` | conflito por campo e resolução | autoridade por campo |
| `reconciliation_runs` / `reconciliation_items` | `REUSE_AS_IS` | readback e diferenças | implementação real |
| `webhook_receipts` | `REUSE_AS_IS` | assinatura, replay, hash e normalização | ativar somente com necessidade real |

**Decisão:** HubSpot não exige novo subsistema de persistência. A lacuna principal é adapter, configuração, projeção e operação.

## 5. Lacuna de manutenibilidade das funções

O runtime remoto contém helpers internos com nomes opacos, como:

```text
e14_apply_a
e14_exec_c
e14_write_c3
e14_q1
e14_q2
```

Nenhuma nova capacidade será implementada ampliando esse padrão.

Depois de restaurar a fonte de verdade:

1. manter RPCs públicos estáveis;
2. criar helpers semânticos por contexto;
3. migrar um caso de uso por vez;
4. provar equivalência de estado, evento e outbox;
5. remover aliases somente após análise de dependência.

A refatoração não será misturada em um big bang com a implementação dos arquétipos.

## 6. Sequência corrigida

```text
recuperar as 165 migrations M13 e os IDs exatos M14
→ construir manifest com hashes
→ executar replay em PostgreSQL limpo
→ comparar schema e contratos públicos
→ mapear ações das seis rotas
→ concluir delta final
→ definir a próxima migration funcional
→ implementar arquétipos e conteúdo externo
```

A próxima migration não será chamada antecipadamente de M15. A numeração será decidida após reconciliação do histórico.

## 7. Gaps que não exigem tabelas novas

- formulário usa `diagnostic_*`, `items`, `item_options`, `sessions` e `responses`;
- arquétipos estendem as três tabelas existentes;
- HubSpot usa o schema `integration` existente;
- eventos usam `event_schemas`, `events` e `outbox`;
- AWS reutiliza as mesmas migrations PostgreSQL por adapters de infraestrutura.

## 8. Próximas provas

1. exportar statements M13/M14 do histórico remoto;
2. criar manifest de versões, tamanhos e hashes;
3. reconciliar carriers locais com timestamps remotos;
4. executar replay limpo;
5. comparar tabelas, colunas, constraints, índices, triggers, policies e funções;
6. congelar contratos dos RPCs públicos;
7. mapear as ações atuais de `apps/web` para o registro de interações;
8. receber formulário, quatro arquétipos, conteúdo externo e inventário HubSpot oficiais;
9. atualizar este documento para v0.3 e autorizar ou rejeitar a migration funcional.

## 9. Status do gate E14-R1

```text
remote_schema_inventory_complete = true
critical_constraints_reviewed = true
critical_indexes_reviewed = true
critical_triggers_reviewed = true
critical_rls_reviewed = true
remote_runtime_versions_missing_locally = 165
m14_version_identifiers_match = false
clean_replay_passed = false
schema_equivalence_passed = false
new_ddl_applied = false
parallel_subsystems_created = false
schema_delta_final = false
new_functional_migration_authorized = false
```
