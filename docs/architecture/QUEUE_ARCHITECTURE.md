# Arquitetura de fila e worker assíncrono

**Versão:** 1.0  
**Data:** 2026-07-08  
**Ambiente comprovado:** Supabase/PostgreSQL 17 com PGMQ  
**Destino de produção:** AWS SQS Standard + DLQ

## 1. Objetivo

A fila desacopla trabalhos demorados ou falháveis do request transacional sem introduzir semântica específica de um provedor no domínio. O primeiro consumidor é o scan de arquivos, mas o modelo é genérico para integrações, projeções, notificações e computações futuras.

O contrato da aplicação assume **entrega pelo menos uma vez**. Duplicatas, reentregas após timeout e falhas entre efeito e acknowledgement são condições normais do sistema, não exceções impossíveis.

## 2. Fronteiras

```text
Caso de uso / domínio
        ↓
QueueProvider
        ↓
┌──────────────────────┬──────────────────────┐
│ Supabase de testes   │ AWS produção         │
│ PGMQ                 │ SQS Standard         │
│ pgmq.read/set_vt     │ Receive/ChangeVT     │
│ archive              │ DeleteMessage        │
│ fila DLQ explícita   │ Redrive policy/DLQ   │
└──────────────────────┴──────────────────────┘
```

O worker recebe somente o contrato normalizado. Ele não conhece `msg_id`, receipt handle nativo do SQS, nomes físicos de tabelas PGMQ ou SDK específico do provedor.

## 3. Modelo persistente

| Tabela | Finalidade |
|---|---|
| `eventing.queue_definitions` | Configuração lógica da fila, provider físico, visibility timeout, tentativas, batch e retry policy. |
| `eventing.queue_jobs` | Identidade estável e deduplicável do trabalho. |
| `eventing.queue_receipts` | Receipt handle novo a cada recebimento, ownership do worker e prazo de visibilidade. |
| `eventing.queue_attempts` | Auditoria de cada execução e desfecho. |
| `eventing.queue_dead_letters` | Registro governado de poison messages e redrive. |

As tabelas físicas do PGMQ são implementação do adapter e não fonte de verdade do domínio.

## 4. Identidade e idempotência

- `job_id` permanece estável entre retry e redrive;
- `deduplication_key` impede publicação lógica duplicada;
- cada `receive` cria um `receipt_handle` novo;
- acknowledgement exige o receipt atual e o mesmo `worker_id`;
- efeitos de negócio usam `job_id` como chave idempotente;
- `core.file_security_scans.queue_job_id` é único;
- o resultado repetido de scan retorna `already_applied=true` em vez de duplicar fatos.

## 5. Estados

### Job

```text
created → queued → in_flight
                    ├─ completed
                    ├─ retry_scheduled → in_flight
                    ├─ dead_lettered → queued (redrive)
                    └─ cancelled
```

### Receipt

```text
in_flight → acked
          → released
          → expired
          → dead_lettered
          → superseded
```

### Attempt

```text
processing → succeeded
           → retry_scheduled
           → visibility_expired
           → dead_lettered
           → duplicate_suppressed
           → failed
```

## 6. Configuração inicial

| Parâmetro | Valor de teste |
|---|---:|
| Queue code | `file_scan` |
| Source queue | `estimulo_file_scan_jobs` |
| DLQ | `estimulo_file_scan_dlq` |
| Visibility timeout | 120 s |
| Max receive count | 5 |
| Batch máximo | 10 |
| Retenção declarada | 14 dias |
| Retry | exponencial, base 15 s, cap 900 s, full jitter |

A retenção declarada é parte do contrato portável. A configuração física equivalente ainda deve ser aplicada e comprovada no SQS.

## 7. Lifecycle operacional

### Publish

1. valida a queue definition;
2. calcula SHA-256 do payload;
3. cria `queue_jobs` com dedup key única;
4. publica o envelope no provider;
5. registra message id físico e `queued`;
6. publicação repetida retorna o mesmo `job_id`.

### Receive

1. provider torna a mensagem invisível;
2. envelope e `job_id` são validados;
3. receipt antigo vencido é marcado `expired`;
4. jobs concluídos ou mortos são suprimidos;
5. excesso de recebimentos vai para DLQ;
6. receipt e attempt são criados;
7. worker recebe payload normalizado.

### Retry

- não cria novo job;
- muda a visibilidade da mesma mensagem;
- encerra o receipt atual como `released`;
- o próximo receive produz novo receipt e incrementa `receive_count`;
- ao atingir `max_attempts`, move para DLQ.

### Acknowledgement

- arquiva/remove a mensagem física;
- marca receipt `acked`;
- marca attempt `succeeded`;
- marca job `completed`;
- repetição do ack do mesmo receipt concluído retorna sucesso idempotente.

### DLQ e redrive

- snapshot do envelope e motivo são preservados;
- mensagem física é publicada na DLQ antes de arquivar a origem;
- redrive mantém o mesmo `job_id`;
- redrive zera o contador operacional do job, mas mantém histórico de attempts e dead letter;
- redrive sem corrigir a causa é operação proibida pelo runbook.

## 8. Integração com arquivos

A confirmação do upload e a criação do scan job acontecem na mesma transação PostgreSQL:

```text
confirm upload
  ├─ cria file_object em scan_pending
  ├─ publica job file.malware_scan.requested
  ├─ grava scan_job_id
  └─ confirma upload_intent
```

Se a publicação falhar, a transação inteira é revertida. Não existe arquivo confirmado como aguardando scan sem identidade de trabalho persistida.

## 9. Autenticação do worker no Supabase de testes

O endpoint `file-scan-worker` usa duas barreiras:

1. `verify_jwt=true` no gateway;
2. token aleatório de dispatch de uso único, com hash persistido, worker vinculado e TTL de 90 segundos.

A chave publicável atravessa somente o gateway; o consumo é autorizado pelo claim atômico do token usando RPC server-side. O mecanismo é específico do ambiente de teste e **não será copiado para AWS**.

Na AWS, a identidade de workload deverá usar IAM e políticas mínimas para Receive/Delete/ChangeVisibility, leitura do prefixo de quarentena, escrita no prefixo protegido e chamada do scanner.

## 10. Limitações atuais

- não há scheduler automático chamando o Edge Worker;
- não houve benchmark concorrente com múltiplos workers;
- o scanner embutido é somente prova técnica para `e12_storage_proof`;
- perfis reais falham fechados e são enviados à DLQ;
- SQS, IAM, EventBridge e scanner AWS ainda não foram comprovados;
- métricas, alarmes e auto-scaling ainda não foram provisionados;
- o histórico remoto fragmenta M10 em migrations operacionais; o pacote conserva M10 consolidado.
