# Princípios da release inicial de produção

**Versão:** 1.1  
**Data:** 2026-07-16  
**Status:** alinhado à hierarquia canônica e à DEC-070

## Autoridade

A release é definida por `premissas-desenvolvimento.md`, pelos documentos do pacote e por decisões posteriores aprovadas conforme [SOURCE_AUTHORITY_HIERARCHY.md](SOURCE_AUTHORITY_HIERARCHY.md).

Capacidades genéricas e testes sintéticos não substituem os requisitos oficiais.

## Definição

A primeira release de produção deve entregar a plataforma web LMS solicitada pela Estímulo, com a Jornada OpenAI operando para usuários reais na AWS.

Uma segunda jornada publicada não é requisito da primeira release sem fonte ou issue aprovada.

## Capacidades mínimas

- autenticação e autorização reais;
- entrada integrada ao site Estímulo;
- coleta ou resolução de nome, e-mail, CPF, telefone, CNPJ opcional e UTMs;
- identidade única reconciliada com HubSpot;
- diagnóstico oficial e quatro arquétipos;
- personalização por arquétipo e contexto autorizado;
- Jornada OpenAI completa;
- aulas, materiais, vídeos, quick checks, provas e práticas;
- comentários e avaliação de utilidade em cinco estrelas;
- uploads previstos;
- progresso, pontos, conquistas, ranking, recompensas, selos e certificados;
- home, trilhas, atividades, perfil e engajamento;
- administração de usuários, trilhas, conteúdo, diagnóstico, avaliações e credenciais;
- biblioteca com labels e taxonomia;
- eventos estruturados para ações relevantes;
- integração real com HubSpot no escopo da DEC-070;
- AWS staging e produção;
- logs, backup, restauração e rollback;
- responsividade e acessibilidade;
- segurança e privacidade para usuários reais.

## Diagnóstico e arquétipos

Os quatro arquétipos podem ser usados para personalização quando:

- finalidade, perguntas, alternativas e regra estiverem aprovadas;
- empate e resultado insuficiente seguirem decisão metodológica;
- a linguagem não for estigmatizante;
- o resultado não alterar crédito automaticamente;
- recálculos e overrides forem auditáveis;
- histórico e versões forem preservados.

O diagnóstico é opcional. Usuários sem diagnóstico recebem conteúdos sem restrição por arquétipo.

## Jornada OpenAI

A jornada deve ser carregada a partir dos documentos editoriais do pacote, não de fixtures.

A publicação exige:

- vídeos, slides, prompts, templates e materiais finais;
- durações reconciliadas;
- progressão e avaliações aprovadas;
- critérios de conclusão;
- regras de pontos, selos e certificados;
- termos de upload e autorização;
- legendas, transcrições e equivalências acessíveis;
- revisão de finanças, contratos, segurança e privacidade.

## HubSpot

O HubSpot recebe somente:

1. identificadores mínimos para vinculação;
2. sinais de engajamento na plataforma;
3. entradas, features e resultados úteis para cálculos aprovados.

O PostgreSQL mantém o estado operacional e o detalhe.

Antes da produção, devem estar aprovados:

- inventário real da conta;
- matriz de sincronização;
- regras de identidade e deduplicação;
- catálogo de sinais de engajamento;
- catálogo de variáveis e resultados de cálculo;
- catálogo de dados não sincronizados;
- retry, rate limiting, readback e reconciliação;
- controles de acesso e privacidade.

Não devem ser sincronizados por padrão:

- conteúdo e configuração editorial;
- estado transacional completo;
- payloads brutos sem utilidade aprovada;
- binários, URLs assinadas, logs e segredos.

## Desenvolvimento interno

A plataforma, o código, a arquitetura, os dados e a manutenção permanecem internos. Não é permitido comprar ou terceirizar um LMS como substituto. Serviços de infraestrutura e integração são permitidos.

## Rollout

O primeiro uso real pode ocorrer com coorte controlada somente após o encerramento dos gates P0.

É necessário:

- participantes definidos;
- suporte;
- monitoramento de erros, filas e sincronizações;
- capacidade de pausar entradas;
- runbooks de incidente;
- rollback;
- tratamento de dados aprovado;
- critérios de expansão.

## Proibições

Não será permitido em produção:

- dados fictícios apresentados como reais;
- conteúdo ou diagnóstico sintético apresentado como oficial;
- autenticação apenas visual;
- cadastro de teste habilitado;
- segredos em código, documentos ou logs;
- alteração manual de banco sem migration;
- evento duplicável ou sem rastreabilidade;
- dado sincronizado ao HubSpot sem classificação e finalidade;
- sinal educacional influenciando crédito sem validação;
- upload liberado sem verificação de segurança;
- deploy sem backup, restauração e rollback;
- Browser E2E sintético como única prova full-stack;
- promoção direta do Supabase para produção.

## Gate de produção

A publicação exige evidência de:

1. fluxo oficial ponta a ponta;
2. identidade e permissões reais;
3. Jornada OpenAI oficial;
4. diagnóstico oficial;
5. interfaces de participante e administração;
6. eventos para ações relevantes;
7. sincronização HubSpot da DEC-070 e reconciliação;
8. segurança, privacidade e tratamento de arquivos;
9. browser E2E real e acessibilidade;
10. AWS staging, backup, restore e rollback;
11. observabilidade e operação;
12. must-haves das issues aplicáveis.

Dívida técnica contida pode permanecer somente quando não afeta esses critérios.
