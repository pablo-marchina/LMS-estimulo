# Contrato do adapter HubSpot autoritativo

**Versão:** 0.1  
**Data:** 2026-07-10  
**Status:** Implementado no adapter de teste; adapter real bloqueado pelo inventário da conta

## 1. Objetivo

Garantir que nenhuma função de negócio use payload recém-recebido ou dado local sem origem HubSpot comprovada.

O contrato é independente de:

- nomes físicos de propriedades;
- object type IDs;
- custom objects ou app objects;
- autenticação por app privado ou OAuth;
- plano contratado;
- limites concretos da conta.

Essas decisões permanecem bloqueadas até o inventário real.

## 2. Porta obrigatória

A aplicação depende de `HubSpotDataGateway`, não da API REST nem de SDK específico.

```text
write(command)
readBack(receipt)
read(query)
```

Todo comando de escrita declara:

```text
idempotencyKey
kind
objectType
objectId opcional
expectedVersion opcional
payload
```

Toda confirmação de escrita retorna:

```text
portalId
objectType
objectId
writeId
acceptedAt
expectedPayloadHash
expectedVersion
replayed
```

## 3. Prova de origem

Uma leitura válida possui:

```text
portalId
objectType
objectId
propertyOrPayloadVersion
hubspotUpdatedAt
retrievedAt
snapshotHash
```

O gate rejeita:

- campo de origem vazio;
- timestamp inválido;
- snapshot vencido;
- snapshot no futuro;
- objeto ou versão diferente da escrita aceita;
- hash divergente do payload aceito.

## 4. Fluxo obrigatório

```text
write collected data
→ retry idempotente quando permitido
→ readback
→ validar identidade, versão, idade e hash
→ executar decisão usando HubSpotSnapshot
→ write business result
→ retry idempotente quando permitido
→ readback do resultado
→ validar identidade, versão, idade e hash
→ liberar usos posteriores
```

O callback da decisão recebe um `HubSpotSnapshot`, e não o payload bruto da requisição.

## 5. Adapter em memória

`InMemoryHubSpotAdapter` existe exclusivamente para desenvolvimento e testes automatizados.

Ele reproduz:

- criação e atualização de objetos;
- versões monotônicas;
- idempotência;
- conflito de versão;
- readback;
- atraso de visibilidade;
- falhas planejadas de escrita e leitura;
- erros retryable como `429` e `5xx`;
- alteração externa concorrente;
- métricas de tentativas e escritas confirmadas.

Ele não define o modelo físico futuro do HubSpot e não pode ser promovido como adapter produtivo.

## 6. Códigos de contrato já testados

```text
HUBSPOT_RATE_LIMITED
HUBSPOT_UNAVAILABLE
HUBSPOT_READBACK_NOT_VISIBLE
HUBSPOT_READBACK_HASH_MISMATCH
HUBSPOT_READBACK_IDENTITY_MISMATCH
HUBSPOT_READBACK_SUPERSEDED
HUBSPOT_IDEMPOTENCY_KEY_REUSED
HUBSPOT_VERSION_CONFLICT
HUBSPOT_SOURCE_STALE
HUBSPOT_SOURCE_FROM_FUTURE
HUBSPOT_OBJECT_NOT_FOUND
```

A tradução de erros HTTP reais será definida no adapter produtivo.

## 7. Evidência de decisão

Toda decisão bem-sucedida produz:

```text
decisionId
policyVersionId
executedAt
inputSources[]
resultSource
```

Isso permite provar quais snapshots HubSpot originaram o resultado.

## 8. Testes permanentes

Comando:

```bash
npm run test:hubspot-contracts
```

Casos cobertos:

1. escrita, readback, decisão, escrita do resultado e readback final;
2. `429` e consistência eventual sem duplicação;
3. indisponibilidade impedindo a decisão;
4. replay idempotente e rejeição de reuso incompatível;
5. concorrência otimista após alteração externa;
6. snapshot vencido;
7. divergência de hash antes da lógica de negócio.

O Web CI executa esse gate quando o adapter, seus contratos, seus testes ou o workflow mudam.

## 9. Pendências para o adapter real

Dependem do inventário da conta:

- autenticação;
- scopes;
- objetos e propriedades;
- associações;
- batch endpoints;
- webhooks;
- limites de requisição;
- regras de busca e deduplicação;
- estratégia física de versionamento;
- tradução de erros reais;
- testes contra sandbox HubSpot.

## 10. Gates

```text
hubspot_gateway_contract_defined = true
hubspot_test_adapter_implemented = true
write_readback_use_gate_tested = true
raw_request_payload_used_for_business_decision = false
local_only_data_used_for_business_decision = false
hubspot_real_adapter_implemented = false
hubspot_inventory_complete = false
hubspot_physical_model_approved = false
```
