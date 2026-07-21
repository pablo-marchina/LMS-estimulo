# Mapeamento operacional Supabase → AWS

## Princípio

O domínio não deve depender de `pg_cron`, `pg_net`, PGMQ ou APIs específicas do Supabase. A migração AWS exige adapters equivalentes para identidade, PostgreSQL e armazenamento privado, preservando autorização, idempotência, auditoria e retenção.

## Estado do baseline

| Contrato | Desenvolvimento atual | Recurso declarado no baseline AWS | Adapter ativo no runtime |
|---|---|---|---|
| Banco operacional | PostgreSQL/Supabase RPC | RDS PostgreSQL privado e criptografado | não |
| Identidade | Supabase Auth | ainda não declarado | não |
| Arquivos privados | Supabase Storage | S3 privado, versionado e criptografado | não |
| Web | Next.js local/CI | ECS/Fargate + ALB | scaffolding |
| Secrets | ambiente Supabase/local | Secrets Manager por ARN | scaffolding |
| Observabilidade | tabelas/logs atuais | CloudWatch + SNS | scaffolding |

## Contratos preservados

- IDs e chaves de deduplicação permanecem canônicos;
- efeitos de escrita permanecem idempotentes;
- arquivos pertencem a uma organização e a um usuário autorizado;
- tipo MIME, extensão, tamanho e SHA-256 são validados;
- bucket e objetos permanecem privados;
- downloads usam autorização e descritor server-only;
- histórico e outbox PostgreSQL continuam a origem confiável das integrações;
- retenção e exclusão precisam ser explícitas e auditáveis.

## Gate de paridade

Antes de ativar qualquer adapter AWS:

1. upload e confirmação idempotentes;
2. acesso negativo entre participantes e organizações;
3. MIME, extensão, tamanho e hash inválidos rejeitados;
4. URL assinada curta e vinculada ao objeto autorizado;
5. versionamento, retenção e exclusão exercitados;
6. reconciliação entre banco e storage;
7. restore de objeto e banco comprovado;
8. rollback para o adapter anterior sem perda de estado.
