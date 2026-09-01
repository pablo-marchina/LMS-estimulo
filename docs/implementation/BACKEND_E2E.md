# Backend E2E reproduzível

**Revisado em:** 2026-09-01  
**Estado:** suíte permanente; resultado avaliado por SHA em PostgreSQL efêmero

## Finalidade

Comprovar transações e regressões depois do replay integral do Git, sem depender do Supabase remoto.

## Fluxos/invariantes

A suíte cobre matrículas, jornada, diagnóstico, avaliação, progresso, eventos/outbox, autorização e idempotência. Para o lifecycle atual:

- não se exige imutabilidade de jornada publicada;
- publicação/despublicação e edição ao vivo seguem `draft ↔ published`;
- fatos de execução permanecem consistentes apesar de alteração editorial autorizada.

Regressões prioritárias adicionais verificam:

- diagnóstico usando média e thresholds ordenados/inclusivos;
- `multiple_choice` como conjunto exato;
- manutenção da facade pública quick-check e de seus grants fechados;
- máscara de e-mail no ranking.

## Pré-condições

1. PostgreSQL vazio;
2. migrations completas;
3. equivalência de schema;
4. contratos públicos/legado aprovados;
5. fixtures sintéticas locais à execução.

## Execução

```bash
npm run test:database
```

Essa prova não substitui navegador em preview, E2E AWS final, capacidade multiusuário, backup/restore ou validação de integrações externas.