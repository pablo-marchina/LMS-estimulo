# Gamificação e credenciais propostas — Jornada OpenAI

**Revisado em:** 2026-07-29  
**Status:** motor implementado; regras oficiais pendentes

## Princípios

- pontos representam engajamento, não aprendizagem ou risco de crédito;
- saldo deriva de ledger idempotente;
- regras são versionadas;
- correções usam lançamentos compensatórios;
- selos e certificados possuem critérios próprios;
- recompensas não incentivam cliques artificiais ou exposição de dados.

## Estado implementado

A aplicação suporta:

- regras de pontos vinculadas a eventos;
- ledger e histórico;
- conquistas, recompensas e ranking;
- selos;
- certificados internos;
- templates e geração de PDF;
- upload de credenciais externas;
- validação pública e revogação conforme contrato.

A capacidade técnica não aprova valores, recorrência, elegibilidade, validade ou textos.

## Proposta de eventos elegíveis

As fontes sugerem pontos por conclusão, avaliação, prática, prova e seleção editorial. Valores numéricos anteriores são apenas referência histórica e não devem ser carregados como regra oficial sem aprovação.

Cada lançamento registra regra e versão, participante, evento causal, quantidade, data, idempotência e eventual compensação.

## Credenciais

Certificados registram:

- identificador verificável;
- participante e nome exibido;
- definição e versão;
- jornada e versão;
- requisitos satisfeitos;
- emissão, validade e estado;
- revogação e motivo;
- página pública com dados minimizados.

O layout e os critérios do Certificado Base e do Certificado Avançado permanecem decisões editoriais.

## Recompensas

Mentorias, eventos, revisão ou destaque exigem capacidade, elegibilidade, resgate, validade, desempate, cancelamento, dados compartilhados e tratamento de menores quando aplicável.

## Crédito

Pontos, selos e certificados não são features de crédito por padrão. Qualquer uso futuro exige metodologia, controle de exposição, análise de viés, revisão humana e aprovação institucional.

## Gate

```text
event_driven_points_engine = implemented
credential_runtime = implemented
certificate_pdf = implemented
external_credentials = implemented
official_point_values = pending
abuse_policy = pending
reward_catalog = pending
badge_criteria = pending
certificate_criteria_and_validity = pending
revocation_process = pending
```
