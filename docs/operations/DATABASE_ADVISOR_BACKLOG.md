# Backlog dos advisors do banco

**Revisado em:** 2026-08-01  
**Origem:** revisão geral da `main` após as correções de interface, carregamento e score

Este documento registra avisos que não devem ser corrigidos automaticamente sem análise de finalidade, carga e risco.

## RLS habilitada sem políticas

O advisor informa várias tabelas com RLS habilitada e nenhuma policy. A revisão confirmou que nenhuma dessas tabelas concede operações DML diretamente a `anon` ou `authenticated`.

Esse é o comportamento intencional de **negação por padrão**: operações passam por RPCs, Edge Functions ou `service_role`, acompanhadas de autorização explícita. Não criar policies somente para silenciar o advisor.

Reavaliar uma tabela apenas quando uma nova superfície precisar de acesso direto pelo PostgREST.

## RPC público de tracking

`public.capture_tracking_visit(text,text,jsonb)` é `SECURITY DEFINER` e executável por `anon` e `authenticated` de forma intencional, pois registra visitas anônimas a links públicos.

Controles atuais:

- slug e token validados;
- token armazenado como SHA-256;
- metadata deve ser objeto JSON;
- tamanho de `user_agent` limitado;
- link precisa estar ativo e dentro da janela de validade;
- limite de usos é respeitado;
- `search_path` fechado;
- retorno contém somente destino e parâmetros de navegação necessários.

A manutenção futura deve considerar rate limiting no edge/firewall e testes de abuso. Revogar `EXECUTE` quebraria o fluxo público de aquisição.

## Proteção contra senhas vazadas

O advisor informa que a proteção contra senhas vazadas do Supabase Auth está desabilitada. Essa configuração não é controlada por migration SQL do repositório.

Ação operacional pendente:

1. habilitar **Leaked Password Protection** no painel/Management API do projeto;
2. validar cadastro, alteração e recuperação de senha;
3. registrar evidência no release institucional.

Referência: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Chaves estrangeiras sem índice

O advisor lista diversos FKs sem índice de cobertura, principalmente em capacidades recentemente adicionadas. Índices não devem ser criados em massa sem workload real, porque aumentam custo de escrita e armazenamento.

Prioridade sugerida:

1. medir consultas lentas, locks e cardinalidade;
2. priorizar FKs usados em joins, exclusões do pai e filtros frequentes;
3. adicionar índices em migration aditiva;
4. comparar plano, latência e custo antes/depois;
5. remover somente após janela de observação e evidência.

Referência: https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys

## Índices ainda não utilizados

O banco é recente e parte das capacidades ainda não recebeu carga representativa. O aviso `unused_index` não é evidência suficiente para remoção.

Antes de remover:

- observar pelo menos um ciclo representativo;
- considerar reinícios de estatísticas;
- verificar se o índice sustenta constraint, reconciliação ou consulta rara crítica;
- revisar planos de execução e frequência de escrita.

Referência: https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index

## Critério de encerramento

Um aviso só sai deste backlog quando houver uma das evidências:

- correção aplicada e validada;
- decisão formal de risco aceito;
- classificação como comportamento intencional com teste permanente;
- remoção da capacidade que originou o aviso.
