# Auditoria das interfaces e mockups codificados

**Versão:** 0.1  
**Status:** Análise estática concluída; validação visual em runtime pendente.

## Escopo observado

Foram identificadas páginas de:

- marketing;
- login, cadastro e recuperação de senha;
- dashboard do aluno;
- jornada e player;
- cursos, biblioteca, prompts e downloads;
- entregas, pontos, conquistas, certificados e notificações;
- perfil e configurações;
- painel admin, cursos, aulas, entregas e relatórios.

## Avaliação geral

A cobertura de superfícies é ampla e comunica bem a visão de um LMS. Porém, ela antecede definições centrais do produto e contém mais páginas do que funcionalidades reais. O maior risco é converter cada mockup em requisito e modelar o banco para alimentar telas que talvez não façam parte do primeiro fluxo validado.

## Manter como referência

- dashboard com próximo passo e progresso;
- mapa de jornada;
- player com conteúdo, materiais, avaliação rápida e prática;
- histórico de pontos baseado em ledger;
- selos e certificados;
- curadoria de entregas;
- visão administrativa de conteúdo e operação.

## Redesenhar antes de implementar

### Dashboard

Deve priorizar:

1. próxima ação recomendada;
2. motivo da recomendação;
3. progresso verificável;
4. intervenção pendente;
5. atividade prática;
6. contexto da jornada.

Métricas como pontos e selos não devem competir com a ação principal.

### Jornada

A tela atual apresenta blocos fixos da OpenAI e progresso simulado. O modelo final precisa distinguir:

- jornada atribuída;
- versão;
- trilha personalizada;
- obrigatoriedade;
- desbloqueio;
- conteúdo opcional;
- intervenção;
- conclusão válida.

### Player

Precisa de estados reais para:

- carregamento;
- vídeo indisponível;
- salvamento de progresso;
- offline/retomada;
- avaliação submetida;
- tentativa recusada;
- prática enviada;
- erro de upload;
- bloqueio por pré-requisito.

A avaliação por estrelas precisa ser um controle interativo acessível, e não cinco ícones estáticos.

### Administração

O painel atual agrupa muitos domínios, mas não define workflows. A administração inicial deve ser reduzida a:

- editar/publicar versão da Jornada OpenAI;
- acompanhar participantes;
- revisar atividades práticas;
- consultar eventos e erros;
- reprocessar integração;
- emitir/revogar certificado;
- exportar dados autorizados.

### Relatórios

Devem ser removidos ou claramente identificados como demonstração enquanto não houver dados reais. Nenhum percentual fictício deve aparecer em ambiente de produção.

## Superfícies ainda ausentes

- diagnóstico;
- resultado explicável do diagnóstico;
- seleção/atribuição de trilha;
- gestão de versões da jornada;
- momentos e regras de intervenção;
- visualização de eventos e falhas;
- status de sincronização HubSpot;
- gestão de consentimento e privacidade;
- painel experimental de features/score com restrições de uso;
- administração de empresas/empreendedores;
- comparação entre coortes/pilotos;
- estados completos de erro, vazio, loading e offline.

## Problemas de acessibilidade/UX observáveis no código

- páginas não possuem estados de foco/erro contextual específicos para formulários de autenticação;
- botões visuais sem ação podem criar falsas expectativas;
- tabelas largas dependem de rolagem horizontal, sem alternativa para mobile;
- estrelas não são controles interativos;
- mensagens de progresso e desbloqueio são estáticas;
- imagens de screenshot incluídas no repositório foram renderizadas como páginas totalmente brancas no ambiente de auditoria, portanto não serviram como evidência visual.

## Decisão inicial

Os mockups devem permanecer como biblioteca de ideias, não como backlog de features. A primeira interface a ser implementada deverá seguir o vertical slice aprovado, começando por identidade, diagnóstico, atribuição da Jornada OpenAI, uma atividade completa e registro de eventos.
