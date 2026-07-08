# Escopo multi-jornada da Plataforma Estímulo

**Versão:** 0.1  
**Data:** 2026-07-08  
**Status:** Premissa oficial corrigida

## 1. Regra central

A Plataforma Estímulo é um produto SaaS/LMS multi-jornada desde a primeira release de produção.

A Jornada OpenAI é:

- a primeira jornada com conteúdo implementado;
- a primeira jornada publicada para usuários reais;
- o primeiro caso completo usado para validar o funcionamento ponta a ponta.

Ela não é:

- o limite funcional do produto;
- um caso especial no domínio;
- a única jornada suportada pelo banco;
- a única jornada que a administração pode criar ou publicar;
- justificativa para decisões técnicas acopladas ao seu conteúdo.

## 2. Capacidades exigidas já na primeira release

A release inicial deverá permitir, de forma produtiva:

1. criar uma nova definição de jornada;
2. criar e editar versões em rascunho;
3. associar cursos, módulos, conteúdos, avaliações e práticas reutilizáveis;
4. configurar etapas, transições, pré-requisitos e critérios de conclusão;
5. revisar e aprovar uma versão;
6. publicar uma versão imutável;
7. inscrever participantes e fixá-los à versão publicada;
8. capturar eventos usando o mesmo envelope canônico;
9. aplicar permissões e escopos iguais aos de qualquer outra jornada;
10. descontinuar ou substituir uma versão sem corromper o histórico;
11. consultar progresso, eventos e resultados por jornada;
12. operar integrações e intervenções sem lógica exclusiva da OpenAI.

## 3. O que pode permanecer para depois

Pode ser posterior à primeira release:

- criação editorial de uma segunda jornada completa;
- produção de vídeos, avaliações e atividades de novas jornadas;
- lançamento público de outros conteúdos;
- regras avançadas específicas de novos programas.

Isso não altera a exigência de que a plataforma já aceite esses elementos.

## 4. Prova obrigatória de extensibilidade

Antes do gate de produção, deverá ser executado um teste com uma segunda jornada sintética, contendo pelo menos:

- uma definição;
- duas versões, sendo uma publicada;
- uma trilha;
- dois módulos;
- três atividades de tipos diferentes;
- uma avaliação;
- uma regra de progressão;
- uma inscrição de teste;
- eventos de início, progresso e conclusão.

O teste será aprovado somente se não exigir:

- migration específica da jornada;
- nova enumeração exclusiva;
- alteração do núcleo de orquestração;
- condição `if journey == ...`;
- duplicação de tabelas;
- endpoint exclusivo sem justificativa genérica.

## 5. Linguagem oficial

Usar:

> “A Jornada OpenAI é a primeira jornada implementada e publicada em uma plataforma multi-jornada.”

Evitar:

> “O produto é limitado à Jornada OpenAI.”

> “A plataforma terá apenas uma jornada.”

> “O suporte a múltiplas jornadas é uma evolução futura.”
