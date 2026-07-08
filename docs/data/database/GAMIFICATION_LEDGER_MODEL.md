# Modelo de ledger de gamificação

**Versão:** 0.1

## 1. Decisão

Pontos serão lançamentos contábeis imutáveis. Não haverá coluna `total_points` como fonte de verdade.

```text
Evento elegível
→ regra de pontos versionada
→ lançamento idempotente
→ atualização assíncrona de saldo
→ possível selo/certificado por critérios próprios
```

## 2. Tabelas

- `point_rule_definitions`;
- `point_rule_versions`;
- `point_ledger`;
- `point_balance_projections`;
- `badge_definitions` e `badge_versions`;
- `badge_awards`;
- `certificate_definitions` e `certificate_versions`;
- `certificate_issuances`;
- `streak_projections`.

## 3. Idempotência

A chave deve representar a ação premiável, por exemplo:

```text
rule-version + entrepreneur + journey-instance + source-event
```

Uma nova tentativa ou revisita não gera novo ponto sem política de recorrência explícita.

## 4. Reversão

- não atualizar nem apagar o lançamento original;
- inserir lançamento negativo;
- preencher `reverses_entry_id`;
- usar evento de compensação;
- recalcular projeção.

## 5. Separação do score

O score nunca consumirá diretamente saldo, selo ou certificado como comportamento bruto. Caso uma análise futura use essa informação, deverá utilizar os eventos originadores e controlar mudança de regras e oportunidade de exposição.
