# Relatório de integridade do pacote v1.5

**Data:** 2026-07-08  
**Resultado:** aprovado com gate de execução PostgreSQL pendente

## Escopo deste incremento

- evolução do modelo de identidade para conta interna + identidades externas;
- baseline física v0.2;
- migrations M00–M08;
- manifest com checksums;
- adapter JWT Supabase;
- contexto transacional e RLS;
- transactional outbox/inbox/DLQ;
- scripts de aplicação, verificação e pgTAP;
- atualização do dicionário, ERD, backlog, decisões e riscos.

## Validações aprovadas

- 9 migrations ordenadas e com SHA-256 válido;
- 122 tabelas no SQL e no YAML, sem divergência;
- 213 FKs com origem e destino existentes;
- 48 índices;
- 23 triggers;
- 82 policies cobrindo as 49 tabelas com RLS habilitada;
- 8 testes Node aprovados e 0 falhas;
- nenhuma policy duplicada;
- nenhum bloco dollar-quoted desbalanceado;
- zero links internos quebrados;
- chave fornecida pelo usuário ausente dos artefatos;
- 132 arquivos no diretório do pacote antes da compactação.

## Limitação não ocultada

Este ambiente não possui `psql`, Docker nem conectividade DNS funcional com o projeto Supabase. Portanto, as migrations e policies ainda não foram analisadas e executadas pelo parser/runtime de um PostgreSQL real. A aprovação produtiva depende obrigatoriamente de:

1. `supabase db reset` local;
2. pgTAP;
3. aplicação no projeto Supabase de teste;
4. teste de isolamento com roles e pool;
5. repetição no Amazon RDS de staging.

## Artefatos de evidência

- `docs/architecture/e12-v1.5-test-output.txt`;
- `docs/architecture/e12-v1.5-structural-validation.json`;
- `supabase/migrations/MIGRATION_MANIFEST.json`.
