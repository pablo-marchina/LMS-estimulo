# Migrations executáveis M00–M12

**Versão:** 0.4  
**Data:** 2026-07-08  
**Estado:** M00–M12 consolidadas; estado remoto validado no Supabase de testes

## Decisão

O schema deixa de ser um DDL monolítico de referência e passa a existir como treze migrations ordenadas, compatíveis com o fluxo oficial do Supabase CLI e reutilizáveis no Amazon RDS PostgreSQL.

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

## Regras operacionais

- Migration aplicada nunca é editada; correção gera uma nova migration.
- Mudanças pelo Dashboard remoto são proibidas depois do início do histórico de migrations.
- O mesmo conjunto deve passar em Supabase local/test e RDS staging.
- `MIGRATION_MANIFEST.json` fixa ordem e SHA-256 de cada arquivo.
- A execução produtiva usa `lock_timeout`, `statement_timeout`, backup e rollback operacional.
- Login roles e segredos pertencem à infraestrutura do ambiente, não às migrations portáveis.

## Identidade corrigida

`iam.user_accounts` agora é verdadeiramente interna. A relação com Supabase ou Cognito fica em `iam.external_identities`, identificada por `(issuer, subject)`. Isso permite trocar ou associar provedores sem criar outra pessoa, inscrição ou histórico.

Não há associação automática quando o e-mail já pertence a uma conta existente. Nessa situação, o banco retorna `identity_link_required` e exige um fluxo explícito e auditável de vinculação.

## Validação executada

O verificador local confirma:

- treze migrations na ordem correta;
- checksums e contagem de statements íntegros;
- 156 declarações `create table` no conjunto canônico;
- 234 FKs declaradas estaticamente, além dos índices de cobertura gerados por catálogo;
- 94 índices explícitos;
- 63 triggers explícitos;
- controles de storage, filas, scheduler, ROPA, direitos, retenção, incidentes, redaction e gate;
- ausência de `auth.uid()`, valores de chaves e connection strings com senha.

As migrations incrementais M00–M12 foram executadas no PostgreSQL gerenciado do Supabase de testes. O conjunto local é canônico e não deve ser reaplicado diretamente sobre esse mesmo banco sem baseline/squash controlado.

## M11 e M12 — operação contínua e governança

M11 adiciona pg_cron/pg_net no ambiente Supabase de testes, tokens de dispatch de uso único, dispatcher contínuo, reconciliação, snapshots de métricas e alertas. M12 adiciona classificação, ROPA, consentimento, direitos, legal hold, incidentes, redaction, RLS integral e gate de produção. Valores de Vault e decisões jurídicas não pertencem às migrations e são provisionados/aprovados por ambiente.
