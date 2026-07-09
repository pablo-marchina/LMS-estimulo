# E12 — Mapeamento PGMQ para AWS SQS

**Data:** 2026-07-08

## 1. Princípio

PGMQ é o adapter de testes. SQS Standard é o destino de produção. O contrato foi deliberadamente limitado ao menor denominador comum seguro: entrega pelo menos uma vez, duplicatas possíveis, visibility timeout, acknowledgement explícito, retry, DLQ e redrive.

## 2. Mapeamento

| Contrato Estímulo | Supabase/PGMQ | AWS |
|---|---|---|
| Publish | `pgmq.send` | `SendMessage` |
| Delay | delay do PGMQ | message delay / retry scheduling |
| Receive batch | `pgmq.read` | `ReceiveMessage` |
| Receipt handle | UUID da aplicação + msg id interno | receipt handle nativo normalizado |
| Visibility | `pgmq.set_vt` | `ChangeMessageVisibility` |
| Ack | `pgmq.archive` | `DeleteMessage` |
| Retry | nova visibilidade | visibility timeout/change visibility |
| DLQ | segunda fila PGMQ + registro canônico | SQS DLQ + redrive policy |
| Redrive | republicação preservando job id | StartMessageMoveTask ou operador controlado |
| Métricas | `pgmq.metrics` + tabelas canônicas | CloudWatch + tabelas canônicas |

## 3. Topologia AWS alvo

```text
API / caso de uso
      ↓
PostgreSQL/RDS transaction + queue job/outbox
      ↓
SQS file-scan
      ↓
Lambda ou ECS/Fargate worker
      ↓
S3 quarantine object
      ↓
GuardDuty Malware Protection ou scanner aprovado
      ↓
clean → S3 protected
infected/manual → isolamento + revisão
      ↓
ack / retry / DLQ
```

A decisão entre publicação direta no SQS e outbox relay será fechada no staging. Para fatos que precisam ser atômicos com estado relacional, o outbox continua obrigatório.

## 4. Configuração inicial proposta para staging

| Item | Proposta inicial | Regra de validação |
|---|---:|---|
| Queue type | Standard | FIFO somente se houver necessidade demonstrada de ordenação/grupo. |
| Visibility timeout | 120 s | Ajustar por p99 do scan e heartbeat. |
| Max receive count | 5 | Medir transient failures e poison messages. |
| Source retention | 4 dias ou mais | Fechar conforme SLA e custo. |
| DLQ retention | maior que source | Preservar janela de investigação. |
| Batch | 1–10 | Medir memória, duração e partial batch failures. |
| Long polling | 20 s | Reduzir empty receives. |
| Encryption | SSE-KMS | Chave e grants por ambiente. |

Valores finais dependem de benchmark e política de retenção.

## 5. Identidade e autorização

Supabase de teste usa JWT do gateway e token de dispatch de uso único. AWS usará:

- IAM role por workload;
- policy mínima por fila e bucket;
- KMS grants explícitos;
- nenhuma chave estática no código;
- CloudTrail para chamadas administrativas;
- secrets somente para integrações externas que realmente precisem deles.

## 6. Idempotência

SQS Standard pode entregar a mesma mensagem mais de uma vez. Portanto:

- `job_id` é a identidade de trabalho;
- dedup key é persistida no banco;
- o efeito de scan é único por `queue_job_id`;
- a promoção do objeto é idempotente;
- ack repetido não recria efeito;
- retry e redrive preservam a identidade lógica.

## 7. Alarmes mínimos

- `ApproximateAgeOfOldestMessage`;
- número de mensagens visíveis e não visíveis;
- DLQ depth > 0;
- taxa de retries e receive count;
- duração p50/p95/p99 do worker;
- erros de S3/scanner/KMS;
- arquivos presos em `scan_pending` ou `release_pending`;
- divergência entre fila física e `eventing.queue_jobs`.

## 8. Gate de paridade

A AWS não estará aprovada até repetir:

1. deduplicação lógica;
2. receive com receipt novo;
3. visibility heartbeat;
4. retry e receive count;
5. max receive → DLQ;
6. redrive preservando job id;
7. duplicate scan suppression;
8. move idempotente para `protected/`;
9. falha entre efeito e ack;
10. concorrência de múltiplos workers;
11. cleanup/reconciliação;
12. restore e observabilidade.
