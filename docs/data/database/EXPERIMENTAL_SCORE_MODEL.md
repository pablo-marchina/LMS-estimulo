# Score comportamental configurável

**Revisado em:** 2026-08-01  
**Status:** implementado para análise educacional; proibido para decisão de crédito

## Guardrail principal

O score comportamental é exclusivamente analítico. Ele não pode alterar aprovação, preço, limite, cobrança, elegibilidade, navegação, recomendação, pontos ou recompensas.

## Dados de entrada

O cálculo usa eventos brutos de interação e, quando disponível, qualidade de entregas. As métricas permitidas atualmente são:

- quantidade de eventos;
- dias ativos;
- interações de profundidade;
- conclusões;
- ações autônomas;
- média de qualidade das entregas;
- semanas ativas.

## Configuração

O administrador configura:

- fórmula `weighted_average` ou `weighted_sum`;
- mínimo e máximo brutos para normalização;
- número de eventos para confiança total;
- dimensões, métricas, pesos, multiplicadores, ajustes e tetos;
- faixas de classificação de 0 a 100.

A configuração é validada em três fronteiras:

1. editor no navegador;
2. RPC/gateway autenticado;
3. função e trigger no PostgreSQL.

São rejeitados códigos duplicados, números inválidos, peso total igual a zero, normalização invertida e faixas com lacunas ou sobreposição.

## Persistência e reprodutibilidade

```text
behavior_score_configurations
→ behavior_score_configuration_history
→ behavior_score_snapshots
→ behavior_score_history
→ behavior_score_etl
```

Cada snapshot registra configuração, score bruto, score normalizado, dimensões, classificação, confiança, contagem de eventos, hash dos inputs e horário do cálculo.

## Atualização

Salvar uma configuração recalcula os participantes da organização. Depois disso, cada novo evento comportamental relevante recalcula o participante afetado. Idempotência no registro do evento impede dupla aplicação.

## Uso futuro

Qualquer uso fora da análise educacional exige finalidade separada, base legal, amostra, validação temporal e fora da amostra, análise de drift e equidade, explicabilidade e aprovação formal de governança.
