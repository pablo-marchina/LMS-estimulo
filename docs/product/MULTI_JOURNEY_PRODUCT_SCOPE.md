# Escopo multi-jornada da Plataforma Estímulo

## Regra central

A plataforma suporta múltiplas jornadas sem especializar o núcleo para uma instância editorial. Jornadas como a OpenAI são configurações do produto e não definem exceções arquiteturais.

## Lifecycle

Uma jornada é um registro operacional único:

```text
draft <-> published
```

Publicar não cria snapshot editorial paralelo. Uma jornada publicada pode receber edição autorizada; fatos já produzidos por participantes continuam preservados por tentativas, submissões, ledgers, eventos, auditoria e demais stores históricos.

## Capacidades reutilizáveis

- programa e organização temática;
- elegibilidade e matrícula;
- trilhas, aulas, atividades e conteúdos;
- quick checks, avaliações e entregas;
- progressão e conclusão;
- diagnóstico e personalização quando autorizados;
- pontos, ranking, badges, recompensas e certificados;
- eventos, auditoria e administração.

## Extensibilidade

O núcleo não depende de UUID/slug fixo, tabelas exclusivas, enums por jornada ou condicionais dispersas. Conteúdo comum deve ser administrável sem migration. Uma capacidade realmente nova deve ser adicionada de forma genérica, com contrato, teste e documentação próprios.

## Integrações

PostgreSQL confirma o estado do domínio. Eventos e outbox fornecem a fronteira para consumidores externos, que permanecem assíncronos, idempotentes e substituíveis.

Consulte [`../journeys/JOURNEY_LIFECYCLE.md`](../journeys/JOURNEY_LIFECYCLE.md) e [`../domain/DOMAIN_MODEL.md`](../domain/DOMAIN_MODEL.md).