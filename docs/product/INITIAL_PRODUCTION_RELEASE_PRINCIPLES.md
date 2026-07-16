# Princípios da release inicial de produção

**Versão:** 1.0  
**Data:** 2026-07-16  
**Status:** alinhado à hierarquia canônica

## Autoridade

A release é definida por `premissas-desenvolvimento.md` e pelos documentos do pacote conforme [SOURCE_AUTHORITY_HIERARCHY.md](SOURCE_AUTHORITY_HIERARCHY.md).

Capacidades genéricas, testes sintéticos e decisões técnicas não podem substituir os requisitos oficiais.

## Definição

A primeira release de produção deve entregar a plataforma web LMS solicitada pela Estímulo, com a Jornada OpenAI operando para usuários reais na AWS.

A arquitetura deve permitir evolução futura, mas uma segunda jornada publicada não é requisito da primeira release sem fonte ou issue aprovada.

## Capacidades mínimas

A release inicial precisa possuir:

- autenticação e autorização reais;
- entrada integrada ao site Estímulo;
- coleta ou resolução de nome, e-mail, CPF, telefone, CNPJ opcional e UTMs;
- identidade única reconciliada com HubSpot;
- diagnóstico oficial e quatro arquétipos;
- personalização por arquétipo e contexto autorizado;
- Jornada OpenAI completa e publicável;
- aulas, materiais, vídeos, quick checks, provas e práticas;
- comentários;
- avaliação de utilidade em cinco estrelas;
- uploads previstos;
- progresso, pontos, conquistas, ranking, recompensas, selos e certificados conforme regras aprovadas;
- home, trilhas, atividades, perfil e engajamento do participante;
- gestão de usuários, trilhas, conteúdo, diagnóstico, avaliações e credenciais pela administração;
- biblioteca de conteúdo com labels e taxonomia;
- eventos estruturados para todas as ações relevantes;
- integração real com HubSpot cobrindo todos os dados do usuário capturados ou usados;
- AWS staging e produção;
- logs, backup, restauração e rollback;
- responsividade e acessibilidade dos fluxos críticos;
- controles de segurança e privacidade para usuários reais.

## Diagnóstico e arquétipos

Os quatro arquétipos oficiais podem ser usados para personalização educacional e de relacionamento quando:

- a finalidade for apresentada;
- perguntas, alternativas e regra oficial estiverem versionadas;
- empate, resposta ausente e resultado insuficiente seguirem decisão metodológica;
- o participante receber explicação não estigmatizante;
- o resultado não aprovar, reprovar ou alterar condição de crédito;
- recálculos e overrides forem auditáveis;
- o histórico for preservado.

O diagnóstico é opcional. Usuários sem diagnóstico recebem somente conteúdos sem restrição por arquétipo.

## Jornada OpenAI

A Jornada OpenAI deve ser carregada a partir dos documentos de conteúdo do pacote e não de fixtures sintéticas.

A publicação exige:

- vídeos, slides, prompts, templates e materiais finais;
- durações reconciliadas;
- progressão aprovada;
- avaliações completas;
- critérios de conclusão;
- regras de pontos, selos e certificados;
- termos de upload e autorização de uso;
- legendas, transcrições e equivalências acessíveis;
- revisão dos conteúdos de finanças, contratos, segurança e privacidade.

## HubSpot

O HubSpot deve conter representação de todos os dados do usuário capturados ou usados.

A implementação pode usar:

- PostgreSQL para estado operacional e event store;
- outbox para entrega confiável;
- sincronização assíncrona para ações que não exigem confirmação imediata;
- readback para identidade, deduplicação, crédito e escritas críticas.

Antes da produção, devem estar aprovados:

- inventário real da conta;
- matriz completa de dados;
- objetos, propriedades, associações e eventos;
- estratégia para eventos comportamentais de alto volume;
- retry, rate limiting e reconciliação;
- controles de acesso e privacidade.

## Desenvolvimento interno

A plataforma, o código, a arquitetura, os dados e a manutenção permanecem internos.

Não é permitido comprar ou terceirizar um LMS como substituto. Serviços exigidos de infraestrutura e integração podem ser usados sem transferir a responsabilidade central.

## Rollout

O primeiro uso real pode ocorrer com uma coorte controlada, desde que o ambiente seja de produção e todos os gates P0 estejam encerrados.

É necessário:

- participantes definidos;
- canal de suporte;
- monitoramento de erros, filas e sincronizações;
- capacidade de pausar novas entradas;
- runbooks de incidente;
- rollback;
- tratamento de dados e consentimentos aprovados;
- critérios de expansão.

## Proibições

Não será permitido em produção:

- dados fictícios apresentados como reais;
- diagnóstico ou conteúdo sintético apresentado como oficial;
- autenticação apenas visual;
- cadastro de teste habilitado;
- secrets em código, documentos ou logs;
- alterações manuais de banco sem migration;
- eventos duplicáveis, sem finalidade ou sem rastreabilidade;
- categoria de dado do usuário sem destino HubSpot aprovado;
- score educacional influenciando crédito sem validação e governança;
- upload liberado sem verificação de segurança;
- deploy sem backup, restauração e rollback comprovados;
- dependência do Browser E2E sintético como única prova full-stack;
- promoção direta do Supabase para produção.

## Gate de produção

A publicação exige evidência de:

1. fluxo oficial ponta a ponta;
2. identidade, CPF/CNPJ e permissões reais;
3. Jornada OpenAI oficial;
4. diagnóstico oficial;
5. interface de participante e administração;
6. eventos para todas as ações relevantes;
7. integração completa HubSpot e reconciliação;
8. segurança, privacidade e tratamento de arquivos;
9. browser E2E real e acessibilidade;
10. AWS staging, backup, restore e rollback;
11. observabilidade e operação;
12. must-haves das issues aplicáveis.

Dívida técnica contida pode permanecer somente quando não afetar esses critérios nem criar dependência futura desproporcional.
