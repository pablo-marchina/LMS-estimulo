# Ciclos de vida e máquinas de estado

**Revisado em:** 2026-08-01  
**Status:** implementação vigente e contratos conceituais complementares

## Regras gerais

- estados não são texto livre;
- transições passam por casos de uso autorizados;
- operações relevantes geram auditoria e, quando aplicável, evento;
- fatos de execução não são reescritos por edição editorial;
- timestamps e razões de cancelamento são preservados.

## Jornada

A jornada é única e possui dois estados visíveis:

```mermaid
stateDiagram-v2
    [*] --> draft
    draft --> published: publicar
    published --> draft: despublicar
    draft --> [*]: excluir
```

- `draft`: editável, indisponível ao participante e passível de exclusão;
- `published`: disponível e editável ao vivo;
- publicar e despublicar alteram o mesmo registro;
- não existe nova versão, snapshot selecionável ou migração de participantes;
- a despublicação interrompe o uso ativo segundo o contrato do banco.

Identificadores internos com nome `journey_version_id` são compatibilidade técnica 1:1 e não constituem um terceiro estado ou sistema de versões.

## Programa

```mermaid
stateDiagram-v2
    [*] --> draft
    draft --> active
    active --> paused
    paused --> active
    active --> archived
    paused --> archived
```

## Participação em jornada

```mermaid
stateDiagram-v2
    [*] --> assigned
    assigned --> active: primeira ação válida
    assigned --> cancelled
    active --> completed: critérios atendidos
    active --> cancelled: jornada despublicada ou ação administrativa
    active --> withdrawn
    completed --> [*]
    cancelled --> [*]
    withdrawn --> [*]
```

A participação aponta para a jornada operacional vigente. Alterações editoriais são percebidas no próximo carregamento, sem migração entre versões.

## Atribuição de trilha

```mermaid
stateDiagram-v2
    [*] --> pending
    pending --> active
    active --> completed
    active --> cancelled
    pending --> cancelled
```

## Instância de atividade

```mermaid
stateDiagram-v2
    [*] --> locked
    locked --> available: pré-condições atendidas
    available --> started
    started --> in_progress
    started --> completed
    in_progress --> submitted
    in_progress --> completed
    submitted --> under_review
    submitted --> completed
    submitted --> failed
    under_review --> completed
    under_review --> revision_requested
    revision_requested --> in_progress
    failed --> in_progress: nova tentativa permitida
    locked --> cancelled
    available --> cancelled
    started --> cancelled
    in_progress --> cancelled
```

## Sessão diagnóstica

```mermaid
stateDiagram-v2
    [*] --> created
    created --> in_progress
    in_progress --> submitted
    in_progress --> abandoned
    abandoned --> in_progress
    submitted --> scoring
    scoring --> scored
    scoring --> scoring_failed
    scoring_failed --> scoring
    scored --> invalidated
```

## Tentativa de avaliação

```mermaid
stateDiagram-v2
    [*] --> created
    created --> in_progress
    in_progress --> submitted
    submitted --> grading
    grading --> passed
    grading --> failed
    grading --> grading_error
    grading_error --> grading
```

Cada tentativa preserva perguntas, respostas e resultado necessários para auditoria, mesmo quando a atividade é editada depois.

## Submissão prática

```mermaid
stateDiagram-v2
    [*] --> draft
    draft --> submitted
    submitted --> under_review
    under_review --> approved
    under_review --> rejected
    under_review --> revision_requested
    revision_requested --> draft
    approved --> revoked
```

## Certificado

```mermaid
stateDiagram-v2
    [*] --> eligible
    eligible --> issued
    issued --> expired
    issued --> revoked
    issued --> superseded
```

## Processamento de evento e sincronização

```mermaid
stateDiagram-v2
    [*] --> pending
    pending --> processing
    processing --> succeeded
    processing --> retryable_failed
    retryable_failed --> pending
    processing --> permanent_failed
    retryable_failed --> dead_letter
```

## Definições ainda abertas

- SLA de revisão de atividades práticas;
- validade e expiração de certificados;
- políticas institucionais de retenção por categoria de dado;
- arquitetura AWS definitiva e estados operacionais associados.
