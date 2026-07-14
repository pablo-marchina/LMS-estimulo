# Contrato do adapter HubSpot

**Versão:** 0.2  
**Data:** 2026-07-14  
**Status:** porta e adapter de teste existentes; adapter real pendente

## Objetivo

Isolar a aplicação da API física do HubSpot e garantir sincronização idempotente, observável e reconciliável.

O contrato não torna o HubSpot banco operacional do LMS e não exige readback antes de toda regra de negócio.

## Porta existente

A aplicação depende de `HubSpotDataGateway`, não de SDK ou endpoint específico.

Operações disponíveis:

```text
write(command)
readBack(receipt)
read(query)
```

A porta e o `InMemoryHubSpotAdapter` podem ser reaproveitados no adapter real.

## Escrita

Cada comando deve declarar, no mínimo:

```text
idempotencyKey
kind
objectType
objectId opcional
expectedVersion opcional
payload
```

O adapter deve:

- impedir duplicação por idempotência;
- tratar conflitos de versão;
- traduzir erros retryable;
- registrar tentativa e resultado sem expor dados sensíveis;
- suportar batch quando aplicável.

## Readback

Readback é uma capacidade do adapter, usada quando a confirmação externa é necessária.

Casos típicos:

- criação de objeto cujo ID será usado imediatamente;
- escrita crítica sujeita a workflow externo;
- atualização com expectativa de versão;
- verificação durante reconciliação.

Não é requisito executar write/readback antes de cada classificação, avaliação, progresso ou ponto.

## Leitura e snapshots

Leituras do HubSpot usadas pelo LMS devem registrar origem suficiente para auditoria:

```text
portalId
objectType
objectId
propertyOrPayloadVersion
hubspotUpdatedAt
retrievedAt
snapshotHash quando necessário
```

Validação de idade e hash é obrigatória apenas quando a regra depender da atualidade ou integridade exata do snapshot.

## Adapter em memória

`InMemoryHubSpotAdapter` existe para testes e reproduz:

- criação e atualização;
- idempotência;
- conflitos de versão;
- readback;
- atraso de visibilidade;
- `429` e `5xx`;
- alteração concorrente.

Ele não define o modelo físico da conta e não é adapter produtivo.

## Fluxos suportados

### Sincronização assíncrona padrão

```text
outbox do LMS
→ write idempotente
→ sucesso ou retry
→ reconciliação em falha permanente
```

### Escrita crítica

```text
write
→ readback
→ validar identidade/versão
→ liberar efeito dependente
```

### Entrada do HubSpot

```text
webhook ou leitura programada
→ validar origem
→ atualizar snapshot autorizado
→ registrar evento de integração
```

## Pendências do adapter real

- autenticação;
- scopes;
- objetos e propriedades;
- associações;
- busca e deduplicação;
- batch endpoints;
- webhooks;
- limites de requisição;
- tradução de erros;
- testes no sandbox.

## Testes existentes

O comando abaixo continua disponível para validar as capacidades mais estritas do gateway:

```bash
npm run test:hubspot-contracts
```

Esses testes são utilitários de integração, não gate obrigatório para toda mudança de frontend.

## Gates

```text
hubspot_gateway_contract_defined = true
hubspot_test_adapter_implemented = true
hubspot_real_adapter_implemented = false
hubspot_inventory_complete = false
projection_matrix_approved = false
async_sync_tested = false
critical_readback_tested = false
reconciliation_tested = false
```