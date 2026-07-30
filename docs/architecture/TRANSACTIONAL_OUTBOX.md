# Transactional outbox executável

**Revisado em:** 2026-07-30  
**Estado:** funções SQL implementadas; worker e operação de produção pendentes

## Operação atômica

Na mesma transação, o caso de uso:

1. valida comando e autorização;
2. bloqueia o agregado;
3. altera o estado e incrementa `aggregate_version`;
4. chama `eventing.append_event(...)`;
5. confirma estado, evento e rotas de outbox juntos.

A função calcula o hash do payload e cria uma linha por `route_key`. O efeito externo não ocorre dentro da transação.

## Consumidor futuro

`eventing.claim_outbox_batch` utiliza `FOR UPDATE SKIP LOCKED`, lease e limite de lote. Um consumidor deve:

- publicar com `event_id` e idempotency key;
- registrar tentativa;
- completar, reagendar com backoff ou isolar falha não recuperável;
- usar inbox do consumidor antes de executar efeito;
- assumir entrega pelo menos uma vez;
- não depender de garantia física de exatamente uma vez.

O provider, mecanismo de entrega, dead letter e identidade de workload de produção ainda dependem de ADR.

## Segurança de replay

Replay de projeção não chama conectores externos. Uma rota externa só é reativada por operação explícita, auditada e idempotente.

## Provas pendentes do Gate B

- dois consumidores concorrentes não recebem a mesma linha;
- lease expirado permite recuperação;
- falha antes do commit não deixa evento órfão;
- retry não duplica ponto, certificado ou sincronização externa;
- isolamento e reconciliação preservam `correlation_id` e causa;
- saturação e backlog geram backpressure e alertas;
- recuperação funciona no provider AWS aprovado.
