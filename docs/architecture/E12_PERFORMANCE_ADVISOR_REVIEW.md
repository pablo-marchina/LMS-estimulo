# E12 — Revisão do Performance Advisor

**Data:** 2026-07-08

## Remediações aplicadas

### Foreign keys sem índice

O advisor inicialmente encontrou relações sem índice de cobertura. Uma migration determinística agora cria índice somente quando nenhum índice válido possui as colunas da FK como prefixo.

**Resultado final:** 0 FKs sem cobertura.

### Policies permissivas múltiplas

Policies `FOR ALL` eram avaliadas também em `SELECT`, em conjunto com policies de leitura. Elas foram desdobradas em `SELECT`, `INSERT`, `UPDATE` e `DELETE`, preservando `USING`, `WITH CHECK` e papéis.

**Resultado final:** 0 avisos estruturais dessa categoria.

### Índices não utilizados

O banco não possui carga operacional. Portanto, `idx_scan = 0` não demonstra que um índice seja inútil. Remover índices agora seria uma decisão sem evidência.

Revisão futura obrigatória:

1. carregar dados sintéticos representativos;
2. executar fluxos E2E e testes de carga;
3. coletar `pg_stat_user_indexes`;
4. analisar planos com `EXPLAIN (ANALYZE, BUFFERS)`;
5. considerar custo de escrita, seletividade e redundância;
6. remover somente por migration reversível.
