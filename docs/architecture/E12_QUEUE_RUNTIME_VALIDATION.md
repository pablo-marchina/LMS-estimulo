# E12 — Validação de runtime da fila e do worker

**Data:** 2026-07-08  
**Resultado:** aprovado para o ambiente Supabase de teste, com limitações de produção registradas

## 1. Provas de protocolo no PostgreSQL real

### Deduplicação, visibility, retry e ack

Resultado observado:

```json
{
  "deduplication_stable": true,
  "first_receive": true,
  "visibility_extended": true,
  "retry_result": "retry_scheduled",
  "second_receive": true,
  "second_receive_count": 2,
  "ack_result": true,
  "ack_idempotent": true,
  "final_job_status": "completed",
  "attempt_rows": 2,
  "remaining_visible_messages": 0
}
```

### DLQ e redrive

```json
{
  "retry_1": "retry_scheduled",
  "retry_2": "dead_lettered",
  "moved_to_dlq": true,
  "redrive_preserved_job_identity": true,
  "received_after_redrive": true,
  "ack_after_redrive": true,
  "final_status": "completed",
  "dead_letter_status": "redriven",
  "remaining_source": 0,
  "remaining_dlq": 0
}
```

As provas foram executadas em transações revertidas; não deixaram jobs ou mensagens artificiais.

## 2. Prova de integração banco + arquivo

A confirmação simulada criou o file object e o scan job na mesma transação. O mesmo resultado de scan foi aplicado duas vezes.

```json
{
  "file_created": true,
  "scan_job_created": true,
  "job_received": true,
  "first_scan_applied": true,
  "duplicate_scan_suppressed": true,
  "file_status": "clean",
  "job_status": "completed",
  "scan_rows": 1,
  "remaining_messages": 0
}
```

## 3. Prova Edge Runtime real

Foi criado um fixture efêmero com arquivo de 50 bytes e SHA-256 esperado. Um invocador temporário autenticou a chamada interna do worker por JWT de gateway + HMAC com timestamp.

Trilha canônica observada:

| Campo | Resultado |
|---|---|
| Worker | `e12-edge-runtime-proof` |
| Job | `completed` |
| Receipt | `acked` |
| Attempt | `succeeded` |
| Scan | `clean` |
| Scanner | `e12-proof-integrity-scanner` |
| File | `clean` |
| Prefixo final | `protected/` |
| Source messages residuais | 0 |
| DLQ messages residuais | 0 |
| Objetos Storage residuais | 0 |

O invocador temporário foi substituído pela versão final do `file-storage` com JWT obrigatório. O fixture, linhas de auditoria, mensagem arquivada e extensão HTTP de prova foram removidos em migration controlada; os triggers append-only foram reativados na mesma transação.

## 4. Funções finais

| Função | Versão | JWT |
|---|---:|---|
| `file-storage` | 6 | obrigatório |
| `file-scan-worker` | 2 | obrigatório + HMAC interno |

## 5. Segurança de RPC

As nove RPCs de fila/scan foram verificadas:

- `anon`: sem EXECUTE;
- `authenticated`: sem EXECUTE;
- `service_role`: EXECUTE permitido.

## 6. Estrutura final

| Métrica | Resultado |
|---|---:|
| Tabelas da aplicação | 130 |
| Foreign keys | 233 |
| Check constraints | 76 |
| Índices incluindo PK/unique | 425 |
| Triggers | 29 |
| Policies RLS | 215 |
| Tabelas com RLS | 57 |
| Tabelas RLS sem policy | 0 |
| FKs sem índice | 0 |
| Filas PGMQ | 2 |
| Source queue length | 0 |
| DLQ length | 0 |
| Security Advisor | 0 lints |

O Performance Advisor retornou somente `unused_index`, esperado antes de carga representativa.

## 7. Testes de código

A suíte v1.8 aprovou 24 testes:

- identidade Supabase e tokens assimétricos/legados;
- contrato de storage;
- adapter Supabase Storage;
- contrato de fila;
- adapter Supabase Queue;
- assinatura interna HMAC;
- scanner técnico clean/EICAR/unsupported;
- rejeição por hash e tamanho divergentes.

## 8. Não comprovado

- consumo automático periódico;
- múltiplos workers simultâneos;
- recuperação após kill real no meio do scan;
- carga, throughput e latência;
- scanner antimalware de produção;
- paridade no SQS e DLQ AWS;
- identidade IAM da workload;
- alarmes, dashboards e autoscaling.
