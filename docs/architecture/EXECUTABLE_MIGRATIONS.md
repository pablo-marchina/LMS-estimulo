# Migrations executáveis M00–M12

**Versão:** 0.5  
**Data:** 2026-07-10  
**Estado:** 76 migrations remotas recuperadas; replay e equivalência estrutural comprovados

## Decisão

M00–M12 continuam sendo treze ondas lógicas, mas o histórico realmente aplicado no Supabase de teste é composto por 76 migrations timestampadas. Os antigos treze agregados locais foram removidos porque não preservavam todos os identificadores nem todas as etapas de correção, prova e limpeza executadas remotamente.

| Onda | Conteúdo |
|---|---|
| M00 | extensão, schemas, funções comuns e contexto transacional neutro |
| M01 | conta interna, identidades externas, organizações, empreendedores, negócios e arquivos |
| M02 | catálogo multi-jornada versionado |
| M03 | regras, trilhas, coortes, inscrições e execução |
| M04 | diagnóstico, avaliações e práticas |
| M05 | pontos, selos, certificados e intervenções |
| M06 | eventos, outbox/inbox e integrações |
| M07 | features, score experimental e governança |
| M08 | FKs, checks, índices, triggers, RLS, identidade e runtime de outbox |
| M09 | lifecycle de arquivos, upload assinado, quarentena e release |
| M10 | fila, retry, visibility, DLQ, redrive e integração com scan |
| M11 | scheduler, tokens de dispatch, reconciliação, métricas e alertas |
| M12 | segurança, privacidade/LGPD, retenção, incidentes e gate de produção |

## Fonte executável

```text
first_version = 20260708220357
last_version = 20260709030140
migration_count = 76
total_remote_sql_bytes = 411340
combined_remote_fingerprint_sha256 = 663173105a16924db650127f437900de0ad3422b2f7bf50a5e804f19d1a570a3
```

Arquivos de referência:

- `supabase/canonical-migrations/M00_M12_RUNTIME_MANIFEST.json`;
- `supabase/canonical-migrations/20260708220357_m00_m12_runtime_canonical.sql`;
- 76 arquivos correspondentes em `supabase/migrations`.

## Regras operacionais

- migration aplicada nunca é editada; correção gera uma nova migration;
- os arquivos recuperados preservam versão, nome, SQL e hash remoto;
- mudanças pelo Dashboard remoto são proibidas depois do início do histórico de migrations;
- o mesmo conjunto deve passar em Supabase local/test e RDS staging;
- `M00_M12_RUNTIME_MANIFEST.json` fixa ordem, tamanho e SHA-256 de cada versão;
- a execução de replay usa uma transação por migration;
- a execução produtiva usa `lock_timeout`, `statement_timeout`, backup e rollback operacional;
- segredos pertencem à infraestrutura do ambiente, não às migrations portáveis.

Roles `app_runtime`, `app_worker` e `app_readonly` fazem parte do histórico remoto M08 e são criadas pelas migrations recuperadas. O catálogo `supabase_migrations.schema_migrations` é um pré-requisito do provedor e é inicializado apenas no ambiente de replay para permitir que helpers temporários de exportação sejam compilados.

## Identidade corrigida

`iam.user_accounts` é interna. A relação com Supabase ou Cognito fica em `iam.external_identities`, identificada por `(issuer, subject)`. Isso permite trocar ou associar provedores sem criar outra pessoa, inscrição ou histórico.

Não há associação automática quando o e-mail já pertence a uma conta existente. Nessa situação, o banco retorna `identity_link_required` e exige um fluxo explícito e auditável de vinculação.

## Validação executada

O gate de CI confirma:

- 76 migrations M00–M12 com hashes e bytes remotos exatos;
- execução ordenada em PostgreSQL 17.6 vazio;
- uma transação por migration, necessária para tabelas temporárias `ON COMMIT DROP`;
- continuidade com 165 migrations M13 e 2 migrations M14/M14b;
- 243 migrations executadas sem erro;
- equivalência de schemas, relações/RLS, colunas, constraints, índices, triggers, policies, rotinas e tipos;
- ausência de divergência estrutural frente ao Supabase de teste no escopo da aplicação.

O comando reproduzível é:

```bash
npm run test:database-clean-replay
```

## M11 e M12 — operação contínua e governança

M11 adiciona pg_cron/pg_net no ambiente Supabase de testes, tokens de dispatch de uso único, dispatcher contínuo, reconciliação, snapshots de métricas e alertas. M12 adiciona classificação, ROPA, consentimento, direitos, legal hold, incidentes, redaction, RLS integral e gate de produção. Valores de Vault e decisões jurídicas não pertencem às migrations e são provisionados/aprovados por ambiente.
