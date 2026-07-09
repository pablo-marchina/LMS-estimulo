# E12 — Observabilidade e alertas operacionais

**Versão:** 1.0  
**Data:** 2026-07-08  
**Estado:** implementado; thresholds provisórios

## Dados persistidos

- `scheduler_runs`: cada dispatch e reconciliação;
- `worker_dispatch_tokens`: emissão, claim e resposta HTTP;
- `queue_metric_snapshots`: série temporal de saúde da fila;
- `queue_alert_policies`: regras versionáveis por configuração;
- `operational_alerts`: abertura, reconhecimento e resolução.

## Métricas

- profundidade da source queue;
- idade da mensagem mais antiga;
- total histórico de mensagens;
- receipts em voo;
- receipts expirados em cinco minutos;
- dispatches HTTP com falha;
- falhas dos jobs pg_cron;
- dead letters abertas;
- arquivos `scan_pending` e `release_pending`;
- idade do `scan_pending` mais antigo;
- jobs por estado.

## Policies atuais

| Alerta | Warning | Critical |
|---|---:|---:|
| Queue length | 20 | 100 |
| Oldest message age | 120 s | 300 s |
| Open dead letters | 1 | 5 |
| Expired receipts/5 min | 3 | 10 |
| Dispatch failures/5 min | 1 | 3 |
| Cron failures/5 min | 1 | 3 |
| Oldest scan pending | 300 s | 900 s |

Os valores são guardrails iniciais, não SLAs validados. Devem ser recalibrados com volume, duração p95/p99, custo e criticidade reais.

## Ciclos

- métricas e alertas: a cada minuto;
- reconciliação: a cada minuto;
- limpeza de históricos: diariamente às 03:17 UTC;
- retenção: tokens 2 dias; snapshots, scheduler runs e cron runs 30 dias.

## Prova de alerta

A prova concorrente criou 20 dead letters controladas. O alerta `dead_letters_open` abriu como `critical`, valor 20. Depois da limpeza e novo snapshot, foi resolvido automaticamente. O estado final possui zero alertas ativos.

A API operacional é server-side:

- `queue_get_operational_status`;
- `queue_acknowledge_alert`.

`anon` e `authenticated` não têm EXECUTE nessas RPCs.
