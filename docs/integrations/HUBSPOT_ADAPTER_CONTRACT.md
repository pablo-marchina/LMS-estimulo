# Contrato do adapter HubSpot

**Versão:** 1.2  
**Data:** 2026-07-20  
**Status:** política seletiva e adapter HTTP implementados; inventário e prova em sandbox pendentes

## Objetivo

Isolar a aplicação da API física do HubSpot e sincronizar somente:

- identificadores mínimos de vínculo;
- sinais agregados de engajamento aprovados;
- entradas, features e resultados úteis para cálculos aprovados.

O PostgreSQL continua responsável pelo estado operacional, event store e histórico detalhado.

## Porta

A aplicação depende de `HubSpotDataGateway`:

```text
write(command)
readBack(receipt)
read(query)
```

O domínio não depende do SDK nem da estrutura física da conta.

## Classificação obrigatória

A política canônica é:

```text
linking_identifier
engagement_signal
calculation_input_or_result
not_synced
```

Um comando físico exige:

```text
syncClassification
businessPurpose
calculationOrEngagementUse
sourceRecordId
sourceRecordHash
idempotencyKey
objectType
objectId interno explícito
associationTargets
payload
sensitivity
requiresReadback
occurredAt
approvedDestinationId
approvedObjectType
approvedPropertyNames
```

Itens classificados como `not_synced` não geram comando. Itens semanticamente elegíveis também permanecem `not_synced` enquanto o inventário não aprovar exatamente um objeto e uma propriedade.

## Política seletiva implementada

Elegíveis somente após destino aprovado:

- identificador canônico do usuário;
- identificador canônico do negócio;
- marcos agregados de início e conclusão de jornada;
- conclusão agregada de atividade;
- emissão de credencial.

Bloqueados por padrão:

- nota de utilidade, até aprovação do catálogo de sinais;
- maturidade, enquanto a metodologia permanecer draft;
- arquétipo, até configuração oficial, privacidade e destino aprovados;
- respostas brutas de diagnóstico;
- comentários e outros textos abertos;
- arquivos binários e URLs assinadas;
- conteúdo e configuração editorial;
- logs, traces, filas, retries e segredos.

## Adapter HTTP implementado

O `HubSpotHttpAdapter`:

- usa a API CRM v3 por `objectType` e ID interno numérico;
- aceita `contacts`, `companies`, `deals`, `leads` e IDs de objetos personalizados no formato `2-<número>`;
- não usa `idProperty`;
- não interpreta o termo ambíguo `lead_id de negócio`;
- não cria registros nem resolve deduplicação;
- não cria associações enquanto os tipos físicos não forem inventariados;
- faz `PATCH` parcial apenas das propriedades aprovadas;
- faz `GET` com allowlist explícita de propriedades;
- executa readback e comparação por hash;
- lê `updatedAt` como versão física para conflito otimista;
- classifica `423`, `429`, `477` e falhas transitórias de infraestrutura como retryable;
- trata erros de validação, autenticação, autorização e ausência como permanentes;
- limita e sanitiza detalhes de erro;
- não registra token ou payload de negócio em logs;
- falha fechado quando token ou portal não estão configurados.

## Configuração

```text
HUBSPOT_PRIVATE_APP_TOKEN
HUBSPOT_PORTAL_ID
HUBSPOT_API_BASE_URL=https://api.hubapi.com
HUBSPOT_API_TIMEOUT_MS=20000
```

A ausência das duas primeiras variáveis produz `HUBSPOT_ADAPTER_NOT_CONFIGURED`. Não existe fallback produtivo para o adapter em memória.

## Idempotência e concorrência

A camada de outbox do PostgreSQL continua sendo a autoridade persistente de entrega. O adapter também impede repetição divergente dentro da instância. Quando `expectedVersion` é informado, ele lê o registro antes do `PATCH` e rejeita divergência.

## Readback

Cada receipt mantém as propriedades permitidas. O readback consulta somente essas propriedades e valida:

```text
portalId
objectType
objectId
propertyOrPayloadVersion
hubspotUpdatedAt
retrievedAt
snapshotHash
```

## Adapter em memória

O `InMemoryHubSpotAdapter` permanece como double de contrato para criação, atualização, idempotência, atraso de visibilidade, `429`, `5xx` e concorrência. Ele não é selecionado automaticamente em ambiente real.

## Fluxo futuro

```text
outbox do LMS
→ política seletiva
→ destino inventariado e aprovado
→ adapter HTTP
→ receipt e readback
→ sucesso, retry ou reconciliação
```

O worker assíncrono de entrega e reconciliação ainda depende do inventário físico e do sandbox.

## Testes

```bash
npm run test:hubspot-contracts
```

A suíte cobre:

- adapter em memória e contrato de decisão com readback;
- classificação `not_synced`;
- bloqueio sem inventário;
- destino, objeto e propriedades exatos;
- ID interno obrigatório;
- PATCH e GET simulados;
- idempotência e conflito de versão;
- `429` e erros transitórios;
- erros permanentes;
- ausência de `idProperty`.

Os testes usam `fetch` controlado e não alteram um portal HubSpot.

## Gates

```text
hubspot_gateway_contract_defined = true
hubspot_test_adapter_implemented = true
hubspot_real_adapter_implemented = true
hubspot_inventory_complete = false
hubspot_sync_matrix_approved = false
engagement_signals_semantically_classified = true
engagement_destinations_mapped = false
calculation_variables_mapped = false
not_synced_categories_documented = true
sandbox_write_readback_tested = false
async_sync_tested = false
critical_readback_contract_tested = true
rate_limit_contract_tested = true
reconciliation_tested = false
outage_recovery_contract_tested = true
```
