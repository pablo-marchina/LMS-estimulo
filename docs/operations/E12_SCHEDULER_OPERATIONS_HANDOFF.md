# E12 — Handoff operacional do scheduler e worker

## Estado ativo

- `estimulo-file-scan-dispatch`: 30 segundos;
- `estimulo-queue-reconcile`: 1 minuto;
- `estimulo-queue-metrics-alerts`: 1 minuto;
- `estimulo-scheduler-history-cleanup`: 03:17 UTC;
- `file-scan-worker` v3, JWT obrigatório;
- source queue e DLQ vazias;
- nenhum alerta ativo.

## Verificações diárias

1. consultar `queue_get_operational_status('file_scan')`;
2. verificar cron runs diferentes de `succeeded`;
3. investigar toda dead letter antes de redrive;
4. confirmar idade do backlog e de `scan_pending`;
5. manter tokens e URLs assinadas fora de logs.

## Pausa de emergência

```sql
update eventing.worker_schedules set status='paused' where code='file_scan_worker';
select cron.unschedule('estimulo-file-scan-dispatch');
```

Pausar dispatch não remove mensagens. A reconciliação e métricas podem permanecer ativas.

## Retomada

```sql
update eventing.worker_schedules set status='active' where code='file_scan_worker';
select cron.schedule(
  'estimulo-file-scan-dispatch',
  '30 seconds',
  $$select eventing.dispatch_worker_schedule('file_scan_worker');$$
);
```

## Vault

Os valores de `estimulo_project_url` e `estimulo_publishable_key` são configuração de ambiente. Não exportar para documentação, migrations, logs ou frontend.

## Limites

O scanner `e12-proof-integrity-scanner` continua sendo prova técnica. A operação contínua está comprovada, mas arquivos reais permanecem bloqueados até a adoção do scanner aprovado e de perfis de upload de produto.
