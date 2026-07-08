# Relatório de conclusão do E08

**Versão:** 0.1  
**Data:** 2026-07-08  
**Status:** Concluído para a fase de arquitetura

## 1. Entregas concluídas

- arquitetura de captura de eventos sem event sourcing integral;
- classes de evento e separação de telemetria;
- envelope CloudEvents-compatible;
- convenção de nomes e SemVer;
- catálogo com 118 tipos multi-jornada;
- classificação da força da evidência;
- regras de idempotência, ordenação, retry e replay;
- privacidade, classes de acesso e retenção lógica;
- registro de schemas e validação em CI;
- JSON Schema do envelope;
- schemas e exemplos iniciais;
- contrato reservado para estágio de crédito, sem inventar estados externos.

## 2. Decisões principais

1. UI emite comandos/observações; backend emite fatos canônicos.
2. Eventos de domínio são persistidos atomicamente com a mudança operacional.
3. Entrega é pelo menos uma vez; consumidores são idempotentes.
4. Não existe ordenação global; `aggregateversion` governa ordem por agregado.
5. IDs e atributos de roteamento não carregam PII.
6. Pontos, selos, certificados e scores são derivados e não substituem fatos brutos.
7. Evento e schema são genéricos para qualquer jornada.
8. O modelo é compatível com CloudEvents e permite projeção futura para xAPI.

## 3. Pendências que não bloqueiam o E09

- prazos institucionais de retenção;
- configuração real do HubSpot;
- estados e IDs da operação de crédito;
- escolha física de fila/worker/event store;
- schema específico de todos os 118 eventos — será implementado somente para os eventos efetivamente incluídos na release e validado em CI.

## 4. Gate do E08

O E08 está concluído porque todo evento necessário ao produto possui uma categoria, regra de nome, proprietário, natureza de evidência, privacidade, consumidores e contrato mínimo. O E09 pode agora desenhar os fluxos ponta a ponta e os tratamentos de falha.
