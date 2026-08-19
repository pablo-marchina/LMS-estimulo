# Ciclo de vida das jornadas

**Revisado em:** 2026-08-19  
**Status:** implementação vigente

## Modelo

Uma jornada é uma entidade única. Não existe histórico editorial navegável nem migração entre versões de jornada.

Estados operacionais (edição/publicação):

```text
draft <-> published
```

- `draft`: não disponível aos participantes, editável e passível de exclusão;
- `published`: disponível aos participantes e editável diretamente.

Além desses dois, existe um terceiro estado terminal, `retired` ("arquivada"), alcançado a partir de `draft` ou `published` via a ação administrativa "Arquivar jornada" (`retire_admin_journey`, mesma permissão `journey.definition.manage` usada para editar). Uma jornada arquivada some do painel administrativo padrão e não é reapresentada aos participantes; não há função de reversão (`unretire`) documentada nas migrations atuais — trate como estado terminal até que uma seja adicionada.

A coluna e alguns parâmetros internos ainda podem usar nomes históricos como `journey_version_id`. Eles são detalhes de compatibilidade do esquema e ficam fixados em uma relação operacional 1:1; não representam versões selecionáveis do produto.

## Publicação

Publicar altera o mesmo registro de `draft` para `published`. Não há clone, numeração incremental ou migração de participantes.

## Edição ao vivo

Uma jornada publicada pode receber alterações. Participantes veem o novo estado no próximo carregamento ou navegação.

- elementos mantidos preservam seus identificadores;
- itens novos passam a integrar a experiência vigente;
- itens removidos deixam de aparecer;
- respostas, entregas, eventos e dados já persistidos seguem suas políticas próprias de retenção e integridade.

## Despublicação

Despublicar altera o mesmo registro para `draft` e bloqueia o uso participante. Execuções ativas e matrículas afetadas são encerradas conforme o contrato operacional do banco.

## Exclusão

Somente jornadas em `draft` podem ser excluídas. A exclusão é uma ação administrativa explícita e validada no servidor.

## Auditoria

Publicação, edição, despublicação e exclusão passam por casos de uso autorizados e geram evidência de auditoria. O produto não apresenta snapshots editoriais antigos como jornadas paralelas.
