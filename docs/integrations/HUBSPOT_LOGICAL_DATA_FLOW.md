# Fluxo lógico de integração com HubSpot

**Versão:** 0.2  
**Data:** 2026-07-10  
**Status:** Arquitetura autoritativa definida; materialização física bloqueada pelo inventário do sandbox

## 1. Papel do HubSpot

HubSpot é a fonte autoritativa de todos os dados de negócio coletados e utilizados pelo produto.

Isso inclui:

- identidade operacional do usuário e da organização;
- definições e versões de formulários;
- perguntas e opções;
- submissões e respostas;
- arquétipos e suas versões;
- políticas de classificação;
- atribuições, recálculos e overrides;
- regras que determinam onde e quando os resultados são utilizados;
- execuções dessas regras;
- estados de jornada e relacionamento usados por funcionalidades.

PostgreSQL não é fonte independente desses dados. Ele permanece como plano técnico de integração, auditoria, idempotência, cache com linhagem e reconciliação.

## 2. Regra de uso

Nenhum dado recebido diretamente da interface poderá alimentar uma decisão de negócio antes de ser persistido no HubSpot e confirmado por readback.

```text
usuário envia dados
→ plataforma valida apenas formato e autorização
→ HubSpot recebe e persiste
→ plataforma executa readback
→ snapshot HubSpot é registrado
→ classificação ou regra consome o snapshot HubSpot
→ resultado volta ao HubSpot
→ novo readback confirma o resultado
→ usos posteriores são liberados
```

São usos de negócio:

- classificação de arquétipo;
- personalização;
- recomendação;
- seleção de trilha;
- segmentação;
- criação de tarefas;
- comunicação;
- relatórios operacionais;
- qualquer função futura baseada em respostas, arquétipos ou comportamento.

## 3. Escrita de dados coletados

Todo campo coletado deverá possuir destino HubSpot obrigatório.

Cada mapeamento declarará:

```text
source_field
hubspot_object_type
hubspot_property_or_associated_object
transformation
required_for_submission
sensitivity
retention
version
status
```

Uma submissão somente será considerada funcionalmente concluída quando:

```text
hubspot_write_succeeded = true
hubspot_readback_matches = true
all_required_fields_confirmed = true
```

Caso o HubSpot esteja indisponível, a plataforma poderá manter estado técnico `pending_hubspot`, mas não poderá classificar nem utilizar os dados.

## 4. Leitura de dados utilizados

Toda leitura usada em uma decisão deverá ser direta do HubSpot ou de uma réplica comprovadamente HubSpot-sourced.

A linhagem mínima é:

```text
portal_id
object_type
object_id
source_version
hubspot_updated_at
retrieved_at
snapshot_hash
cache_expires_at
```

Caches são permitidos somente quando:

- são alimentados exclusivamente por HubSpot;
- não aceitam edição local independente;
- possuem TTL e invalidação;
- são atualizados por webhook ou reconciliação;
- dados vencidos não alimentam decisões;
- a execução registra o snapshot usado.

## 5. Configuração editável

Formulários, arquétipos, políticas e usos posteriores serão administráveis pela plataforma, mas a persistência autoritativa ocorrerá no HubSpot.

Modelo lógico mínimo:

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

O modelo físico poderá usar objetos CRM customizados, app objects, propriedades, associações e app events, conforme as capacidades reais da conta.

## 6. Arquétipos variáveis

A quantidade de arquétipos é configurável.

- a operação inicial pode começar com quatro;
- adicionar ou remover arquétipos ativos cria nova versão de política;
- um arquétipo histórico não é apagado se já tiver sido atribuído;
- retirada significa deixar de ser elegível para classificações futuras;
- reclassificação retroativa exige operação explícita;
- cada atribuição, recálculo ou override gera um novo registro HubSpot.

## 7. Regra de utilização dos resultados

O local e o momento de uso de respostas ou arquétipos serão definidos por regras de ativação versionadas.

Exemplo lógico:

```text
quando:
  archetype_version = X
  response.business_stage = Y
  confidence >= threshold

então:
  assign_journey = Z
  create_task = true
  set_contact_segment = W
```

A regra e os dados usados deverão ser lidos do HubSpot. A execução também será persistida no HubSpot.

## 8. Plano técnico PostgreSQL

PostgreSQL poderá armazenar apenas estruturas técnicas como:

- `integration.connections`;
- `mapping_definitions` e versões;
- `external_object_mappings`;
- `sync_jobs` e `sync_attempts`;
- `webhook_receipts`;
- `conflicts`;
- `reconciliation_runs` e itens;
- outbox;
- idempotência;
- cache HubSpot-sourced com origem e validade;
- auditoria técnica da decisão.

Tabelas locais de diagnóstico, respostas e resultados existentes não poderão alimentar novas decisões sem antes serem reconciliadas com o HubSpot.

## 9. Entrada do HubSpot

```text
Webhook HubSpot
→ validação de assinatura e replay
→ webhook receipt
→ resolução de objeto e associação
→ atualização/invalidação do cache
→ evento técnico de sincronização
→ reconciliação quando necessário
```

Webhooks não criam uma segunda autoridade local. Eles atualizam a réplica técnica da autoridade HubSpot.

## 10. Falhas e limites

A integração deverá implementar:

- batch APIs quando disponíveis;
- retry com backoff e jitter;
- tratamento de `429`;
- DLQ;
- idempotência;
- readback;
- reconciliação periódica;
- monitoramento de consumo de API;
- cache de configurações HubSpot-sourced;
- webhooks para reduzir polling.

O HubSpot recomenda batch e cache para reduzir chamadas e webhooks para receber atualizações; os limites variam conforme distribuição do app e assinatura da conta.

## 11. Bloqueios para materialização física

É necessário obter do sandbox HubSpot:

- plano e hubs contratados;
- disponibilidade de objetos customizados ou app objects;
- objetos e propriedades existentes;
- pipelines e workflows existentes;
- associações disponíveis;
- scopes do app;
- webhooks disponíveis;
- limites de API aplicáveis;
- regras de deduplicação;
- identificadores de contato e empresa;
- política institucional de propriedade dos campos.

Sem esse inventário, o modelo lógico está definido, mas o schema físico HubSpot não pode ser aprovado.
