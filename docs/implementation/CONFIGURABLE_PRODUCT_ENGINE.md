# Motor configurável de formulário, arquétipo e ativação

**Versão:** 0.6  
**Data:** 2026-07-14  
**Status:** núcleo lógico, fluxo operacional, persistência transacional e outbox implementados; pacote oficial de configuração e integração às rotas pendentes

## Objetivo

Fornecer um núcleo reutilizável para:

- formulários versionados;
- perguntas e opções configuráveis;
- quatro arquétipos oficiais sem hardcode de nome;
- classificação declarativa;
- empate, prioridade ou abstenção conforme política aprovada;
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

A política pode definir score mínimo, margem mínima e desempate por prioridade ou abstenção.

Essa flexibilidade técnica não escolhe a política oficial. A referência exige um dos quatro arquétipos, mas o pacote atual não contém pesos, cortes ou regra formal de empate. Nenhuma estratégia será ativada silenciosamente.

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
+ submissão
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
- projeções resumidas de submissão, atribuição e ativações.

As projeções não exigem readback síncrono.

## Persistência operacional

O RPC `public.persist_configurable_product_result` persiste, em uma única transação:

```text
submissão e respostas
→ resultado
→ atribuição de arquétipo
→ decisões de ativação
→ eventos
→ outbox integration.hubspot
```

A implementação reutiliza as estruturas existentes:

- `diagnostics.sessions`;
- `diagnostics.responses`;
- `diagnostics.results`;
- `diagnostics.archetype_assignments`;
- `orchestration.personalization_decisions`;
- `eventing.events`;
- `eventing.outbox`.

Não foram criadas tabelas paralelas.

O RPC possui:

- autorização para participante ou operador com `participant.manage`;
- validação de formulário, jornada, respostas e arquétipo publicado;
- idempotência e replay sem duplicação;
- rejeição de chave reutilizada com payload diferente;
- rollback integral em falha;
- acesso restrito a `postgres`, `service_role` e `app_worker`.

A migration remota `20260714161338_configurable_product_operational_persistence` foi aplicada no Supabase de desenvolvimento/teste e materializada no histórico executável M16.

## Baseline oficial reconciliada

A configuração inicial deve representar:

- 12 perguntas da versão 3;
- 5 dimensões oficiais;
- Fazedor, Batalhador, Construtor e Navegador;
- maturidade operacional como eixo separado;
- prontidão de jornada como eixo separado.

A Q13 do protótipo Raio-X não integra o arquétipo oficial sem aprovação formal. O `scoring_config.json` do protótipo não é fonte metodológica oficial.

## Integração HubSpot existente

O arquivo `workflow.ts` e os utilitários HubSpot existentes preservam o fluxo estrito de write/readback para testes e casos CRM realmente críticos.

Esse fluxo:

- não é o runtime central do diagnóstico;
- não obriga cada submissão ou ativação a aguardar o CRM;
- continua útil para validar idempotência, concorrência, `429`, `5xx` e readback.

O worker produtivo que consumirá a rota `integration.hubspot` continua pendente do inventário real da conta.

## Extensibilidade

A implementação suporta quantidade variável de arquétipos. Essa flexibilidade deve ser preservada, mas não é prioridade de produto.

A configuração inicial deve conter exatamente os quatro arquétipos oficiais.

Não é necessário criar interface ou fluxos específicos para um quinto arquétipo antes de existir decisão oficial.

## Testes

`npm run test:configurable-product` cobre o núcleo lógico e as projeções.

`npm run test:configurable-product-persistence` cobre:

- persistência de sessão, respostas, resultado e atribuição;
- persistência das ativações;
- criação da outbox HubSpot;
- replay sem duplicação;
- rejeição de chave idempotente incompatível;
- acesso não autorizado;
- rollback em arquétipo inválido.

Os arquétipos usados no teste de banco são explicitamente sintéticos e existem somente no PostgreSQL efêmero.

## Pendências necessárias

- receber e homologar o texto exato das 12 perguntas;
- receber alternativas, condicionais e randomização oficiais;
- receber a planilha de scoring e o log de revisão;
- aprovar pesos, cortes e regra de empate;
- carregar os quatro arquétipos e textos finais;
- carregar a matriz inicial de ativações;
- aplicar a configuração às rotas atuais;
- criar administração mínima de draft, preview e publicação;
- implementar o adapter/worker HubSpot real;
- executar E2E no navegador com o diagnóstico oficial.

## Gates

```text
configurable_form_contract_defined = true
classification_engine_present = true
operational_flow_without_hubspot_present = true
crm_projection_commands_present = true
crm_projection_requires_synchronous_readback = false
classification_strategies_supported = true
official_tie_strategy_approved = false
fabricated_confidence_generated = false
assignment_history_append_only = true
override_audited = true
activation_rules_versioned = true
operational_persistence_integrated = true
hubspot_projection_outbox_integrated = true
remote_development_migration_applied = true
migration_history_materialized = true
official_question_count_reconciled = 12
official_dimension_count_reconciled = 5
official_archetype_count_reconciled = 4
official_exact_wording_loaded = false
official_scoring_loaded = false
application_routes_integrated = false
hubspot_real_worker_implemented = false
```

O motor existente deve ser configurado e ligado às rotas, não reescrito.
