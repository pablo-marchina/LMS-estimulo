# E12 — Handoff operacional da fila e do worker

**Data:** 2026-07-08  
**Ambiente:** Supabase de testes

## Componentes ativos

- extensão `pgmq`;
- fila `estimulo_file_scan_jobs`;
- DLQ `estimulo_file_scan_dlq`;
- Edge Function `file-scan-worker` v2;
- Edge Function `file-storage` v6;
- migration canônica M10;
- cinco tabelas governadas de fila;
- RPCs server-side de publish/receive/visibility/ack/retry/DLQ/redrive/metrics.

## Estado operacional atual

- source queue: vazia;
- DLQ: vazia;
- Security Advisor: zero lints;
- worker: implantado, mas sem scheduler automático;
- scanner: somente prova técnica para `e12_storage_proof`;
- perfis não suportados: falham fechados e vão para DLQ.

## Como invocar o worker no ambiente de teste

O caller confiável deve:

1. gerar corpo JSON final;
2. calcular timestamp Unix em segundos;
3. solicitar um token de dispatch de uso único e enviá-lo com o `workerId`;
4. usar JWT válido para atravessar o gateway;
5. enviar `x-worker-timestamp` e `x-worker-signature`;
6. nunca registrar segredo, assinatura ou JWT.

A tolerância de relógio é 60 segundos. Relógios do caller e Edge Runtime devem estar sincronizados.

## Payload de invocação

```json
{
  "maxMessages": 5,
  "visibilityTimeoutSeconds": 120,
  "workerId": "file-scan-worker-<instance>"
}
```

## Operações de fila

### Retry

Use apenas para erro transitório: Storage indisponível, timeout, falha temporária de scanner ou rede. O worker usa backoff exponencial com full jitter e cap de 900 segundos.

### DLQ

Use para erro permanente ou excesso de tentativas. Toda DLQ exige:

- causa identificada;
- correção comprovada;
- registro do operador/motivo;
- redrive controlado;
- verificação posterior de recorrência.

### Redrive

Não cria novo job. Preserva `job_id`, histórico de attempts e dead letter. Nunca redrive em massa sem limite e observação.

## Queries operacionais

Preferir `public.queue_get_metrics` via serviço interno. O schema `pgmq` não deve ser exposto ao frontend.

Investigar também:

- `eventing.queue_jobs` por status/idade;
- `eventing.queue_receipts` em `in_flight` vencidos;
- `eventing.queue_attempts` por error code;
- `eventing.queue_dead_letters` abertas;
- `core.file_objects` em `scan_pending`/`release_pending`.

## Runbook resumido

| Sintoma | Ação inicial |
|---|---|
| Queue age crescendo | verificar scheduler, worker errors, capacidade e downstream. |
| DLQ > 0 | pausar redrive, classificar erro e corrigir causa. |
| `scan_pending` sem job | incidente de integridade; reconciliar e bloquear download. |
| Objeto em `protected/`, DB pendente | rerodar conclusão idempotente. |
| Job completed, arquivo não clean | investigar resultado de scan e nunca liberar download. |
| Muitos visibility expirations | aumentar heartbeat/capacidade ou reduzir batch. |
| Assinatura interna rejeitada | verificar relógio, corpo exato e segredo do runtime. |

## Proibições

- não usar `e12_storage_proof` com participantes;
- não tratar EICAR proof scanner como antivírus;
- não expor RPCs da fila ao browser;
- não acessar tabelas PGMQ diretamente no produto;
- não copiar o token de dispatch para AWS; usar IAM e event source mapping;
- não apagar histórico append-only para corrigir incidentes;
- não remover índices por advisor antes de carga real.

## Próximos passos obrigatórios

1. scheduler confiável para testes;
2. scanner de produção;
3. teste concorrente e fault injection;
4. métricas/alertas;
5. SQS/IAM/S3/GuardDuty no AWS staging;
6. política real de retenção e cleanup;
7. JWT real de participante e teste de pool.
