# Escopo de jornadas da Plataforma Estímulo

**Versão:** 1.0  
**Data:** 2026-07-16  
**Status:** alinhado às fontes; extensibilidade técnica sem ampliar a primeira entrega

## Autoridade

`premissas-desenvolvimento.md` e os documentos da Jornada OpenAI são as fontes superiores de produto.

O pacote fornecido exige a Jornada OpenAI e uma plataforma configurável de trilhas, conteúdos e administração. Ele não exige que uma segunda jornada completa seja criada ou publicada antes da primeira entrega.

## Regra central

A Jornada OpenAI é:

- a jornada oficial prioritária;
- a jornada que deve ser publicada na primeira release;
- o primeiro fluxo real usado para validar a plataforma ponta a ponta.

A arquitetura deve evitar acoplamento desnecessário que impeça futuras jornadas, mas a extensibilidade é uma decisão técnica subordinada à entrega oficial.

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

Sem nova fonte ou issue aprovada, não bloqueiam a primeira produção:

- criação editorial de uma segunda jornada;
- publicação de uma segunda jornada para usuários reais;
- administração avançada de programas não previstos;
- prova completa com conteúdo de outro parceiro;
- marketplace multi-programa;
- abstrações genéricas sem consumidor real.

## Prova proporcional de extensibilidade

A extensibilidade pode ser validada com fixture sintética mínima ou testes de contrato, desde que isso não substitua o E2E real da Jornada OpenAI.

Uma prova sintética deve apenas confirmar que o núcleo não possui acoplamento indevido. Ela não é uma capacidade de produto nem pode ser apresentada como jornada entregue.

## Prioridade de implementação

```text
1. Jornada OpenAI oficial e fluxo real
2. identidade, HubSpot, AWS e operação
3. requisitos funcionais das issues
4. remoção de acoplamentos concretos encontrados
5. novas jornadas após aprovação
```

## Linguagem oficial

Usar:

> “A Jornada OpenAI é a jornada oficial da primeira release. A arquitetura evita impedir futuras jornadas.”

Evitar:

> “Uma segunda jornada produtiva é obrigatória antes da primeira release.”

> “A plataforma está concluída porque uma jornada sintética passou.”

> “Multi-jornada autoriza adiar a experiência completa da Jornada OpenAI.”
