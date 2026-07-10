# E14 — Plano de ação vigente

**Versão:** 2.0  
**Data:** 2026-07-10  
**Status:** Em execução  
**Referência máxima:** `Estimulo_all`, ADR-003, estado comprovado do runtime e decisões explícitas posteriores

## 1. Decisões que não podem ser reinterpretadas

1. O HubSpot é a fonte autoritativa de todos os dados de negócio coletados e utilizados.
2. Uma informação recebida pela aplicação somente pode alimentar decisão de negócio depois de `write → readback` no HubSpot.
3. PostgreSQL é plano técnico de outbox, idempotência, cache HubSpot-sourced, auditoria, reconciliação e execução transitória; não é autoridade independente dos dados de usuário.
4. Formulários, perguntas, opções, arquétipos, políticas de classificação, regras de ativação e seus usos são configuráveis e versionados.
5. A configuração inicial pode possuir quatro arquétipos, mas nomes e quantidade não são hardcoded.
6. Versões publicadas são imutáveis. Alterações criam nova versão; histórico não é sobrescrito.
7. Supabase é apenas desenvolvimento/teste. AWS staging é gate obrigatório e AWS será o ambiente oficial de produção.
8. Nenhuma migration ou remoção remota é executada sem prova em ambiente efêmero e autorização explícita.
9. Apenas um PR de desenvolvimento permanece ativo por vez.
10. Código, banco, testes, documentação e evidência de runtime devem concordar para uma etapa ser concluída.

## 2. Estado comprovado em 10 de julho de 2026

### 2.1 Banco e runtime

```text
remote_migration_count = 244
git_migration_count = 244
clean_replay_passed = true
schema_equivalence_passed = true
public_rpc_count = 18
public_rpc_contracts_passed = true
backend_e2e_replayed = true
rls_negative_checks_passed = true
idempotency_and_concurrency_passed = true
events_and_outbox_passed = true
```

### 2.2 Build e governança

```text
canonical_package_lock_present = true
package_manager = npm@10.9.2
web_ci_uses_npm_ci = true
clean_install_linux_passed = true
clean_install_windows_passed = true
repository_hygiene_gate_enabled = true
```

### 2.3 HubSpot e produto configurável

```text
hubspot_authoritative_source_decided = true
hubspot_gateway_contract_defined = true
hubspot_test_adapter_implemented = true
write_readback_use_gate_tested = true
configurable_form_contract_defined = true
variable_archetype_count_supported = true
classification_abstention_supported = true
assignment_history_append_only = true
recalculation_and_override_audited = true
activation_rules_versioned = true
hubspot_real_adapter_implemented = false
```

### 2.4 Legado opaco

```text
legacy_function_count = 114
legacy_private_helper_count = 106
legacy_public_rpc_count = 8
new_opaque_helpers_allowed = false
first_semantic_replacement_applied_and_reconciled = true
```

A M15a substituiu o primeiro helper opaco de baixo risco. A próxima etapa não será renomear funções cegamente: primeiro será decidido quais componentes ainda existirão depois da transição HubSpot.

## 3. Bloqueadores ativos

| ID | Severidade | Estado | Encerramento |
|---|---|---|---|
| E14-B002 | P0 | 106 helpers privados e 8 RPCs públicos opacos permanecem | eliminar aliases do runtime retido e remover integralmente componentes legados substituídos |
| E14-B007 | P0 | conta, modelo físico e adapter HubSpot real indisponíveis | inventário, modelo aprovado, adapter real, matriz campo→HubSpot e E2E no sandbox |
| E14-B004 | P1 | browser E2E e acessibilidade não comprovados | fluxos críticos automatizados com contas técnicas e auditoria de acessibilidade |
| E14-B005 | P1 | configuração inicial e conteúdo real não aprovados | formulário, arquétipos, conteúdo e direitos versionados e aprovados |
| E14-B006 | P1 | `file-storage` e `file-scan-worker` ativos sem consumidor atual | integrar comprovadamente ou remover função, scheduler, configuração e dependências |

## 4. Estratégia de execução

O trabalho será dividido em três trilhas, com dependências explícitas.

```text
TRILHA A — independente do acesso HubSpot
  limpeza e classificação do legado
  aplicação web sobre adapter de teste
  browser E2E e acessibilidade
  registro de interações e usos de dados
  contrato de conteúdo externo

TRILHA B — exige acesso HubSpot
  inventário da conta
  modelo físico
  adapter real
  migração/configuração
  vertical completa no sandbox

TRILHA C — ambiente oficial
  AWS staging por IaC
  paridade de adapters
  segurança, restore, carga e custo
  prontidão de produção
```

As trilhas podem ser planejadas em paralelo, mas o repositório mantém apenas um PR ativo por vez.

## 5. Trilha A — trabalho executável sem HubSpot real

### E14-A1 — Classificar o legado antes de novas substituições

**Objetivo:** evitar gastar tempo renomeando funções que serão apagadas quando o fluxo HubSpot substituir a vertical PostgreSQL antiga.

Gerar o grafo das 114 funções legadas e classificar cada componente em:

- `KEEP_AND_RENAME` — permanece no plano técnico e precisa de contrato semântico;
- `REPLACE_BY_HUBSPOT_FLOW` — será substituído pelo novo caso de uso HubSpot-sourced;
- `DELETE_WITH_LEGACY_VERTICAL` — não terá função depois do cutover;
- `PUBLIC_COMPATIBILITY_ONLY` — RPC público mantido temporariamente até migração dos consumidores.

Pontuação de risco por componente:

```text
direct_consumers
in_degree / out_degree
betweenness / centrality
tables_read
tables_mutated
event_or_outbox_dependency
public_exposure
business_result_effect
existing_e2e_coverage
```

Gate:

```text
legacy_functions_unclassified = 0
helpers_renamed_despite_future_deletion = 0
components_without_cutover_decision = 0
next_replacement_wave_has_quantitative_rationale = true
```

As próximas migrations técnicas serão feitas por componentes ou ondas coerentes, não necessariamente uma função por PR. Cada escrita remota continuará exigindo autorização explícita.

### E14-A2 — Eliminar adapters de teste sem consumidor

**Objetivo:** encerrar E14-B006 e reduzir superfície remota inútil.

1. confirmar consumidores, schedulers, secrets, buckets, filas e políticas ligados a `file-storage` e `file-scan-worker`;
2. decidir `INTEGRATE` ou `REMOVE` com evidência;
3. na ausência de consumidor, preparar remoção integral;
4. testar replay e ausência de referências;
5. solicitar autorização antes da exclusão remota;
6. reconciliar Git e Supabase depois da remoção.

Gate:

```text
active_test_runtime_without_consumer = 0
orphan_scheduler_or_secret_reference = 0
remote_and_git_state_reconciled = true
```

### E14-A3 — Integrar o motor configurável à aplicação

**Objetivo:** transformar contratos e engine já testados em fluxos utilizáveis sobre o adapter HubSpot de teste.

Frontend administrativo:

- criar, clonar e versionar formulários;
- adicionar, remover e ordenar perguntas e opções;
- publicar versões imutáveis;
- criar, retirar e versionar qualquer quantidade de arquétipos;
- editar política de classificação e critérios de abstenção;
- editar regras de ativação;
- visualizar dependências entre versões;
- executar preview com dados sintéticos;
- consultar atribuições, recálculos e overrides.

Frontend participante:

- carregar formulário publicado pelo gateway;
- salvar, retomar e enviar respostas;
- bloquear classificação antes do readback;
- apresentar resultado confirmado;
- tratar abstenção, indisponibilidade, conflito e retry.

Frontend operacional:

- consultar estado atual e histórico;
- solicitar recálculo;
- executar override autorizado;
- acompanhar write, readback, retry e reconciliação.

Gate:

```text
business_decision_from_raw_request = 0
business_decision_from_local_only_data = 0
hardcoded_archetype_names = 0
hardcoded_archetype_count = 0
published_configuration_mutations = 0
history_overwrites = 0
```

O adapter em memória é aceito somente para esta prova pré-acesso; ele não encerra E14-B007.

### E14-A4 — Browser E2E, acessibilidade e registro de interações

**Objetivo:** fechar a experiência navegável antes da integração física do CRM.

Fluxos automatizados:

1. operador cria formulário e arquétipos;
2. publica configuração compatível;
3. participante responde e envia;
4. write/readback libera classificação;
5. atribuição e ativações são confirmadas;
6. operador consulta histórico, recalcula e executa override;
7. replay não duplica efeitos;
8. falhas `401`, `403`, `409`, `429`, timeout e `5xx` são apresentadas corretamente.

Acessibilidade:

- teclado completo;
- foco previsível;
- labels e nomes acessíveis;
- mensagens anunciadas;
- status não comunicado somente por cor;
- contraste e responsividade;
- auditoria automatizada e revisão manual dos fluxos críticos.

Criar `UI_INTERACTION_REGISTRY` e `DATA_USE_REGISTRY` com:

- ação e ator;
- rota/componente;
- finalidade;
- dado HubSpot necessário;
- evento canônico;
- retenção e classificação;
- teste associado.

Gate:

```text
critical_browser_flows_without_e2e = 0
critical_accessibility_failures = 0
active_user_actions_without_registry = 0
business_data_use_without_hubspot_source = 0
```

### E14-A5 — Conteúdo próprio e externo

**Objetivo:** preparar um contrato unificado sem escolher um provedor real antes de existir conteúdo autorizado.

Implementar:

- contrato lógico de conteúdo;
- `ownership_type` e metadados de direitos;
- capacidades declaradas de embed e tracking;
- política de conclusão compatível com a capacidade observável;
- adapter sintético para E2E;
- adapter real somente quando houver conteúdo e direitos aprovados.

Gate pré-acesso:

```text
provider_specific_logic_in_domain = 0
completion_inferred_beyond_provider_capability = 0
external_content_without_rights_contract = 0
```

O encerramento de E14-B005 depende de entradas oficiais da Estímulo.

## 6. Trilha B — trabalho bloqueado pelo acesso HubSpot

### E14-H1 — Inventário da conta

Levantar:

- account/portal ID, hubs e tiers;
- sandbox ou test account;
- objetos padrão, custom objects e app objects disponíveis;
- propriedades, limites e associações;
- pipelines, workflows e webhooks;
- autenticação, scopes e limites de API;
- regras atuais de deduplicação de contatos e empresas.

Gate:

```text
hubspot_inventory_complete = true
unknown_required_capabilities = 0
```

### E14-H2 — Modelo físico e governança

Mapear os contratos lógicos para objetos e propriedades reais:

```text
FormDefinition / FormVersion
QuestionVersion / QuestionOptionVersion
FormSubmission / FormAnswer
ArchetypeDefinition / ArchetypeVersion
ClassificationPolicyVersion
ArchetypeAssignment
ActivationRuleVersion / ActivationExecution
HubSpotFieldMappingVersion
DataUseDefinition
```

Definir associações, índices lógicos, propriedade de estado atual, histórico, versionamento, deduplicação, retenção e permissões.

Gate:

```text
logical_entities_without_physical_mapping = 0
collected_fields_without_hubspot_destination = 0
business_reads_without_hubspot_origin = 0
hubspot_physical_model_approved = true
```

### E14-H3 — Adapter HubSpot real

Implementar:

- autenticação e scopes mínimos;
- criação, atualização, batch e associações;
- write receipt e readback;
- idempotência e optimistic concurrency;
- retry com backoff e tratamento de `429`/`5xx`;
- webhooks, invalidação de cache e eventos fora de ordem;
- reconciliação e replay autorizado;
- observabilidade sem dados pessoais excessivos.

Gate:

```text
real_adapter_contract_parity = true
critical_write_without_readback = 0
failed_job_without_retry_or_dlq = 0
stale_snapshot_used_for_decision = 0
```

### E14-H4 — Cutover dos casos de uso

1. persistir configurações oficiais no HubSpot;
2. persistir todas as respostas e submissões;
3. reler antes da classificação;
4. persistir e reler atribuições;
5. carregar regras de ativação do HubSpot;
6. persistir execuções e estado atual;
7. classificar tabelas PostgreSQL existentes como cache, auditoria ou remoção;
8. eliminar consumidores locais incompatíveis com a autoridade HubSpot.

Gate:

```text
production_path_using_test_adapter = 0
business_decision_from_postgresql_authority = 0
hubspot_reconciliation_mismatches = 0
legacy_component_without_cutover_state = 0
```

### E14-H5 — E2E completo no sandbox HubSpot

Provar com contas técnicas:

- configuração editável e publicação;
- quantidade variável de arquétipos;
- submissão, readback e classificação;
- abstenção, recálculo e override;
- regras de ativação;
- conteúdo autorizado;
- eventos, outbox, retry e reconciliação;
- browser E2E e acessibilidade;
- histórico íntegro e replay sem duplicação.

Gate:

```text
hubspot_sandbox_e2e_passed = true
manual_database_edits_in_e2e = 0
duplicate_effects_after_replay = 0
lost_assignment_history = 0
```

## 7. Trilha C — AWS staging e produção

### E14-C1 — AWS staging por infraestrutura como código

Provisionar conforme arquitetura aprovada:

- rede, sub-redes e segurança;
- RDS/Aurora PostgreSQL;
- autenticação oficial;
- storage, filas e DLQ;
- workers, imagens e secrets;
- observabilidade;
- backup, restore e disaster recovery.

### E14-C2 — Paridade e prontidão

Provar:

- replay das migrations em PostgreSQL limpo;
- contratos equivalentes dos adapters;
- identidade e autorização;
- fila, retry e DLQ;
- integração HubSpot;
- E2E completo;
- carga, custo, segurança e restore.

Gate:

```text
supabase_promoted_to_production = false
aws_infrastructure_manual_drift = 0
aws_staging_e2e_passed = true
restore_proof_passed = true
adapter_contract_parity_passed = true
production_readiness_gate_ready = true
```

## 8. Ordem imediata de trabalho

```text
1. atualizar e aprovar este plano
2. gerar o mapa de disposição dos 114 componentes legados
3. auditar e preparar remoção de file-storage/file-scan-worker
4. integrar o motor configurável às interfaces usando o adapter de teste
5. executar browser E2E, acessibilidade e registrar interações/usos
6. implementar contrato de conteúdo e adapter sintético
7. coletar e aprovar formulário, arquétipos e conteúdo iniciais
8. quando houver acesso, executar H1 → H5
9. provisionar e provar AWS staging
10. avaliar produção somente após todos os gates
```

O próximo trabalho após este plano é o item 2, não uma segunda migration de renomeação isolada.

## 9. Intervenções futuras necessárias

Nenhuma intervenção é necessária para o próximo item. O usuário será chamado apenas quando houver:

1. remoção remota de `file-storage`/`file-scan-worker` pronta e comprovada;
2. nova migration técnica pronta para escrita no Supabase;
3. necessidade de aprovação do formulário, quatro arquétipos iniciais, conteúdo e direitos;
4. acesso à conta ou sandbox HubSpot;
5. acesso e autorização de custo para AWS staging.

Não compartilhar tokens, client secrets, cookies ou dados de participantes.

## 10. Regra de conclusão

Uma fase somente é concluída quando:

```text
code_complete = true
tests_reproducible = true
documentation_current = true
runtime_evidence_available = true
remote_and_git_state_reconciled = true
```

Mocks e adapters sintéticos podem concluir subgates pré-acesso, mas nunca substituem a prova do adapter real, do sandbox HubSpot ou do AWS staging.