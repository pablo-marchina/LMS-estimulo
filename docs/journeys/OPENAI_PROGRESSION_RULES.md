# Progressão — Jornada OpenAI

Este documento define o modelo de progressão que a configuração da Jornada OpenAI pode expressar. Valores editoriais concretos são dados publicados, não constantes deste documento.

## Princípios

- conteúdo consumido, quick check, prática, avaliação e conclusão são fatos distintos;
- pré-requisitos e gates são regras estruturadas;
- mudanças editoriais não regravam fatos históricos;
- a progressão não depende de UUID/slug hardcoded;
- requisito não satisfeito gera estado bloqueado explicável, não erro genérico.

## Grafo conceitual

```text
entrada
→ boas-vindas
→ hub de trilhas
→ trilhas elegíveis
→ avaliações/práticas configuradas
→ reconhecimentos configurados
→ conclusão da jornada
```

Trilhas opcionais ou avançadas podem usar pré-requisitos explícitos. O runtime não presume ordem ou nota mínima que não esteja na configuração.

## Estados

Uma atividade pode produzir estados como disponível, iniciada, em progresso, submetida, concluída ou bloqueada conforme seu tipo. O lifecycle detalhado está em [`../domain/LIFECYCLES_AND_STATE_MACHINES.md`](../domain/LIFECYCLES_AND_STATE_MACHINES.md).

## Avaliações

Tentativas, nota mínima, limite de tentativas, retomada e feedback são configuráveis. Para `multiple_choice`, todas e somente as alternativas corretas precisam estar selecionadas.

## Conclusão

A conclusão da jornada deriva dos requisitos publicados. Credencial, badge ou recompensa só é emitida quando a regra correspondente for satisfeita de forma idempotente.