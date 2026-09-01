# Escopo de jornadas da Plataforma Estímulo

**Versão:** 2.0  
**Revisado em:** 2026-09-01  
**Status:** especificação vigente

## Regra central

A Jornada OpenAI é a jornada oficial prioritária e o primeiro fluxo real para validar a plataforma ponta a ponta. Uma segunda jornada produtiva não é requisito da primeira entrega, mas o núcleo não pode ser específico da OpenAI.

## Lifecycle vigente

Uma jornada é um único registro operacional:

```text
draft <-> published
```

Publicar não cria snapshot editorial paralelo. Jornada publicada pode ser editada ao vivo; fatos de execução já registrados continuam preservados pelos stores correspondentes.

## Capacidades da jornada

- programa/temas e elegibilidade;
- trilhas, aulas, atividades e conteúdos;
- quick checks, avaliações e entregas;
- progressão/conclusão;
- pontos, conquistas, ranking, recompensas, badges e certificados;
- eventos e administração;
- personalização por diagnóstico quando autorizada.

## Extensibilidade

O núcleo não depende de UUID/slug fixo da OpenAI, tabelas exclusivas, enums por jornada ou condicionais dispersas. Conteúdo comum deve ser administrável sem migration.

## Integrações

Integração externa não é dependência síncrona da jornada. PostgreSQL preserva estado e fatos; outbox fornece a fronteira de exportação. Se HubSpot for adotado como destino, os dados permitidos seguem `DEC-070`, mas indisponibilidade do CRM não bloqueia uma escrita de negócio.

## Prontidão

Prontidão da Jornada OpenAI é avaliada pelos gates do SHA, pela presença dos materiais editoriais aprovados e pelas validações de ambiente. Este documento não congela um booleano estático de readiness.

Consulte [`../journeys/JOURNEY_LIFECYCLE.md`](../journeys/JOURNEY_LIFECYCLE.md) e [`../implementation/APPLICATION_FOUNDATION.md`](../implementation/APPLICATION_FOUNDATION.md).