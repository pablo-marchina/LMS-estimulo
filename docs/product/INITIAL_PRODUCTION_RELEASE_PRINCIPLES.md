# Princípios da release inicial de produção

**Versão:** 0.2  
**Data:** 2026-07-14  
**Status:** alinhado às referências oficiais

## Definição

A primeira release de produção publicará a Jornada OpenAI e as capacidades necessárias para operá-la com usuários reais.

A arquitetura permanece multi-jornada, mas não é necessário publicar uma segunda jornada antes de concluir a primeira.

## Capacidades mínimas

A release inicial precisa possuir:

- autenticação e autorização reais;
- entrada integrada ao site Estímulo;
- diagnóstico oficial e quatro arquétipos;
- personalização de baixo risco;
- Jornada OpenAI completa;
- aulas, materiais, quick checks e provas;
- comentários e uploads previstos;
- progresso, pontos, selos e certificados;
- administração mínima das capacidades publicadas;
- eventos e outbox idempotentes;
- integração real com HubSpot;
- AWS staging e produção;
- logs, backup, restauração e rollback;
- responsividade e acessibilidade dos fluxos críticos.

## Diagnóstico e arquétipos

Os quatro arquétipos oficiais podem ser usados para personalização educacional e de relacionamento, desde que:

- a finalidade seja apresentada claramente;
- a regra oficial esteja versionada;
- exista tratamento para empate ou resultado insuficiente conforme decisão metodológica;
- o participante receba explicação não determinista nem estigmatizante;
- o resultado não seja usado para aprovar, reprovar ou alterar condição de crédito;
- recálculos e overrides sejam auditáveis.

A arquitetura pode aceitar versões futuras, mas a release inicial deve operar os quatro arquétipos definidos pela referência.

## HubSpot

A integração com HubSpot é desacoplada do fluxo central do LMS.

O produto persiste sua transação, registra outbox e sincroniza projeções relevantes. Indisponibilidade do CRM não deve impedir estudo, avaliação ou progresso, salvo quando uma ação depender explicitamente de estado CRM atualizado.

## Rollout

O primeiro uso real pode ocorrer com uma coorte pequena em produção.

É necessário apenas:

- definir participantes iniciais;
- ter canal de suporte;
- acompanhar erros e sincronizações;
- poder pausar novas entradas;
- corrigir bloqueadores antes da expansão.

## Proibições

Não será permitido em produção:

- dados fictícios apresentados como reais;
- autenticação apenas visual;
- secrets em código;
- alterações manuais de banco sem migration;
- eventos duplicáveis ou sem rastreabilidade;
- score educacional influenciando crédito sem validação e governança;
- dependência síncrona desnecessária do HubSpot;
- deploy sem backup, restauração e rollback comprovados.

## Gate de produção

A publicação exige evidência de:

1. fluxo oficial ponta a ponta;
2. identidade e permissões reais;
3. integração HubSpot e reconciliação;
4. segurança e privacidade mínimas para os dados usados;
5. browser E2E e acessibilidade dos fluxos críticos;
6. AWS staging, backup, restore e rollback;
7. operação dos must-haves do LMS.

Dívida técnica contida, documentação auxiliar incompleta e refatorações cosméticas não bloqueiam a release quando não afetam esses critérios.