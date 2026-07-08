# Princípios da release inicial de produção

**Versão:** 0.1  
**Data:** 2026-07-08  
**Status:** Premissa oficial

## 1. Definição

A primeira entrega da Plataforma Estímulo será uma **release inicial de produção**, pronta para deploy e uso real. Seu escopo funcional será limitado à Jornada OpenAI e às capacidades estritamente necessárias para operá-la, mas a implementação não será descartável, demonstrativa ou provisória.

A redução de escopo não autoriza redução dos requisitos de engenharia, dados, segurança, privacidade ou operação.

## 2. O que “pronta para produção” significa

A release somente poderá ser publicada quando possuir, no mínimo:

- domínio e banco versionados por migrations;
- autenticação e autorização reais;
- segregação entre ambientes;
- gestão segura de segredos;
- dados reais ou estados vazios honestos, sem métricas fictícias;
- captura idempotente e auditável de eventos;
- tratamento explícito de erros e indisponibilidades;
- integração com HubSpot desacoplada do fluxo central;
- testes unitários das regras críticas;
- testes de integração com banco e integrações;
- testes end-to-end das jornadas essenciais;
- pipeline de CI/CD com bloqueios de qualidade;
- logs estruturados, métricas, tracing e monitoramento de erros;
- health checks e alertas acionáveis;
- backups automatizados e teste de restauração;
- rollback de aplicação e estratégia segura de migrations;
- baseline de segurança e privacidade;
- acessibilidade e responsividade verificadas;
- documentação de operação, manutenção e incidentes;
- responsável operacional e processo de suporte definidos;
- capacidade de exportar, reconciliar e auditar dados.

## 3. Escopo inicial versus qualidade

A release inicial poderá conter apenas:

- uma jornada publicada;
- um conjunto inicial de regras de personalização;
- diagnóstico operacional sem arquétipos validados;
- gamificação limitada;
- uma integração principal com o HubSpot;
- administração restrita às operações necessárias.

Essas limitações são de **amplitude funcional**, não de qualidade. Tudo que entrar no escopo deverá funcionar de ponta a ponta em produção.

## 4. Diagnóstico e personalização

O diagnóstico operacional e as dimensões provisórias poderão ser usados em produção para personalização de baixo risco, desde que:

- sua finalidade seja apresentada claramente;
- as regras sejam versionadas e explicáveis;
- exista alternativa padrão quando os dados forem insuficientes;
- os quatro arquétipos permaneçam desativados até validação;
- o resultado não seja utilizado para decisão ou condição de crédito;
- os dados permitam revisão e avaliação futura.

A ausência de validação dos arquétipos não torna a plataforma provisória; limita apenas as inferências permitidas.

## 5. Rollout inicial

O primeiro uso real poderá ocorrer por uma **coorte inicial de produção**, com liberação progressiva e monitorada. Essa estratégia serve para reduzir risco operacional, mas os usuários estarão em ambiente produtivo e receberão uma experiência real.

A coorte inicial deve possuir:

- critérios de entrada definidos;
- suporte e canal de incidentes;
- monitoramento reforçado;
- feature flags ou mecanismo equivalente;
- capacidade de pausar novas entradas;
- rollback ou desativação segura;
- critérios de expansão;
- coleta de evidências previamente documentada.

## 6. Proibições

Não será permitido em produção:

- dados, percentuais ou relatórios simulados apresentados como reais;
- autenticação ou autorização apenas visual;
- secrets em código ou repositório;
- alterações manuais de banco sem migration;
- eventos sem idempotência ou rastreabilidade;
- score comportamental influenciando crédito sem validação e aprovação;
- regras específicas da Jornada OpenAI espalhadas pelo núcleo;
- dependência síncrona do HubSpot para concluir ações centrais;
- deploy sem monitoramento, backup e procedimento de rollback;
- uso de “fase inicial” como justificativa para dívida crítica conhecida.

## 7. Gate de produção

A publicação exige aprovação documentada das seguintes dimensões:

1. produto e conteúdo;
2. dados e integridade;
3. segurança e privacidade;
4. testes e qualidade;
5. infraestrutura e deploy;
6. observabilidade e suporte;
7. recuperação e continuidade;
8. integração e reconciliação;
9. acessibilidade;
10. documentação e manutenção.

Pendências não críticas poderão existir, mas devem estar registradas com risco aceito, mitigação e prazo. Nenhuma pendência que possa expor dados, produzir decisões incorretas, corromper eventos ou impedir recuperação poderá ser aceita.
