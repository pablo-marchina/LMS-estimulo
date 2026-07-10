# Transactional outbox executável

**Versão:** 0.2  
**Estado:** funções SQL implementadas; concorrência real pendente

## Operação atômica

Na mesma transação, o caso de uso:

1. valida comando e autorização;
2. bloqueia o agregado;
3. altera o estado e incrementa `aggregate_version`;
4. chama `eventing.append_event(...)`;
5. confirma estado, evento e rotas de outbox juntos.

A função calcula o hash do payload e cria uma linha por `route_key`. O efeito externo não ocorre dentro da transação.

## Worker

`eventing.claim_outbox_batch` utiliza `FOR UPDATE SKIP LOCKED`, lease e limite de lote. O worker deve:

- publicar com `event_id` e idempotency key;
- registrar tentativa;
- completar, reagendar com backoff ou mover para dead letter;
- usar inbox do consumidor antes de executar efeito;
- nunca considerar SQS exatamente uma vez.

## Segurança de replay

Replay de projeção não chama conectores externos. Uma rota externa só é reativada por operação explícita, auditada e idempotente.

## Provas pendentes

- dois workers concorrentes não recebem a mesma linha;
- lease expirado permite recuperação;
- falha antes do commit não deixa evento órfão;
- retry não duplica ponto, certificado ou sync HubSpot;
- DLQ e reconciliação preservam `correlation_id` e causa.
