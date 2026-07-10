# ADR-003 — HubSpot como fonte autoritativa dos dados utilizados pelo produto

**Status:** Aceita  
**Data:** 2026-07-10  
**Escopo:** E14 e releases posteriores  
**Supersede parcialmente:** ADR-002, seções 4 e 5, e documentos que definem PostgreSQL como fonte operacional dos dados de usuário

## Contexto

A decisão explícita atual da Estímulo determina que:

1. todo dado coletado pelo produto deve ser armazenado no HubSpot;
2. todo dado utilizado pelo produto em classificação, personalização, recomendação, segmentação, automação ou qualquer outra função de negócio deve ser proveniente do HubSpot;
3. formulário, perguntas, opções, arquétipos, políticas de classificação e regras de utilização devem permanecer editáveis, versionados e auditáveis;
4. a quantidade de arquétipos não é uma restrição estrutural. A configuração inicial pode possuir quatro arquétipos, mas arquétipos podem ser adicionados, retirados da operação, divididos, fundidos ou substituídos por novas versões.

A arquitetura anterior mantinha PostgreSQL como fonte transacional e histórica dos dados de usuário e projetava somente parte deles no HubSpot. Essa arquitetura não atende à decisão atual.

## Decisão

### 1. Autoridade dos dados

O HubSpot será a fonte autoritativa de:

- identidade operacional do usuário e da organização;
- definições e versões de formulário;
- perguntas, opções e regras de validação;
- submissões e respostas coletadas;
- definições e versões de arquétipos;
- políticas e versões de classificação;
- resultados, evidências, recálculos e overrides;
- regras e versões de utilização dos resultados;
- execuções de regras de ativação;
- estados de jornada, segmentação, recomendação e relacionamento usados pelo produto;
- qualquer outro dado de negócio que seja consumido por uma decisão ou funcionalidade.

Nenhuma cópia PostgreSQL desses dados poderá ser tratada como origem independente.

### 2. Regra de origem obrigatória

Toda operação de negócio deverá provar a origem HubSpot dos dados utilizados.

Uma leitura será válida somente quando possuir:

```text
hubspot_portal_id
hubspot_object_type
hubspot_object_id
hubspot_property_or_payload_version
hubspot_updated_at
retrieved_at
source_snapshot_hash
```

O produto poderá usar uma réplica ou cache técnico, desde que:

- o conteúdo tenha sido obtido do HubSpot;
- a origem e a versão estejam registradas;
- não exista mutação local independente;
- a invalidação seja feita por webhook, reconciliação ou TTL explícito;
- dados vencidos ou sem origem comprovável não alimentem decisões;
- a decisão registre quais snapshots HubSpot foram utilizados.

### 3. Regra de escrita e readback

O fluxo obrigatório para qualquer dado coletado será:

```text
entrada do usuário
→ validação estrutural sem decisão de negócio
→ persistência no HubSpot
→ confirmação por readback
→ marcação como disponível para uso
→ leitura dos dados a partir do HubSpot ou réplica comprovadamente HubSpot-sourced
→ execução da regra de negócio
→ persistência do resultado no HubSpot
→ readback do resultado
→ somente então ativação de usos posteriores
```

Uma resposta recebida na requisição não poderá ser usada diretamente para calcular o arquétipo antes de ser persistida e confirmada no HubSpot.

### 4. Indisponibilidade do HubSpot

Quando o HubSpot estiver indisponível:

- a submissão poderá permanecer em estado técnico `pending_hubspot`;
- nenhuma classificação, recomendação, segmentação ou automação será executada;
- uma fila técnica poderá guardar uma cópia criptografada e temporária exclusivamente para retry;
- essa cópia não será fonte de negócio;
- a retenção temporária deverá ser curta, configurada e auditada;
- após persistência e readback confirmados, a cópia transitória deverá ser eliminada conforme a política definida.

O estado funcional `submitted` somente será alcançado após confirmação no HubSpot.

### 5. Papel do PostgreSQL

PostgreSQL deixa de ser a fonte operacional dos dados de usuário utilizados pelo produto. Ele permanece como plano técnico para:

- outbox e filas;
- idempotência;
- tentativas, retries e DLQ;
- recibos de webhook;
- mapeamento entre identificadores internos e HubSpot;
- cache HubSpot-sourced com linhagem e validade;
- auditoria técnica de comandos e decisões;
- correlação, observabilidade e reconciliação;
- event store técnico, desde que todos os fatos de usuário exigidos pelo produto também sejam materializados no HubSpot e nenhuma decisão use exclusivamente o event store local.

Registros locais de respostas, resultados ou atribuições existentes serão tratados como réplica técnica ou evidência histórica, nunca como autoridade de negócio.

### 6. Configuração editável no HubSpot

A interface administrativa poderá existir na plataforma, mas toda alteração deverá ser persistida no HubSpot e confirmada por readback.

O modelo lógico HubSpot deverá suportar, no mínimo:

```text
FormDefinition
FormVersion
QuestionVersion
QuestionOptionVersion
FormSubmission
FormAnswer
ArchetypeDefinition
ArchetypeVersion
ClassificationPolicyVersion
ArchetypeAssignment
ActivationRuleVersion
ActivationExecution
HubSpotFieldMappingVersion
```

A materialização física poderá usar objetos CRM customizados, app objects, propriedades, associações e eventos de aplicação, conforme o plano e as capacidades reais da conta. A decisão física será tomada somente depois do inventário do sandbox.

### 7. Arquétipos variáveis

Não haverá limite estrutural fixo de quatro arquétipos.

- a configuração inicial poderá possuir quatro arquétipos ativos;
- adicionar ou retirar arquétipos exigirá nova versão da política de classificação;
- um arquétipo já atribuído não poderá ser apagado de forma a destruir histórico;
- retirada operacional significa deixar de ser elegível para novas classificações;
- reclassificação retroativa será explícita, versionada e auditável;
- toda atribuição, recálculo ou override será persistido no HubSpot como novo fato histórico.

### 8. Regras de utilização editáveis

O uso de respostas e arquétipos será definido por versões de regras de ativação armazenadas no HubSpot.

Cada execução deverá registrar:

```text
activation_rule_version
hubspot_input_snapshot_ids
classification_assignment_id
decision
action
executed_at
status
```

Condicionais hardcoded por nome de arquétipo são proibidas.

### 9. Consistência, reconciliação e segurança

A integração deverá possuir:

- idempotência por comando e objeto;
- escrita em lote quando possível;
- retry com backoff;
- DLQ;
- webhooks para invalidação e atualização;
- reconciliação periódica;
- readback obrigatório para dados críticos;
- comparação de hash e versão;
- controle de scopes mínimo;
- logs sem tokens ou payloads sensíveis;
- política explícita para limites e erros `429`.

## Consequências

### Positivas

- todos os dados usados operacionalmente ficam disponíveis no HubSpot;
- segmentações, workflows e operações podem usar os mesmos fatos do produto;
- formulário, arquétipos e regras permanecem editáveis sem hardcode;
- elimina-se a divergência entre o que o produto usa e o que o CRM conhece.

### Custos e riscos

- HubSpot entra no caminho crítico de disponibilidade dos dados de negócio;
- classificação e ativação não podem prosseguir durante indisponibilidade ou atraso de sincronização;
- latência e limites de API tornam batch, cache, webhook e reconciliação obrigatórios;
- a modelagem depende do plano, objetos, propriedades, associações, workflows e scopes disponíveis na conta;
- mudanças de schema no HubSpot precisam ser tratadas como mudanças versionadas de produto.

## Gates obrigatórios

```text
all_collected_business_data_persisted_in_hubspot = true
all_business_reads_have_hubspot_origin = true
hubspot_readback_required_for_critical_writes = true
business_decision_from_unconfirmed_request_payload = false
business_decision_from_local_only_data = false
hardcoded_archetype_count = false
hardcoded_archetype_names = false
hubspot_inventory_complete = true
hubspot_rate_limit_strategy_tested = true
hubspot_reconciliation_passed = true
```

## Bloqueio atual

Nenhuma nova migration funcional ou implementação final de formulário/arquétipo será autorizada até que o sandbox HubSpot seja inventariado e o modelo físico de objetos, propriedades, associações, eventos, scopes e workflows seja aprovado.
