# Gamificação e credenciais — Jornada OpenAI

A Jornada OpenAI usa o motor geral de gamificação da plataforma; ela não possui um sistema paralelo de pontos ou credenciais.

## Princípios

- pontos representam uma regra de engajamento configurada, não aprendizagem ou risco de crédito;
- saldo deriva de ledger idempotente;
- estorno usa lançamento compensatório;
- badge, certificado e recompensa possuem critérios explícitos;
- emissão e revogação são auditáveis;
- ranking preserva privacidade dos demais participantes.

## Pontos

Cada lançamento referencia regra, participante, evento causal, quantidade, horário, idempotência e eventual compensação. Valores e recorrência são dados da regra publicada.

## Badges

Badges são awards com identificador próprio. A interface pode anunciar uma nova aquisição quando observa um award que não fazia parte do baseline do participante, sem tratar histórico carregado como evento novo.

## Certificados

Certificados preservam identificador verificável, participante, escopo, requisitos satisfeitos, emissão, validade e estado. Templates e regras de emissão são administráveis e reutilizáveis conforme o domínio.

## Recompensas

Catálogo e resgate possuem elegibilidade, disponibilidade, estoque quando aplicável, custo em pontos, fulfillment e política de cancelamento. Resgate altera saldo/estoque de forma transacional.

## Crédito

Pontos, badges, certificados, ranking e recompensas não são features de crédito por padrão.