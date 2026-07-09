# E12 — Relatório de execução no Supabase

**Data:** 2026-07-08  
**Projeto de teste:** `LMS-estimulo`  
**Project ref:** `cfpfeavjlgheqqiaqtzv`  
**Região:** `sa-east-1`  
**PostgreSQL:** 17  
**Resultado:** aprovado para a fundação de banco do ambiente de testes

## Escopo executado

A fundação M00–M08 foi aplicada diretamente pelo MCP do Supabase. O M08 foi dividido em incrementos transacionais menores para localizar erros e evitar aplicação parcial opaca. O histórico remoto completo está em `e12-remote-migration-history.json`.

## Inventário final comprovado

| Objeto | Quantidade |
|---|---:|
| Tabelas da aplicação | 122 |
| Foreign keys | 213 |
| Check constraints | 40 |
| Índices, incluindo PK/unique | 389 |
| Triggers próprios | 23 |
| Policies RLS | 186 |
| Tabelas com RLS | 49 |
| Tabelas RLS sem policy | 0 |
| FKs sem índice de cobertura | 0 |

## Correções descobertas pela execução real

1. `pgcrypto.digest` está instalado no schema `extensions` do Supabase. A chamada foi qualificada como `extensions.digest(...)` porque as funções usam `search_path` restrito.
2. `app_worker` recebeu apenas `USAGE` no schema `extensions` e `EXECUTE` em `extensions.digest(bytea,text)`.
3. Policies `FOR ALL` foram divididas por comando para impedir avaliação permissiva redundante em `SELECT`, sem alterar as expressões de autorização.
4. Foram criados índices determinísticos apenas para FKs que não possuíam índice com colunas iniciais compatíveis.
5. As funções de trigger receberam `search_path = pg_catalog`.

## Estado dos advisors

- Security Advisor: **0 lints**.
- Performance Advisor: nenhuma FK sem índice e nenhuma sobreposição estrutural de policies.
- Permanecem apenas avisos `unused_index`, esperados em banco novo e sem tráfego. Nenhum índice será removido antes de carga representativa, `EXPLAIN (ANALYZE, BUFFERS)` e estatísticas de uso.

## Tipos Supabase

A geração oficial retornou apenas o schema `public`, sem tabelas da aplicação. Isso é intencional: os schemas internos não estão expostos ao PostgREST. O frontend não acessará as 122 tabelas diretamente; usará APIs/casos de uso tipados.

## Observação de histórico

O conjunto deste snapshot estava consolidado em M00–M08; o baseline atual é M00–M10. No projeto remoto, o M08 foi aplicado em incrementos M08a–M08p. Antes de automatizar `supabase db push`, será necessário alinhar o histórico por um procedimento controlado de baseline/squash; não se deve executar simultaneamente o M08 consolidado sobre o banco remoto já migrado.
