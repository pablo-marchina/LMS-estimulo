# E12 — Scheduler e dispatcher contínuo

**Versão:** 1.0  
**Data:** 2026-07-08  
**Estado:** implementado e ativo no Supabase de testes

## Objetivo

Transformar a fila PGMQ do M10 em um sistema continuamente consumido, sem expor a fila ao navegador e sem manter uma credencial de worker permanente na chamada agendada.

## Fluxo

```text
pg_cron (30 s)
  → eventing.dispatch_worker_schedule
  → mede profundidade, receipts ativos e dispatches pendentes
  → calcula até 4 invocações × 5 mensagens
  → emite token aleatório de uso único
  → persiste apenas SHA-256 do token
  → pg_net invoca file-scan-worker
  → gateway valida JWT publicável
  → RPC service-role reivindica token atomicamente
  → worker recebe lote PGMQ e processa
```

A chave publicável atravessa apenas o gateway. A autorização real para consumir a fila é o token de dispatch de 256 bits, vinculado ao `worker_id`, com TTL de 90 segundos e uso único.

## Controle de concorrência

O dispatcher calcula:

```text
mensagens disponíveis = queue_length − receipts ativos
slots disponíveis = max_parallel − receipts ativos − dispatches pendentes
invocações = min(slots, ceil(mensagens disponíveis / batch_size))
```

Configuração atual de teste:

| Campo | Valor |
|---|---:|
| Intervalo | 30 segundos |
| Batch por worker | 5 |
| Paralelismo máximo | 4 |
| Visibility timeout | 120 segundos |
| Token TTL | 90 segundos |
| Timeout HTTP do dispatch | 5 segundos |

Advisory locks impedem dois dispatchers ou reconciliadores da mesma fila de executar simultaneamente.

## Segredos

O M11 não contém valores de ambiente. O Supabase Vault mantém:

- `estimulo_project_url`;
- `estimulo_publishable_key`.

Produção AWS não deve copiar esse mecanismo. O consumo principal será SQS → Lambda event source mapping com IAM; EventBridge Scheduler ficará para manutenção e reconciliação.
