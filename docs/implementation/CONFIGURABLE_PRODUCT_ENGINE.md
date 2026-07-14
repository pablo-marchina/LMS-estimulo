# Motor configurável de formulário, arquétipo e ativação

**Versão:** 0.4  
**Data:** 2026-07-14  
**Status:** núcleo lógico e fluxo operacional implementados; configuração oficial e integração às rotas pendentes

## Objetivo

Fornecer um núcleo reutilizável para:

- formulários versionados;
- perguntas e opções configuráveis;
- quatro arquétipos oficiais sem hardcode de nome;
- classificação declarativa;
- empate ou abstenção conforme política;
- histórico append-only;
- recálculo e override auditável;
- regras de ativação versionadas.

## Modelo lógico

```text
FormDefinition
FormVersion
QuestionVersion
QuestionOptionVersion
ArchetypeDefinition
ArchetypeVersion
ClassificationPolicyVersion
ClassificationRule
DecisionRequest
ArchetypeAssignment
ActivationRuleVersion
ActivationExecution
```

As estruturas estão em `apps/web/lib/configurable-product`.

## Comportamento implementado

### Formulário

- submissão vinculada à versão exata;
- somente versão publicada pode ser usada;
- respostas obrigatórias e tipos são validados;
- versões futuras não alteram submissões históricas.

### Classificação

Operadores suportados:

- `equals`;
- `in`;
- `number_gte`;
- `number_lte`;
- `answered`.

A política define score mínimo, margem mínima e desempate por prioridade ou abstenção.

`confidence` permanece `null` enquanto não houver metodologia aprovada.

### Histórico

- atribuições possuem ID próprio e versões de entrada;
- recálculo e override criam novos registros;
- atribuições anteriores não são sobrescritas;
- override exige ator e justificativa;
- não pode haver mais de um sucessor ativo para a mesma atribuição.

### Ativações

Regras versionadas podem gerar ações como:

- atribuir jornada;
- recomendar conteúdo;
- criar tarefa;
- definir segmento;
- emitir evento.

## Fluxo operacional

`operational-workflow.ts` executa o núcleo sem depender do HubSpot:

```text
configuração publicada
+ submissão persistida no LMS
+ pedido de classificação
→ classificação
→ atribuição
→ ativações
→ hashes de evidência
→ comandos idempotentes de projeção CRM
```

O resultado contém:

- atribuição de arquétipo;
- lote de ativações, quando houver;
- hashes determinísticos de configuração, submissão, pedido, atribuição e ativações;
- projeções resumidas de submissão, atribuição e ativações para publicação posterior pela outbox.

As projeções não exigem readback síncrono. O produto pode concluir a operação local e sincronizar o HubSpot com retry e reconciliação.

## Integração HubSpot existente

O arquivo `workflow.ts` e os utilitários HubSpot existentes preservam o fluxo estrito de write/readback para testes e casos CRM realmente críticos.

Esse fluxo:

- não é o runtime central do diagnóstico;
- não obriga cada submissão ou ativação a aguardar o CRM;
- continua útil para validar idempotência, concorrência, `429`, `5xx` e readback.

## Extensibilidade

A implementação suporta quantidade variável de arquétipos. Essa flexibilidade deve ser preservada, mas não é prioridade de produto.

A configuração inicial deve conter exatamente os quatro arquétipos oficiais.

Não é necessário criar interface ou fluxos específicos para um quinto arquétipo antes de existir decisão oficial.

## Testes

`npm run test:configurable-product` cobre:

- fluxo operacional sem gateway HubSpot;
- geração idempotente de projeções CRM;
- classificação e ativação;
- versões publicadas;
- validação de respostas;
- empate e abstenção;
- histórico append-only;
- recálculo;
- override;
- extensibilidade do número de arquétipos;
- capacidades do adapter HubSpot em memória.

## Pendências necessárias

- carregar o formulário oficial;
- carregar os quatro arquétipos e scoring oficial;
- definir empate ou resultado inconclusivo;
- persistir configuração, submissão, atribuição e ativações no banco operacional;
- enfileirar os comandos de projeção na outbox existente;
- aplicar a configuração às rotas atuais;
- criar administração mínima de draft, preview e publicação;
- executar E2E com o diagnóstico oficial.

## Gates

```text
configurable_form_contract_defined = true
classification_engine_present = true
operational_flow_without_hubspot_present = true
crm_projection_commands_present = true
crm_projection_requires_synchronous_readback = false
classification_abstention_supported = true
fabricated_confidence_generated = false
assignment_history_append_only = true
override_audited = true
activation_rules_versioned = true
official_form_loaded = false
official_four_archetypes_loaded = false
operational_persistence_integrated = false
application_routes_integrated = false
hubspot_projection_outbox_integrated = false
```

O motor existente deve ser integrado e configurado, não reescrito.
