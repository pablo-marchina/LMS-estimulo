# Fronteira lógica com a operação de crédito

**Versão:** 0.1  
**Status:** Contrato reservado; implementação bloqueada por informações internas.

## 1. Princípio

A plataforma não será fonte de verdade dos estados financeiros. Um futuro sistema oficial de crédito produzirá ou permitirá consultar mudanças de estágio, desembolso, pagamento e outros fatos aprovados.

## 2. Fluxo reservado

```text
Fonte oficial de crédito
→ autenticação e integridade da mensagem
→ receipt/poll checkpoint
→ resolução de external identity
→ validação da taxonomia e sequência
→ external.credit.stage.changed
→ projeções e intervenções autorizadas
→ reconciliação periódica
```

## 3. Campos conceituais necessários

- ID externo da operação;
- `business_id` e, quando legítimo, `entrepreneur_id` mapeados;
- código do estágio oficial;
- versão ou sequência da mudança;
- timestamp da fonte;
- motivo/categoria permitida, sem dados excessivos;
- origem e versão do conector.

## 4. Guardrails

- não inventar estados;
- não tratar o HubSpot automaticamente como fonte oficial;
- não usar diagnóstico, arquétipo ou score para alterar crédito na release inicial;
- não produzir causalidade a partir de correlação simples;
- manter controles de acesso e finalidade separados para dados de crédito;
- permitir eventos atrasados e reconciliação por sequência.

## 5. Informações pendentes

- sistema e equipe proprietária;
- estados e transições reais;
- identificadores;
- mecanismo de integração;
- frequência e latência;
- histórico disponível;
- políticas de uso e retenção;
- desfechos que poderão ser usados em avaliação futura.
