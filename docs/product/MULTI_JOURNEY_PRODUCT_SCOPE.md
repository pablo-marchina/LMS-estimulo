# Escopo de jornadas da Plataforma Estímulo

**Versão:** 1.1  
**Data:** 2026-07-29  
**Status:** especificação vigente; extensibilidade técnica sem ampliar a primeira entrega

## Regra central

A Jornada OpenAI é:

- a jornada oficial prioritária;
- a jornada que deve ser publicada na primeira release;
- o primeiro fluxo real usado para validar a plataforma ponta a ponta.

Uma segunda jornada completa não é requisito da primeira entrega. A arquitetura deve evitar acoplamento desnecessário que impeça futuras jornadas, mas a extensibilidade é subordinada à entrega oficial.

## Requisitos da primeira release

A primeira release deve permitir operar produtivamente a Jornada OpenAI com:

- definição e versão publicável;
- trilhas, blocos e atividades;
- conteúdos internos e externos;
- labels e elegibilidade por arquétipo;
- avaliações, práticas e uploads;
- progressão e conclusão;
- pontos, conquistas, recompensas, selos e certificados;
- eventos comportamentais;
- administração;
- integração HubSpot;
- histórico imutável das versões usadas por participantes.

## Extensibilidade técnica obrigatória

O núcleo não deve depender de:

- UUIDs fixos da Jornada OpenAI;
- tabelas exclusivas para a jornada;
- enums de conteúdo que impeçam novos tipos sem justificativa;
- condicionais dispersas como `if journey == openai`;
- regras editoriais codificadas na interface;
- migrations necessárias apenas para alterar conteúdo;
- duplicação de orquestração para cada nova jornada.

Formulários, jornadas, trilhas, conteúdos, avaliações e credenciais devem ser configuráveis e versionados na medida necessária para cumprir a primeira entrega.

## O que não é gate da primeira release

Sem decisão formal posterior, não bloqueiam a primeira produção:

- criação editorial de uma segunda jornada;
- publicação de uma segunda jornada para usuários reais;
- administração avançada de programas não previstos;
- prova completa com conteúdo de outro parceiro.

## Gate

```text
openai_journey_release_ready = false
second_production_journey_required = false
journey_specific_runtime_branching_allowed = false
content_changes_require_code = false
```