# E14-R1 — Delta inicial de schema e runtime

**Versão:** 0.1  
**Data:** 2026-07-09  
**Status:** PARTIAL — auditoria remota iniciada  
**Ambiente inspecionado:** Supabase de desenvolvimento/teste `cfpfeavjlgheqqiaqtzv`  
**DDL aplicado nesta etapa:** nenhum

## 1. Objetivo

Determinar o que pode ser reutilizado antes de criar a próxima migration. Esta análise segue o `Estimulo_all`, o ADR-002 e a regra de que Supabase é somente desenvolvimento/teste; qualquer estrutura aprovada deverá permanecer PostgreSQL-portável e ser validada posteriormente no AWS staging.

## 2. Evidência inspecionada

A inspeção read-only do banco confirmou estruturas existentes nas áreas:

- `diagnostics`;
- `catalog`;
- `eventing`;
- `integration`.

Contagens observadas no ambiente de teste:

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

Não há dados de arquétipo, conteúdo ou conexão HubSpot a migrar nesse ambiente neste momento. Isso reduz o risco de extensão aditiva, mas não elimina a obrigação de preservar compatibilidade e replay limpo.

## 3. Classificação por capacidade

### 3.1 Formulário e respostas

| Estrutura | Classificação | Evidência | Delta provável |
|---|---|---|---|
| `diagnostic_definitions` | `REUSE_AS_IS` | definição possui organização, código, nome, finalidade e status | nenhum inicialmente |
| `diagnostic_versions` | `EXTEND_EXISTING` | já possui versão, status, configuração, publicação e hash | confirmar suporte formal a draft/cloning e publicação imutável por constraints/RPCs |
| `items` | `REUSE_AS_IS` | itens pertencem à versão e possuem tipo, prompt, configuração, posição e obrigatoriedade | validar tipos necessários do formulário real |
| `item_options` | `REUSE_AS_IS` | opções pertencem ao item e são ordenadas | validar regra de pesos/mapeamento sem hardcode |
| `sessions` | `EXTEND_EXISTING` | sessão preserva versão, empreendedor, jornada, estado e aggregate version | avaliar `submitted_at`, política de retomada e vínculo explícito à revisão final |
| `responses` | `REUSE_AS_IS` | revisão, valor, tempo, supersessão e evento de origem já existem | formalizar constraints de cadeia e idempotência nos novos comandos |
| `results` | `EXTEND_EXISTING` | resultado preserva sessão, versão de cálculo, qualidade e timestamp | falta ligação explícita ao resultado de arquétipo e histórico de recalculação |

**Conclusão:** o núcleo de formulário já existe. Não criar tabelas paralelas `forms`, `form_versions`, `answers` ou equivalentes antes de provar uma lacuna não coberta.

### 3.2 Quatro arquétipos

| Estrutura | Classificação | Evidência | Delta provável |
|---|---|---|---|
| `archetype_definitions` | `REUSE_AS_IS` | definição configurável por organização com código, nome, descrição e status | popular exatamente quatro definições ativas somente quando nomes oficiais forem fornecidos |
| `archetype_versions` | `EXTEND_EXISTING` | versão, referência de modelo, status, validação e publicação | falta configuração versionada de regras, pesos, mensagens e associações de trilha |
| `archetype_assignments` | `EXTEND_EXISTING` | preserva empreendedor, jornada, versão de modelo, arquétipos e probabilidades | faltam sessão/resultado de origem, justificativa, evidências, motivo/tipo da atribuição, autor, supersessão, effective period e override auditável |

**Decisão preliminar:** reutilizar as três tabelas. A próxima migration deverá ser aditiva e não criar um segundo subsistema de arquétipos.

Campos candidatos a delta, sujeitos à auditoria de constraints e casos de uso:

- em `archetype_versions`: `configuration jsonb`, `content_hash`, `created_at`, metadados de publicação e validação mais explícitos;
- em `archetype_assignments`: `diagnostic_session_id`, `diagnostic_result_id`, `assignment_strategy`, `assignment_reason`, `evidence_snapshot`, `assigned_by_user_account_id`, `supersedes_assignment_id`, `effective_from`, `effective_to`, `override_reason`, `source_event_id`;
- índice/constraint para uma atribuição atual por escopo sem apagar o histórico;
- RPCs para atribuição, recálculo e override com evento/outbox na mesma transação.

A presença de colunas de probabilidade não obriga o método inicial a inventar probabilidades. Elas poderão permanecer nulas quando a regra real for determinística.

### 3.3 Conteúdo próprio e de terceiros

| Estrutura | Classificação | Evidência | Delta provável |
|---|---|---|---|
| `catalog.content_assets` | `EXTEND_EXISTING` | já liga conteúdo à versão da atividade e suporta arquivo ou `external_url` | modelo atual é insuficiente para direitos, provider adapter, tracking e fallback |

Campos candidatos:

- `ownership_type`;
- `provider`;
- `external_id`;
- `canonical_url`;
- `embed_policy`;
- `rights_status` e referência de licença;
- `availability_status`;
- `tracking_capabilities jsonb`;
- `completion_policy jsonb`;
- `fallback_configuration jsonb`;
- `metadata_version` ou estrutura equivalente versionada.

Antes de adicionar colunas, verificar se metadados equivalentes já existem em outra tabela do catálogo. A primeira integração deve usar um único provedor real autorizado.

### 3.4 Eventos e outbox

| Estrutura | Classificação | Evidência | Delta provável |
|---|---|---|---|
| `eventing.event_schemas` | `REUSE_AS_IS` | schema versionado, hash e status | publicar schemas dos novos eventos |
| `eventing.events` | `REUSE_AS_IS` | contexto rico, ator, subject, aggregate, correlação, causalidade, natureza da evidência e privacidade | nenhum delta estrutural previsto |
| `eventing.outbox` | `REUSE_AS_IS` | rota, claim, tentativas, erro e conclusão | nenhum delta estrutural previsto |

Eventos já observados incluem início/conclusão de diagnóstico, resposta registrada, resultado gerado e eventos de avaliação. Faltam contratos e runtime para:

- resposta revisada como semântica explícita quando necessário;
- arquétipo atribuído;
- arquétipo recalculado;
- arquétipo sobrescrito por override;
- conteúdo externo aberto/iniciado/progresso/concluído conforme capacidade;
- projeção e reconciliação HubSpot.

### 3.5 HubSpot e integrações

| Estrutura | Classificação | Evidência | Delta provável |
|---|---|---|---|
| `integration.connections` | `REUSE_AS_IS` | provider, ambiente, secret reference e configuração | criar conexão HubSpot somente após sandbox/scopes autorizados |
| `mapping_definitions` / `mapping_versions` | `REUSE_AS_IS` | mapping versionado e validável | materializar a matriz User 360 sem nova tabela inicialmente |
| `external_object_mappings` | `REUSE_AS_IS` | vínculo interno/externo e timestamps | nenhum delta inicial |
| `sync_jobs` / `sync_attempts` | `REUSE_AS_IS` | idempotência, estado, tentativas e erros | implementar adapter/worker e política de backoff/DLQ |
| `conflicts` | `REUSE_AS_IS` | conflito por campo e resolução | definir autoridade por campo |
| `reconciliation_runs` / `reconciliation_items` | `REUSE_AS_IS` | execução e diferenças | implementar readback HubSpot |
| `webhook_receipts` | `REUSE_AS_IS` | assinatura, replay, hash e normalização | ativar somente quando webhook real for necessário |

**Conclusão:** a base de integração já cobre a maior parte da resiliência necessária. A lacuna principal é implementação e configuração real, não proliferação de tabelas.

## 4. Hipótese de migration M15

Nenhuma M15 será aplicada antes de concluir:

1. inspeção de constraints, índices, triggers e RLS das estruturas candidatas;
2. revisão dos RPCs E14 existentes;
3. mapeamento das ações das seis rotas atuais;
4. confirmação do formulário real e dos quatro arquétipos;
5. seleção do primeiro conteúdo externo autorizado;
6. inventário do HubSpot sandbox.

Se confirmada, M15 deverá concentrar apenas extensões necessárias para:

- configuração versionada dos arquétipos;
- histórico completo de atribuição, recálculo e override;
- metadados de conteúdo externo;
- constraints e índices correspondentes;
- eventos e funções atômicas indispensáveis.

## 5. Gaps que não exigem schema novo por enquanto

- HubSpot User 360 pode usar `mapping_definitions` e `mapping_versions`;
- retry/reconciliação podem usar as tabelas `integration` existentes;
- registro de eventos pode usar `event_schemas`, `events` e `outbox` existentes;
- formulário pode usar `diagnostic_*`, `items`, `item_options`, `sessions` e `responses` existentes;
- AWS não exige schema separado; exige adapters e validação das mesmas migrations em PostgreSQL gerenciado.

## 6. Próximas provas

- extrair constraints/índices/RLS das tabelas classificadas;
- localizar as migrations que criaram cada estrutura;
- auditar os RPCs que escrevem diagnóstico e vertical E14;
- mapear componentes/ações de `apps/web` para eventos;
- comparar schema Git versus schema remoto;
- produzir versão 0.2 deste delta com decisão final `REUSE`, `EXTEND`, `DEPRECATE` ou `NEW` por item;
- somente então escrever e testar M15 em banco limpo e no Supabase de teste.

## 7. Status do gate E14-R1

```text
remote_schema_inventory_started = true
new_ddl_applied = false
parallel_form_subsystem_created = false
parallel_archetype_subsystem_created = false
existing_integration_foundation_reused = planned
schema_delta_final = false
m15_authorized = false
```
