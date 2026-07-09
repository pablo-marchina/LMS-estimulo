# E12 — Validação concorrente de runtime

**Data:** 2026-07-08  
**Ambiente:** Supabase gerenciado, PostgreSQL 17, PGMQ, pg_cron, pg_net e Edge Runtime

## Prova

Foram publicados 20 jobs técnicos com tipo deliberadamente incompatível com o scanner. O cron de 30 segundos detectou backlog 20 e abriu quatro invocações em paralelo, respeitando `max_parallel_invocations=4` e `batch_size=5`.

## Resultado

| Medida | Resultado |
|---|---:|
| Jobs | 20 |
| Workers distintos | 4 |
| Jobs por worker | 5 |
| Receipts | 20 |
| Jobs distintos com receipt | 20 |
| Attempts | 20 |
| HTTP dispatch 2xx | 4/4 |
| Duplicatas de job | 0 |
| Dead letters esperadas | 20 |

Cada worker recebeu exatamente cinco jobs. Como o tipo era inválido de propósito, todos foram encaminhados à DLQ, comprovando também a classificação de erro permanente.

## Alerta e limpeza

O backlog de DLQ abriu alerta crítico. A prova foi então removida integralmente:

- zero jobs da prova;
- zero receipts/attempts da prova;
- zero mensagens na source queue;
- zero mensagens na DLQ;
- zero tokens pendentes;
- zero alertas ativos.

O histórico agregado do PGMQ permanece, pois `total_messages` é contador histórico e não deve ser apagado para mascarar provas.
