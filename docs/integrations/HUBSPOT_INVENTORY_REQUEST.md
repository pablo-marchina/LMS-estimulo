# Solicitação de inventário do HubSpot

**Versão:** 0.1  
**Data:** 2026-07-10  
**Status:** Bloqueante para o modelo físico e para novas migrations funcionais

## 1. Objetivo

Coletar somente metadados da conta HubSpot necessários para materializar o ADR-003.

Não enviar tokens, client secrets, chaves privadas, cookies, dados pessoais de contatos ou payloads reais de usuários.

## 2. Informações institucionais necessárias

- HubSpot account/portal ID;
- conta de sandbox ou test account disponível;
- hubs contratados e respectivos tiers;
- existência de developer account e projeto de app;
- modelo pretendido de autenticação: app privado de conta única ou OAuth;
- responsável administrativo pelo HubSpot;
- responsável pela aprovação de novos objetos, propriedades e workflows.

## 3. Inventário de objetos

Para cada objeto padrão, custom object ou app object existente:

```text
object_type_id
internal_name
label
primary_display_property
secondary_display_properties
archivable
searchable
associations
owner/team rules
```

Objetos prioritários:

- contacts;
- companies;
- deals, tickets ou outros objetos usados pela operação;
- objetos customizados existentes;
- app objects já instalados.

## 4. Inventário de propriedades

Para cada objeto relevante, exportar:

```text
property_name
label
type
field_type
group_name
has_unique_value
calculated
read_only
hidden
options
created_by_user
updated_at
```

Também informar:

- limite de propriedades disponível;
- convenção atual de nomes;
- propriedades que já representam diagnóstico, segmento, jornada ou perfil;
- propriedades usadas por listas, relatórios e workflows.

## 5. Associações e identificadores

- identificador usado para deduplicar contatos;
- identificador usado para empresas;
- associações contato→empresa;
- associações com deals, tickets ou objetos customizados;
- labels de associação existentes;
- regras para múltiplas empresas por contato;
- objetos que podem possuir histórico um-para-muitos.

## 6. Workflows e automações existentes

Para cada workflow relevante:

```text
name
status
enrollment_object
entry_conditions
properties_read
properties_written
associated_objects_used
webhook_actions
custom_actions
owner
```

Precisamos identificar conflitos com futuras regras de ativação da plataforma.

## 7. Aplicação, scopes e webhooks

Informar quais scopes podem ser aprovados para:

- leitura e escrita de contatos;
- leitura e escrita de empresas;
- leitura e escrita de objetos customizados ou app objects;
- leitura e escrita de schemas/propriedades quando permitido;
- associações;
- eventos;
- webhooks.

Também informar:

- webhooks já configurados;
- assinatura e validação disponíveis;
- limites de subscriptions;
- endpoint de teste autorizado;
- política de rotação e armazenamento de credenciais.

## 8. Limites e capacidade

Registrar os limites aplicáveis à conta e ao app:

```text
requests_per_10_seconds
requests_per_day
search_api_limits
batch_sizes
custom_object_limits
property_limits
association_limits
workflow_limits
webhook_subscription_limits
custom_or_app_event_limits
```

A estratégia de cache, batching e reconciliação será derivada desses valores.

## 9. Modelo lógico a validar

O inventário deverá indicar como materializar:

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

Para cada entidade, escolher uma opção e justificar:

- propriedade em objeto padrão;
- custom object;
- app object;
- app event/custom event;
- associação;
- combinação das opções anteriores.

## 10. Matriz obrigatória de dados

Para todo dado coletado:

| Campo | Objeto HubSpot | Propriedade/objeto associado | Obrigatório | Histórico | Sensibilidade | Retenção |
|---|---|---|---|---|---|---|

Para todo dado utilizado:

| Uso | Dados de entrada | Origem HubSpot | Regra/versionamento | Saída HubSpot | Readback |
|---|---|---|---|---|---|

Os dois inventários deverão ter cobertura de 100% antes da implementação.

## 11. Critério de conclusão

```text
hubspot_account_metadata_received = true
hubspot_objects_inventory_complete = true
hubspot_properties_inventory_complete = true
hubspot_associations_inventory_complete = true
hubspot_workflows_inventory_complete = true
hubspot_scopes_approved = true
hubspot_webhooks_inventory_complete = true
hubspot_limits_recorded = true
all_collected_fields_have_destination = true
all_business_uses_have_hubspot_origin = true
```

Após esse gate será possível produzir o modelo físico, os contratos do adapter e a primeira migration técnica de integração.
