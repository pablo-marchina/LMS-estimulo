# Modelo de score comportamental experimental

**Versão:** 0.1  
**Status:** somente estrutura de pesquisa; sem autoridade para crédito.

## 1. Guardrail principal

O banco suporta score para permitir pesquisa futura, mas nenhum score pode ser usado em aprovação, preço, limite, cobrança ou priorização de crédito sem:

- desfecho definido;
- amostra suficiente;
- desenho de validação;
- validação temporal e fora da amostra;
- análise de estabilidade e drift;
- avaliação de equidade;
- explicabilidade;
- revisão jurídica/privacidade/risco;
- aprovação registrada em `governance.model_approvals`.

## 2. Estrutura

```text
score_definition
→ score_version
→ score_run
→ score_result
→ score_contributions
→ validation_runs/metrics
→ model_approval
```

## 3. Reprodutibilidade

Um resultado precisa registrar:

- versão do score;
- run;
- sujeito e contexto;
- timestamp;
- hash do snapshot de inputs;
- valor e incerteza;
- status;
- contribuições por feature.

## 4. Estados propostos

### Definição/versão

```text
draft → research → validated_for_research → approved_for_limited_use → retired
```

Não haverá estado `approved_for_credit` até existir governança específica e dados suficientes.

### Resultado

```text
calculated | insufficient_evidence | invalid_inputs | stale | failed
```

## 5. Evitar leakage

Features posteriores ao desfecho ou geradas por uma intervenção baseada no próprio risco não podem entrar no treino sem tratamento causal/temporal explícito.

## 6. Separação de uso

O mesmo modelo não deve simultaneamente servir a:

- personalização educacional;
- previsão de abandono;
- risco de inadimplência;
- priorização comercial.

Cada finalidade exige definição e validação próprias.
