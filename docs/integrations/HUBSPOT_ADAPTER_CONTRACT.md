# Contrato do adapter HubSpot

**Versão:** 1.1  
**Data:** 2026-07-16  
**Status:** porta e adapter de teste existentes; adapter real pendente

## Objetivo

Isolar a aplicação da API física do HubSpot e sincronizar somente:

- identificadores mínimos de vínculo;
- sinais de engajamento na plataforma;
- entradas, features e resultados úteis para cálculos aprovados.

O PostgreSQL continua responsável pelo estado operacional, event store e histórico detalhado.

## Porta atual

A aplicação depende de `HubSpotDataGateway`:

```text
write(command)
readBack(receipt)
read(query)
```

A porta pode evoluir, mas o domínio não deve depender do SDK ou da estrutura física da conta.

## Classificação obrigatória

Todo comando deve possuir:

```text
syncClassification
businessPurpose
calculationOrEngagementUse
sourceRecordId
sourceRecordHash
idempotencyKey
objectType
objectId opcional
associationTargets
payload
sensitivity
requiresReadback
occurredAt
```

`syncClassification` aceita:

```text
linking_identifier
engagement_signal
calculation_input_or_result
```

Itens classificados como `not_synced` não geram comando HubSpot.

## Capacidades do adapter real

- localizar ou criar contato quando necessário;
- localizar empresa e operação relacionada;
- resolver identificadores mínimos e conflitos;
- materializar propriedades;
- publicar eventos ou atividades de engajamento;
- materializar objetos personalizados quando justificado;
- atualizar features e resultados calculados;
- executar batch;
- validar webhooks;
- consultar estado para readback e reconciliação;
- listar divergências e reprocessar entregas.

## Escrita

O adapter deve:

- impedir duplicação por idempotência;
- tratar conflitos de versão;
- traduzir erros retryable e permanentes;
- respeitar `429` e limites;
- suportar batch;
- retornar receipt rastreável;
- não aceitar segredo em payload de negócio;
- validar que a categoria possui finalidade e destino aprovados.

## Readback

Readback é obrigatório para:

- criação ou resolução de contato/empresa;
- deduplicação e associação crítica;
- vínculo com operação de crédito;
- escrita consumida imediatamente por workflow externo;
- atualização com expectativa de versão;
- reconciliação.

Não é necessário bloquear cada ação de aprendizagem durante a sincronização assíncrona.

## Leitura e snapshots

Leituras devem registrar:

```text
portalId
objectType
objectId
associationContext
propertyOrPayloadVersion
hubspotUpdatedAt
retrievedAt
snapshotHash
sourceQuery
```

## Cobertura de engajamento

O adapter deve suportar destinos para:

- acesso e recorrência;
- progresso e conclusão;
- participação e utilidade;
- tentativas e resultados agregados;
- práticas e uploads por status;
- pontos, conquistas, recompensas e ranking;
- selos e certificados;
- abandono, retomada e sequência de marcos.

## Cobertura de cálculo

O adapter deve suportar:

- respostas selecionadas quando necessárias;
- dimensões e escores;
- arquétipo e maturidade;
- features comportamentais derivadas;
- variáveis contextuais autorizadas;
- resultados de classificação, personalização e pesquisa.

Cada variável deve carregar versão, origem e finalidade.

## Dados excluídos

O adapter não deve sincronizar automaticamente:

- configurações e conteúdo editorial;
- payloads brutos sem finalidade;
- arquivos binários e URLs assinadas;
- logs, traces, filas e retries;
- tokens, credenciais e segredos;
- dados temporários de processamento.

## Adapter em memória

O `InMemoryHubSpotAdapter` reproduz criação, atualização, idempotência, readback, atraso de visibilidade, `429`, `5xx` e concorrência.

Ele não comprova:

- modelo físico da conta;
- limites reais da licença;
- webhooks reais;
- cobertura de engajamento e cálculo;
- operação produtiva.

## Fluxo assíncrono

```text
outbox do LMS
→ filtro e transformação pela matriz
→ write idempotente
→ receipt
→ sucesso, retry ou reconciliação
```

## Reconciliação

A reconciliação deve detectar:

- item elegível não entregue;
- registro ou associação ausente;
- versão atrasada;
- hash divergente;
- duplicidade;
- feature ou resultado desatualizado;
- categoria sem destino;
- backlog acima do SLO.

Deve oferecer dry run, relatório, correção idempotente e auditoria.

## Testes

```bash
npm run test:hubspot-contracts
```

Os testes atuais validam o contrato abstrato, não a integração física.

## Gates

```text
hubspot_gateway_contract_defined = true
hubspot_test_adapter_implemented = true
hubspot_real_adapter_implemented = false
hubspot_inventory_complete = false
hubspot_sync_matrix_approved = false
engagement_signals_mapped = false
calculation_variables_mapped = false
not_synced_categories_documented = false
async_sync_tested = false
critical_readback_tested = false
rate_limit_tested = false
reconciliation_tested = false
outage_recovery_tested = false
```
