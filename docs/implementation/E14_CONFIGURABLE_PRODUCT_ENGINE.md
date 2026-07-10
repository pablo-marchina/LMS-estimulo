# E14 — motor configurável de formulário, arquétipo e ativação

**Versão:** 0.1  
**Data:** 2026-07-10  
**Status:** Implementado sobre o adapter HubSpot de teste; modelo físico e adapter real permanecem bloqueados pelo inventário da conta

## 1. Objetivo

Implementar o comportamento de produto que pode ser provado sem acesso ao HubSpot real:

```text
configuração confirmada no HubSpot
+ submissão confirmada no HubSpot
→ classificação declarativa
→ atribuição persistida e confirmada no HubSpot
→ avaliação de regras de ativação
→ execuções persistidas e confirmadas no HubSpot
```

Nenhuma entidade lógica deste documento determina `objectTypeId`, propriedade, associação, scope ou recurso contratado do HubSpot.

## 2. Modelo lógico implementado

```text
FormDefinition
FormVersion
QuestionVersion
QuestionOptionVersion

ArchetypeDefinition
ArchetypeVersion

ClassificationPolicyVersion
ClassificationRule
ArchetypeAssignment

ActivationRuleVersion
ActivationExecution
```

As estruturas estão em `apps/web/lib/configurable-product`.

## 3. Formulário e versões

- uma submissão referencia uma versão específica do formulário;
- apenas versões `published` podem ser usadas;
- versão publicada exige `publishedAt`;
- perguntas possuem identidade e versão próprias;
- IDs e códigos de perguntas e opções são únicos dentro da configuração;
- perguntas obrigatórias precisam ser respondidas;
- respostas são validadas conforme `single_select`, `number`, `boolean` ou `text`;
- opções removidas em versões futuras não alteram submissões históricas.

A implementação atual executa uma configuração ativa por snapshot HubSpot. A edição e publicação administrativa serão adicionadas em incremento separado.

## 4. Arquétipos variáveis

A quantidade de arquétipos é determinada exclusivamente pela configuração:

```text
hardcoded_archetype_count = false
hardcoded_archetype_names = false
```

A política possui uma lista de versões elegíveis. Um arquétipo:

- pode ser adicionado por uma nova definição/versão e nova versão da política;
- pode ser retirado de classificações futuras ao sair da lista de elegíveis;
- não pode ser elegível se estiver em `draft` ou `retired`;
- permanece interpretável em atribuições históricas após retirada operacional.

O teste automatizado adiciona um quinto arquétipo sem mudar o classificador.

## 5. Política declarativa de classificação

A política é composta por regras com:

```text
condições sobre respostas
→ efeitos de pontuação por archetypeVersionId
```

Operadores suportados:

- `equals`;
- `in`;
- `number_gte`;
- `number_lte`;
- `answered`.

A seleção considera:

- `minimumScore`;
- `minimumMargin`;
- `tieBreakStrategy` igual a `abstain` ou `priority`.

Quando a evidência não separa os resultados, a classificação pode retornar:

```text
archetypeVersionId = null
```

A implementação não inventa uma confiança. `confidence` permanece `null` até que uma metodologia de confiança seja definida, validada e versionada.

## 6. Histórico append-only

Toda atribuição possui:

- ID próprio;
- versão do formulário;
- versão da política;
- versão do arquétipo ou abstenção;
- scores calculados;
- hashes dos snapshots HubSpot utilizados;
- razão `classified`, `recalculated` ou `override`;
- referência opcional à atribuição anterior;
- timestamp;
- ator e justificativa quando houver override.

Regras:

- classificação inicial não supersede outra atribuição;
- recálculo e override precisam referenciar a atribuição substituída;
- uma atribuição não pode ser alterada ou reutilizar ID;
- uma atribuição não pode ter múltiplos sucessores ativos;
- override exige ator, justificativa e arquétipo publicado e elegível.

## 7. Recálculo

O fluxo suporta duas entradas:

```text
write
→ nova submissão
→ persistência + readback

read
→ submissão já existente no HubSpot
→ releitura verificada para recálculo ou override
```

Recálculo não reutiliza o payload original da requisição e não reenvia silenciosamente a submissão. Ele relê o objeto HubSpot e registra nova atribuição.

## 8. Regras de ativação

As regras de ativação são versionadas e declarativas. Podem consultar:

- versão do arquétipo atribuído;
- confiança, quando existir;
- respostas confirmadas da submissão.

Ações lógicas suportadas:

- `assign_journey`;
- `recommend_content`;
- `create_task`;
- `set_segment`;
- `emit_event`.

Versões em `draft` não executam. Regras publicadas são avaliadas por prioridade e cada execução registra:

- versão da regra;
- atribuição de origem;
- hashes dos snapshots usados;
- ação e parâmetros;
- timestamp;
- estado `planned`.

Se uma regra casar, a execução precisa ser persistida e confirmada no HubSpot. O motor rejeita o fluxo quando não recebe um destino de escrita.

## 9. Linhagem HubSpot obrigatória

O fluxo utiliza as primitivas:

```text
readVerified
writeAndConfirm
```

A ordem é:

```text
1. ler e validar a configuração HubSpot;
2. escrever+confirmar ou reler a submissão HubSpot;
3. classificar;
4. escrever+confirmar a atribuição;
5. usar a atribuição confirmada para avaliar ativações;
6. escrever+confirmar as execuções de ativação.
```

A evidência final contém as fontes HubSpot de configuração, submissão, atribuição e ativação.

## 10. Testes automatizados

`npm run test:e14-configurable-product` cobre:

1. classificação e ativação somente após readbacks;
2. adição de um quinto arquétipo sem mudança de código;
3. retirada operacional com preservação do histórico;
4. recálculo a partir de submissão relida do HubSpot;
5. bloqueio de política em rascunho;
6. bloqueio de resposta obrigatória ausente;
7. abstenção por empate/margem insuficiente;
8. override append-only com ator e justificativa;
9. obrigação de persistir ativações no HubSpot.

O gate compila junto:

- contratos HubSpot;
- adapter em memória;
- motor configurável;
- testes TypeScript.

## 11. Limites atuais

Ainda não implementados:

- interface administrativa;
- workflow de draft, revisão e publicação;
- modelo físico de objetos/propriedades HubSpot;
- adapter da API real;
- scopes, webhooks, rate limits e reconciliação reais;
- configuração oficial do formulário e dos arquétipos;
- aplicação do motor às rotas produtivas existentes;
- migration técnica de integração.

## 12. Gates

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
hubspot_physical_model_approved = false
hubspot_real_adapter_implemented = false
new_functional_migration_authorized = false
```
