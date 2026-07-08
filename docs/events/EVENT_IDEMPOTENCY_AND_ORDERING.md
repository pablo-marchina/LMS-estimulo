# Idempotência, ordenação e entrega

**Versão:** 0.1

## 1. Modelo de entrega

A infraestrutura poderá entregar o mesmo evento mais de uma vez. A plataforma garante efeitos efetivos únicos por meio de idempotência, e não por promessa de “exactly once”.

## 2. Produção atômica

Para comandos que alteram domínio:

1. validar comando;
2. bloquear/validar versão do agregado;
3. alterar estado;
4. criar evento canônico e registro de outbox;
5. confirmar tudo na mesma transação;
6. responder ao cliente;
7. dispatcher realiza entrega assíncrona.

A implementação física será definida no E10/E12. O requisito é impedir estado confirmado sem evento e evento confirmado sem o estado correspondente. O padrão de outbox é compatível com esse objetivo.

## 3. Idempotência na entrada

- comandos críticos recebem `idempotency_key` com escopo e expiração;
- observações do navegador recebem `clienteventid` UUID;
- webhooks usam o ID de entrega do provedor e assinatura;
- uploads usam hash e ID da sessão, sem assumir que hashes iguais representam a mesma intenção;
- chaves de idempotência não podem conter PII.

## 4. Idempotência no consumo

Cada consumidor mantém um inbox/checkpoint único por `(consumer_name, event_id)` e confirma o processamento junto com o efeito local quando possível.

Replays devem diferenciar:

- reconstrução de projeção;
- reexecução de integração externa;
- reenvio de notificação;
- recomputação de features.

Por padrão, replay não repete efeitos externos destrutivos.

## 5. Ordenação

Não há ordenação global.

- `aggregateversion` define ordem canônica por agregado;
- `partitionkey` agrupa eventos que precisam ser entregues em ordem;
- `clientsequence` pode ajudar a reconstruir sessão, mas não é fonte de verdade;
- consumidores detectam lacunas de versão e aguardam/reconciliam;
- eventos atrasados continuam armazenados e recebem indicador operacional.

## 6. Concorrência

Atualizações concorrentes usam controle otimista ou bloqueio transacional conforme o agregado. Uma tentativa com versão antiga deve falhar ou ser reavaliada; nunca pode gerar duas conclusões válidas do mesmo passo.

## 7. Retry e dead letter

- backoff exponencial com jitter;
- classificação entre erro transitório e permanente;
- limite por política;
- dead letter com payload protegido e erro sanitizado;
- alerta por idade da fila e taxa de falhas;
- operação de reprocessamento autorizada e auditada.

## 8. Correção de lacunas

Rotinas de reconciliação compararão:

- estado de domínio × último evento esperado;
- outbox pendente × event store;
- event store × checkpoints de consumidores;
- integração interna × HubSpot/external ID.
