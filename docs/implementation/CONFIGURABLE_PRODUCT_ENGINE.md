# Motor configurável de formulário, arquétipo e ativação

**Versão:** 0.3  
**Data:** 2026-07-14  
**Status:** núcleo lógico implementado; configuração oficial e integração às rotas pendentes

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

## Persistência

O motor de classificação é lógica de produto e deve permanecer independente do provedor de persistência.

O arquivo `workflow.ts` e os utilitários HubSpot existentes demonstram um fluxo estrito de write/readback. Eles podem ser reutilizados para casos CRM críticos, mas não representam a única forma autorizada de executar o motor.

O fluxo operacional recomendado é:

```text
carregar configuração publicada do LMS
→ persistir submissão no banco operacional
→ executar classificação
→ persistir atribuição e ativações
→ registrar eventos/outbox
→ projetar resultado relevante para HubSpot
```

## Extensibilidade

A implementação suporta quantidade variável de arquétipos. Essa flexibilidade deve ser preservada, mas não é prioridade de produto.

A configuração inicial deve conter exatamente os quatro arquétipos oficiais.

Não é necessário criar interface ou fluxos específicos para um quinto arquétipo antes de existir decisão oficial.

## Testes

`npm run test:configurable-product` cobre atualmente:

- classificação e ativação;
- versões publicadas;
- validação de respostas;
- empate e abstenção;
- histórico append-only;
- recálculo;
- override;
- extensibilidade do número de arquétipos.

Os testes que usam o adapter HubSpot em memória validam capacidades de integração, não obrigam o runtime final a depender de readback síncrono.

## Pendências necessárias

- carregar o formulário oficial;
- carregar os quatro arquétipos e scoring oficial;
- definir empate ou resultado inconclusivo;
- aplicar a configuração às rotas existentes;
- criar administração mínima de draft, preview e publicação;
- persistir resultados no banco operacional;
- publicar as projeções relevantes no HubSpot;
- executar E2E com o diagnóstico oficial.

## Gates

```text
configurable_form_contract_defined = true
classification_engine_present = true
classification_abstention_supported = true
fabricated_confidence_generated = false
assignment_history_append_only = true
override_audited = true
activation_rules_versioned = true
official_form_loaded = false
official_four_archetypes_loaded = false
application_routes_integrated = false
hubspot_projection_integrated = false
```

O motor existente deve ser integrado e configurado, não reescrito.