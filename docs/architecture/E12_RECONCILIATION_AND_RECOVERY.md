# E12 — Reconciliação e autorrecuperação

**Versão:** 1.0  
**Data:** 2026-07-08  
**Estado:** implementado e testado

## Invariantes

1. Um job de domínio possui identidade estável, mesmo após republicação ou redrive.
2. Cada recebimento cria um receipt diferente.
3. O efeito é idempotente por `queue_job_id`.
4. Mensagem física e estado governado são reconciliáveis.
5. Arquivo não é liberado até resultado de scan limpo.

## Rotas automáticas

`eventing.reconcile_queue_system` executa a cada minuto e:

- expira receipts cujo prazo venceu;
- marca attempts como `visibility_expired`;
- devolve jobs sem receipt ativo para `retry_scheduled`;
- republica jobs cujo registro físico desapareceu;
- arquiva mensagens residuais de jobs terminais;
- envia envelopes inválidos ou órfãos à DLQ;
- cria scan job para arquivo `scan_pending` sem `scan_job_id`.

`eventing.reconcile_dispatch_requests` registra status e erro das chamadas assíncronas do `pg_net`, além de expirar tokens não consumidos.

## Recuperação entre efeito e ack

Antes de escanear, o worker consulta `file_get_scan_job_state`.

- Se nenhum resultado existe, executa o scan normalmente.
- Se o scan já foi persistido, não cria outro resultado.
- Se o arquivo está `release_pending`, conclui a movimentação idempotente.
- Se o efeito já terminou, executa somente o ack.
- A tentativa fica registrada como `duplicate_suppressed`.

## Provas transacionais

| Falha simulada | Resultado |
|---|---|
| Mensagem física removida | republicada com novo provider message ID |
| Receipt vencido | `expired`, attempt `visibility_expired`, job `retry_scheduled` |
| Envelope inválido | removido da source queue e enviado à DLQ |
| Arquivo sem scan job | job e mensagem recriados |
| Scan aplicado antes do ack | um único scan, arquivo `clean`, job `completed`, duplicata suprimida |
| Token usado por outro worker | rejeitado |
| Replay do token | rejeitado |

Todas as provas de falha foram revertidas ou limpas; nenhuma mensagem ou arquivo artificial permaneceu.
