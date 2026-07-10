# E14 — motor configurável de formulário, arquétipo e ativação

**Versão:** 0.2  
**Data:** 2026-07-10  
**Status:** Implementado sobre o adapter HubSpot de teste; modelo físico e adapter real permanecem bloqueados pelo inventário da conta

## 1. Objetivo

Implementar o comportamento de produto comprovável sem acesso ao HubSpot real:

```text
configuração confirmada no HubSpot
+ submissão confirmada no HubSpot
+ pedido de classificação/recálculo/override confirmado no HubSpot
→ classificação declarativa
→ atribuição persistida e confirmada no HubSpot
→ avaliação de regras de ativação
→ execuções persistidas e confirmadas no HubSpot
```

Nenhuma entidade lógica determina `objectTypeId`, propriedade, associação, scope ou recurso contratado da conta real.

## 2. Modelo lógico

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

## 3. Formulário e versões

- uma submissão referencia uma versão específica do formulário;
- somente versões `published` podem ser usadas;
- versão publicada exige `publishedAt`;
- perguntas e opções possuem identidade versionada;
- IDs e códigos são únicos dentro da configuração;
- respostas obrigatórias e seus tipos são validados;
- opções removidas em versões futuras não alteram submissões históricas.

A edição e a publicação administrativa serão adicionadas em incremento separado.

## 4. Arquétipos variáveis

```text
hardcoded_archetype_count = false
hardcoded_archetype_names = false
```

A política define suas versões elegíveis. Um arquétipo:

- pode ser adicionado por nova definição/versão e nova política;
- pode ser retirado das classificações futuras;
- não pode ser elegível quando está `draft` ou `retired`;
- continua interpretável nos resultados históricos.

O teste adiciona um quinto arquétipo sem mudar o classificador.

## 5. Classificação declarativa

Cada regra contém condições sobre respostas e efeitos de pontuação por `archetypeVersionId`.

Operadores:

- `equals`;
- `in`;
- `number_gte`;
- `number_lte`;
- `answered`.

A seleção usa:

- `minimumScore`;
- `minimumMargin`;
- `tieBreakStrategy` igual a `abstain` ou `priority`.

Quando a evidência é insuficiente ou ambígua:

```text
archetypeVersionId = null
```

`confidence` permanece `null`. O sistema não inventa confiança sem metodologia validada e versionada.

## 6. Pedido de decisão também é HubSpot-sourced

Motivo, atribuição supersedida, alvo do override, ator e justificativa chegam como comando, mas não são usados diretamente.

O fluxo obrigatório é:

```text
payload do comando
→ gravação do DecisionRequest no gateway
→ readback confirmado
→ uso exclusivo do snapshot confirmado
```

A atribuição registra `decisionRequestSnapshotHash`, além dos hashes da configuração e da submissão. Assim, recálculo e override obedecem à mesma regra de origem aplicada às respostas.

O destino padrão é um tipo lógico de teste; o adapter real deverá receber o mapeamento físico após o inventário da conta.

## 7. Histórico append-only

Toda atribuição possui:

- ID próprio;
- versões do formulário e da política;
- versão do arquétipo ou abstenção;
- scores;
- hashes dos snapshots HubSpot;
- razão `classified`, `recalculated` ou `override`;
- referência à atribuição anterior quando aplicável;
- timestamp;
- ator e justificativa no override.

Regras:

- classificação inicial não supersede outra atribuição;
- recálculo e override precisam superseder uma atribuição existente;
- IDs não podem ser reutilizados;
- uma atribuição não pode ter múltiplos sucessores ativos;
- override exige ator, justificativa e alvo publicado e elegível.

## 8. Recálculo

```text
write
→ nova submissão
→ persistência + readback

read
→ submissão já existente no HubSpot
→ releitura verificada
```

O recálculo não reenvia nem usa silenciosamente o payload original. Ele relê a submissão, persiste o pedido de recálculo e cria uma nova atribuição.

## 9. Ativações

Regras versionadas podem consultar:

- versão do arquétipo;
- confiança, quando existir;
- respostas confirmadas.

Ações lógicas:

- `assign_journey`;
- `recommend_content`;
- `create_task`;
- `set_segment`;
- `emit_event`.

Versões `draft` não executam. Cada execução registra regra, atribuição, hashes de entrada, ação, timestamp e estado `planned`. Regra correspondente sem destino de persistência HubSpot bloqueia o fluxo.

## 10. Ordem e linhagem

```text
1. readVerified da configuração;
2. writeAndConfirm ou readVerified da submissão;
3. writeAndConfirm do pedido de decisão;
4. classificação usando apenas os três snapshots confirmados;
5. writeAndConfirm da atribuição;
6. avaliação usando a atribuição confirmada;
7. writeAndConfirm das ativações.
```

A evidência final contém as fontes HubSpot de configuração, submissão, pedido de decisão, atribuição e ativação.

## 11. Testes

`npm run test:e14-configurable-product` cobre:

1. classificação e ativação após readbacks;
2. quinto arquétipo sem mudança de código;
3. retirada operacional e preservação histórica;
4. recálculo a partir da submissão relida;
5. bloqueio de política em rascunho;
6. bloqueio de resposta obrigatória ausente;
7. abstenção por empate/margem insuficiente;
8. override append-only com ator e justificativa;
9. persistência obrigatória das ativações.

O gate compila os contratos HubSpot, o adapter em memória, o motor e os testes TypeScript.

## 12. Limites

Ainda não implementados:

- interface administrativa e preview;
- workflow de draft, revisão e publicação;
- modelo físico HubSpot;
- adapter da API real;
- scopes, webhooks, limites e reconciliação reais;
- configuração oficial do formulário e dos arquétipos;
- aplicação às rotas produtivas existentes;
- migration técnica de integração.

## 13. Gates

```text
configurable_form_contract_defined = true
variable_archetype_count_supported = true
published_configuration_required = true
classification_abstention_supported = true
fabricated_confidence_generated = false
decision_request_write_readback_required = true
assignment_history_append_only = true
recalculation_reads_existing_hubspot_submission = true
override_audited = true
activation_rules_versioned = true
activation_execution_persisted_in_hubspot = true
hubspot_physical_model_approved = false
hubspot_real_adapter_implemented = false
new_functional_migration_authorized = false
```
