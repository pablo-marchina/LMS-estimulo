# Contrato do adapter HubSpot

**Versão:** 1.0  
**Data:** 2026-07-16  
**Status:** porta e adapter de teste existentes; adapter real e cobertura completa pendentes

## Objetivo

Isolar a aplicação da API física do HubSpot e cumprir a premissa de que todos os dados do usuário capturados ou usados possuem representação no CRM.

O contrato deve garantir:

- escrita idempotente;
- leitura e readback verificáveis;
- batch e rate limiting;
- reconciliação;
- associação à identidade correta;
- cobertura de todas as categorias de dados do usuário;
- observabilidade sem exposição de segredos.

O HubSpot é o centro das informações do usuário. O PostgreSQL continua responsável por transações, event store e outbox.

## Porta atual

A aplicação depende de `HubSpotDataGateway`, não de SDK específico.

Operações existentes:

```text
write(command)
readBack(receipt)
read(query)
```

A porta deve evoluir sem acoplar o domínio à estrutura física da conta.

## Capacidades obrigatórias do adapter real

Além da interface mínima, o adapter real deve oferecer casos de uso para:

- localizar ou criar contato;
- localizar ou criar empresa;
- resolver CPF, CNPJ, e-mail, telefone e identificadores internos;
- associar contato, empresa e operação de crédito;
- materializar propriedades;
- materializar objetos personalizados;
- publicar eventos/interações comportamentais;
- atualizar histórico, progresso e credenciais;
- consultar estado necessário para deduplicação e reconciliação;
- executar batch;
- validar webhooks;
- listar divergências e reprocessar entregas.

Essas capacidades podem ser compostas sobre `write`, `read` e `readBack`, mas precisam de contratos tipados e testados.

## Comando de escrita

Cada comando deve declarar:

```text
idempotencyKey
kind
userDataCategory
objectType
objectId opcional
associationTargets
expectedVersion opcional
sourceRecordId
sourceRecordHash
payload
businessPurpose
sensitivity
requiresReadback
occurredAt
```

O adapter deve:

- impedir duplicação;
- tratar conflito de versão;
- traduzir erros retryable e permanentes;
- respeitar `429` e limites de burst/dia;
- registrar tentativa e resultado sem dados sensíveis desnecessários;
- suportar batch quando aplicável;
- retornar receipt rastreável;
- nunca aceitar segredo dentro de payload de negócio.

## Readback

Readback é obrigatório quando a confirmação externa é necessária, incluindo:

- criação de contato, empresa ou objeto cujo ID será usado imediatamente;
- deduplicação ou associação crítica;
- vínculo com operação de crédito;
- escrita sujeita a workflow externo;
- atualização com expectativa de versão;
- verificação durante reconciliação.

Não é necessário bloquear cada resposta ou progresso enquanto o CRM estiver disponível de forma assíncrona, desde que a entrega seja garantida e monitorada.

## Leitura e snapshots

Leituras usadas pelo LMS devem registrar:

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

Validação de idade, identidade e hash é obrigatória quando a regra depender do estado atual do HubSpot.

## Cobertura dos dados do usuário

O adapter deve aceitar os destinos definidos na matriz completa de dados para:

- identidade e negócio;
- crédito e contexto autorizado;
- diagnóstico e arquétipo;
- jornada e progressão;
- avaliações e práticas;
- engajamento e pontuação;
- uploads e metadados;
- credenciais;
- eventos comportamentais;
- comunicações e intervenções.

A matriz define o formato físico e a frequência. Não é permitido omitir uma categoria apenas porque o adapter ainda não possui método conveniente.

## Eventos de alta frequência

Quando o volume impedir um objeto por ação, o adapter pode usar estratégia aprovada de:

- custom behavioral events;
- batch;
- snapshot incremental;
- agregação temporal;
- referência para armazenamento detalhado recuperável.

A estratégia deve preservar usuário, tipo, tempo, sequência, contexto, versão e rastreabilidade. A perda desses campos exige aprovação explícita.

## Adapter em memória

`InMemoryHubSpotAdapter` existe para testes e reproduz:

- criação e atualização;
- idempotência;
- conflitos de versão;
- readback;
- atraso de visibilidade;
- `429` e `5xx`;
- alteração concorrente.

Ele não define:

- o modelo físico da conta;
- objetos e propriedades reais;
- limites reais da licença;
- comportamento completo de webhooks;
- cobertura de todas as categorias;
- operação produtiva.

## Fluxo assíncrono

```text
outbox do LMS
→ transformação pela matriz de dados
→ write idempotente
→ receipt
→ sucesso ou retry
→ reconciliação em falha permanente
```

## Escrita crítica

```text
write
→ readback
→ validar identidade, associação e versão
→ liberar efeito dependente
```

## Entrada do HubSpot

```text
webhook ou leitura programada
→ validar origem, assinatura e replay
→ registrar receipt
→ resolver identidade
→ atualizar snapshot autorizado
→ registrar evento de integração
```

## Reconciliação

A reconciliação deve detectar:

- item da outbox sem representação HubSpot;
- registro HubSpot ausente;
- associação incorreta;
- versão atrasada;
- hash divergente;
- duplicidade;
- evento comportamental faltante;
- categoria de dado sem destino;
- erro permanente;
- backlog acima do SLO.

Ela deve oferecer dry run, relatório, correção idempotente e trilha de auditoria.

## Pendências do adapter real

- autenticação;
- scopes;
- portal e licença;
- objetos e propriedades;
- objetos/eventos personalizados;
- associações;
- busca e deduplicação;
- batch endpoints;
- webhooks;
- limites de requisição;
- tradução de erros;
- reconciliação;
- testes no sandbox;
- teste de recuperação após indisponibilidade;
- prova de cobertura completa da matriz.

## Testes existentes

```bash
npm run test:hubspot-contracts
```

Os testes atuais validam o contrato abstrato. Não encerram a integração física.

## Gates

```text
hubspot_gateway_contract_defined = true
hubspot_test_adapter_implemented = true
hubspot_real_adapter_implemented = false
hubspot_inventory_complete = false
complete_user_data_matrix_approved = false
all_user_data_categories_mapped = false
behavioral_event_destination_approved = false
async_sync_tested = false
critical_readback_tested = false
rate_limit_tested = false
reconciliation_tested = false
outage_recovery_tested = false
```
