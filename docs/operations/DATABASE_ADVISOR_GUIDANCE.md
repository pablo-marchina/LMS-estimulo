# Orientação para advisors do banco

Advisors de banco produzem sinais que precisam de análise de contexto. Um warning não deve ser convertido automaticamente em migration sem entender o contrato de acesso e o workload.

## RLS sem policy direta

RLS habilitada sem policy pode ser intencional quando browser roles não possuem DML direto e o acesso passa por RPC/gateway autorizado. Antes de criar policy, confirme grants, owner, `BYPASSRLS`, fluxo de acesso e testes negativos.

## RPC público

Uma função pública só pode permanecer executável por `anon` ou `authenticated` quando existe caso de uso explicitamente público e controles proporcionais de validação, limite, minimização, `search_path` e abuso. O contrato deve ser coberto por teste.

## Proteção de autenticação

Configurações do provider que não são controladas por migration — como políticas de senha — precisam de configuração operacional e verificação no ambiente. Documentação não deve afirmar que estão habilitadas sem evidência do ambiente.

## Chaves estrangeiras sem índice

Índice de FK é decisão de workload. Priorize relações usadas em joins, filtros frequentes, deleção/atualização do pai ou consultas com seletividade conhecida. Compare plano, latência e custo de escrita antes e depois.

## Índices não utilizados

`unused_index` isolado não justifica remoção. Considere período de observação, resets de estatística, consultas raras críticas, constraints, custo de escrita e planos reais.

## Regra de mudança

Uma recomendação de advisor vira mudança quando existe:

- contrato afetado identificado;
- hipótese e risco claros;
- migration aditiva/reversível quando aplicável;
- teste ou benchmark proporcional;
- observação pós-deploy e caminho de reversão.

A ausência de warning não substitui revisão de segurança, integridade ou performance.