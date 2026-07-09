# E14 — Passo 1 — unidade da primeira vertical

**Data:** 2026-07-09  
**Status:** DONE  
**Definição detalhada:** `e14-step1-technical-vertical-v0.1.json`

## Decisão editorial

`OPENAI_CONTENT_STATUS: BLOCKED`

A Jornada OpenAI ainda não possui uma atividade com todos os elementos aprovados exigidos para uso real: materiais finais, avaliação com resposta e feedback, regras de tentativa e conclusão, acessibilidade e autorização editorial. Portanto, o primeiro fluxo usará uma jornada técnica interna. Ela não representa, publica ou conclui conteúdo OpenAI.

## Unidade técnica

- Jornada: `e14_runtime_validation_journey` v1.
- Visibilidade: `internal_test_only`.
- Atividade: `inputs_rules_outputs` v1.
- Título: Entradas, regras, saídas e validação humana.
- Duração: 6 minutos, com 2 minutos adicionais no caminho guiado.
- Objetivo: distinguir entrada, regra, saída e validação humana em um fluxo simples.
- Ativos: somente texto estruturado, sem dependência externa.

## Diagnóstico e caminhos

São quatro perguntas e duas dimensões: `tool_familiarity` e `review_autonomy`.

Duas ou mais respostas incertas geram baixa confiança. O caminho `guided` é atribuído quando existe baixa confiança ou alguma dimensão tem pontuação até 2. O caminho `standard` exige pontuação mínima 3 nas duas dimensões. O fallback sempre é `guided`.

Fluxo guiado:

`welcome -> diagnosis -> guided_context -> activity -> quick_check -> completion`

Fluxo direto:

`welcome -> diagnosis -> activity -> quick_check -> completion`

A regra é apenas uma fixture técnica. Ela não possui validade psicométrica, não cria arquétipos e não deve fundamentar decisões externas.

## Quick check e conclusão

O quick check pergunta qual elemento é a regra em um fluxo de frete grátis para pedidos de pelo menos R$ 100. A resposta correta é a condição aplicada ao valor do pedido. Há feedback específico para cada alternativa e até três tentativas.

A conclusão exige diagnóstico concluído, caminho atribuído, atividade iniciada, todas as seções reconhecidas e quick check aprovado. Tempo de permanência isolado não conclui a atividade.

## Pontos e eventos

A fixture concede no máximo sete pontos técnicos: cinco pela conclusão da atividade e dois pela aprovação no quick check. As duas regras possuem chaves de idempotência e não são regras de produção ou recompensas reais.

Foram selecionados 29 aliases já existentes no catálogo canônico, cobrindo publicação, matrícula, diagnóstico, incerteza, atribuição, aprendizagem, avaliação, pontos e conclusão.

## Acessibilidade

O conteúdo é textual em português do Brasil, operável por teclado, compatível com rótulos para leitores de tela e não depende de áudio, vídeo ou cor como único indicador.

## Validação

- Validador estrutural: `scripts/e14/validate-step1-vertical.mjs`.
- Testes: `scripts/e14/validate-step1-vertical.test.mjs`.
- Resultado local: 6 testes aprovados, 0 falhas.

## Limitações

A unidade é invisível a participantes reais, não valida aprendizagem sobre IA, não conta como entrega da Jornada OpenAI, não aprova regras reais de gamificação e não pode ser usada fora da validação interna do runtime.
