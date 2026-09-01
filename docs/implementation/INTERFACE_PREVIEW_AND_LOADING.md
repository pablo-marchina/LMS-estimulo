# Preview de interface e feedback de carregamento

**Revisado em:** 2026-09-01  
**Status:** implementação vigente

## Preview administrativo

`/admin/experiencia` permite revisar telas administrativas e participantes. A rota `/interface-preview/participant` existe porque a experiência participante normal não deve ser executada como se um administrador fosse um participante real.

A prévia exige **sessão administrativa válida e escopo autorizado da Estímulo**. Não usar `@estimulo.org` isoladamente como sinônimo de autorização: a política atual depende de identidade Google validada, identidade interna/membership e RBAC.

A prévia:

- não cria matrícula/instância;
- não registra progresso, score, resposta, entrega ou analytics;
- não monta tracking participante;
- usa bridge/sandbox para selecionar elementos editáveis;
- não substitui E2E autenticado real.

## Carregamento e shell

A plataforma usa barra global de progresso e evita skeletons de página concorrentes. Rotas participantes como `/ajuda` devem permanecer sob o shell/header participante correspondente; overflow/conteúdo não pode deslocar o header para fora da composição.

## Interação

Quando cards são feitos clicáveis, o alvo de card não deve aninhar link/form dentro de outro controle. Ações explícitas permanecem em camada própria e título/thumbnail podem compartilhar o caso de uso de abertura da aula.