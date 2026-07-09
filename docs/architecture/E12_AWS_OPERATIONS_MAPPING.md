# E12 — Mapeamento operacional Supabase → AWS

## Princípio

O domínio não depende de `pg_cron`, `pg_net` ou PGMQ. Esses componentes são adapters do ambiente de teste. Produção preserva `job_id`, deduplication key, receipt/attempt, idempotência, DLQ, métricas e reconciliação.

## Mapeamento

| Contrato | Supabase de testes | AWS staging/produção |
|---|---|---|
| Queue | PGMQ logged queue | SQS Standard |
| DLQ | PGMQ queue separada | SQS DLQ + redrive policy |
| Consumo contínuo | pg_cron + pg_net | Lambda event source mapping |
| Limite de concorrência | configuração do dispatcher | maximum concurrency do event source mapping |
| Visibility | `pgmq.read` / `set_vt` | SQS visibility timeout / ChangeMessageVisibility |
| Métricas | snapshots PostgreSQL | CloudWatch + projeção governada |
| Alarme | `operational_alerts` | CloudWatch Alarm + SNS/PagerDuty, mantendo registro interno |
| Reconciliação | pg_cron | EventBridge Scheduler ou ECS/Lambda de manutenção |
| Autorização | token único + service role | IAM execution role e resource policies |
| Arquivos | Supabase Storage | S3 quarantine/protected |
| Scan | scanner técnico | GuardDuty Malware Protection ou scanner aprovado |

SQS Standard deve ser tratado como entrega pelo menos uma vez; o estado governado e os efeitos continuam idempotentes. Métricas operacionais equivalentes incluem backlog visível, mensagens não visíveis e idade da mensagem mais antiga. A DLQ precisa de alarme próprio.

## Diferença importante

EventBridge Scheduler possui precisão de minuto e não é o mecanismo ideal para polling frequente da fila. O consumo principal deve ser orientado pelo event source mapping SQS → Lambda. Scheduler fica para reconciliação, métricas complementares, redrive controlado e limpeza.

## Gate AWS

Antes da produção:

1. provisionar RDS, SQS/DLQ, Lambda, S3, KMS e observabilidade por IaC;
2. executar testes de paridade com duplicata, visibility, crash pós-efeito, DLQ e redrive;
3. testar concorrência e partial batch response;
4. definir reserved/maximum concurrency e orçamento;
5. validar alarmes e runbooks em staging;
6. substituir thresholds provisórios por SLOs aprovados.
