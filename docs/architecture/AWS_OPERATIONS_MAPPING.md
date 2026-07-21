# Mapeamento operacional Supabase → AWS

## Princípio

O domínio não deve depender de `pg_cron`, `pg_net`, PGMQ ou APIs específicas do Supabase. Esses componentes continuam ativos no ambiente de desenvolvimento; a migração AWS exige adapters com os mesmos contratos de idempotência, receipt, tentativa, DLQ e reconciliação.

## Estado do baseline

| Contrato | Desenvolvimento atual | Recurso declarado no baseline AWS | Adapter ativo no runtime |
|---|---|---|---|
| Banco operacional | PostgreSQL/Supabase RPC | RDS PostgreSQL privado e criptografado | não |
| Identidade | Supabase Auth | ainda não declarado | não |
| Arquivos | Supabase Storage | S3 quarantine/protected | não |
| Fila de scan | fila PostgreSQL | SQS Standard + DLQ | não |
| Scanner | Edge Function + provider externo opcional | worker AWS ainda pendente | somente Supabase Edge |
| Web | Next.js local/CI | ECS/Fargate + ALB | scaffolding |
| Secrets | ambiente Supabase/local | Secrets Manager por ARN | scaffolding |
| Observabilidade | tabelas/logs atuais | CloudWatch + SNS | scaffolding |

## Contratos preservados

- IDs e chaves de deduplicação permanecem canônicos;
- processamento é pelo menos uma vez;
- efeitos precisam ser idempotentes;
- arquivos só deixam quarantine após resultado `clean` válido;
- ausência de scanner real produz `manual_review`, nunca liberação;
- outbox PostgreSQL continua a origem confiável da integração;
- DLQ precisa de alarme e fluxo de redrive controlado.

## Decisão de consumo

O baseline declara SQS/DLQ, mas não inventa o worker. A escolha entre Lambda event source mapping e ECS worker deve considerar tamanho do arquivo, duração do scan, concorrência, custo e limites do provider. EventBridge Scheduler fica reservado para reconciliação, métricas e limpeza, não polling rápido.

## Gate de paridade

Antes de ativar qualquer adapter AWS:

1. teste de duplicata e idempotência;
2. visibility timeout e extensão;
3. crash após efeito e antes do ack;
4. retry, DLQ e redrive;
5. backlog e idade da mensagem;
6. quarantine, clean, infected, unsupported e manual review;
7. reconciliação entre banco, fila e storage;
8. rollback para o adapter anterior sem perda de estado.
