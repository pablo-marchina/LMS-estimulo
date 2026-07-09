# Relatório de integridade — pacote v1.9

**Data:** 2026-07-08  
**Escopo:** M00–M11, Edge Functions, scheduler, reconciliação, métricas, alertas e documentação operacional.

## Resultado

| Verificação | Resultado |
|---|---:|
| Testes Node | 24/24 aprovados |
| Migrations canônicas | 12/12 |
| Verificador M00–M11 | aprovado |
| Edge Functions transpile | 2/2 |
| Links locais | 153 válidos |
| Links quebrados | 0 |
| Credenciais conhecidas | 0 |
| Security Advisor | 0 alertas |
| FKs sem índice | 0 |
| Tabelas RLS sem policy | 0 |
| Source queue | 0 |
| DLQ | 0 |
| Alertas ativos | 0 |
| Tokens pendentes | 0 |

## Banco remoto

- 136 tabelas da aplicação;
- 240 foreign keys;
- 102 check constraints;
- 442 índices incluindo PK/unique;
- 32 triggers;
- 238 policies;
- 63 tabelas com RLS;
- quatro cron jobs ativos;
- um processo `pg_cron scheduler` ativo.

## Runtime

- `file-storage` v6, `verify_jwt=true`;
- `file-scan-worker` v3, `verify_jwt=true`;
- dispatch token de uso único validado;
- quatro workers concorrentes processaram 20 jobs sem duplicidade;
- recuperação após efeito parcial validada;
- alerta de DLQ abriu e resolveu automaticamente.

## Arquivos de evidência

- `docs/architecture/e12-v1.9-test-output.txt`;
- `docs/architecture/e12-v1.9-migration-validation.json`;
- `docs/architecture/e12-v1.9-edge-function-transpile.json`;
- `docs/architecture/e12-scheduler-live-validation.json`;
- `docs/operations/e12-v1.9-integrity-scan.json`.

## Observações

Os avisos restantes do Performance Advisor são exclusivamente `unused_index`. Eles não justificam remoção enquanto não houver carga representativa e planos reais. O histórico remoto possui migrations incrementais e provas técnicas; o conjunto local canônico permanece M00–M11 e não deve ser reaplicado diretamente sobre o remoto atual sem baseline/squash controlado.

O pacote não contém valores do Vault, service-role key, publishable key, URLs assinadas, credenciais AWS ou connection strings com senha.
