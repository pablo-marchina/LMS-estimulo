# Relatório de correção de escopo — multi-jornada

**Data:** 2026-07-08  
**Status:** Aplicado

## Erro corrigido

Documentos anteriores usaram expressões como “escopo limitado à Jornada OpenAI” e “uma jornada”. Isso confundia duas coisas diferentes:

1. quantidade de jornadas com conteúdo pronto no lançamento;
2. capacidade estrutural do produto.

## Interpretação correta

- A Jornada OpenAI será o primeiro conteúdo implementado e publicado.
- A plataforma será multi-jornada desde a primeira release de produção.
- Nova jornada deverá poder ser criada e publicada sem alterar o núcleo ou o schema estrutural.

## Documentos alterados

- `PROJECT_INDEX.md`;
- `PREMISES_AND_SCOPE.md`;
- `INITIAL_PRODUCTION_RELEASE_PRINCIPLES.md`;
- `PRODUCT_CONTEXT.md`;
- `INFORMATION_INVENTORY.md`;
- `DECISION_LOG.md`;
- `BACKLOG_STATUS.md`.

## Controle preventivo

Foi adicionado um teste obrigatório de extensibilidade com uma segunda jornada sintética antes do gate de produção.
