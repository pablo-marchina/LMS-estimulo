# Ciclos de vida e máquinas de estado

**Versão:** 0.1  
**Data:** 2026-07-08  
**Status:** Proposta técnica  
**Escopo:** E05-T03

## 1. Objetivo

Definir estados e transições válidas para entidades centrais. Estes estados são conceituais; nomes finais no banco e na API serão definidos no modelo lógico.

## 2. Regras gerais

- estados não devem ser texto livre;
- transições passam por casos de uso autorizados;
- toda transição relevante gera evento;
- estados terminais não são revertidos por edição direta;
- transições administrativas exigem justificativa e auditoria;
- timestamps de entrada em estado devem ser preservados;
- status atual é projeção do histórico, não substituto dele.

## 3. Versão de jornada, curso, diagnóstico e regras

Estados comuns:

```mermaid
stateDiagram-v2
    [*] --> draft
    draft --> in_review: solicitar revisão
    in_review --> draft: solicitar ajustes
    in_review --> published: aprovar e publicar
    published --> retired: retirar para novas atribuições
    retired --> [*]
```

### Regras

- `draft`: editável e não executável por participantes;
- `in_review`: bloqueada para edição comum ou editada por nova revisão controlada;
- `published`: imutável e disponível conforme vigência;
- `retired`: não gera novas atribuições, mas permanece disponível para histórico e participantes existentes conforme política.

Uma versão publicada incorreta não é editada. Cria-se nova versão e registra-se uma política de migração.

## 4. Programa

```mermaid
stateDiagram-v2
    [*] --> draft
    draft --> active
    active --> paused
    paused --> active
    active --> archived
    paused --> archived
    archived --> [*]
```

- `paused` impede novas entradas, sem invalidar necessariamente participações existentes;
- `archived` encerra uso operacional e preserva histórico.

## 5. Participação em jornada

```mermaid
stateDiagram-v2
    [*] --> invited
    invited --> assigned: elegibilidade confirmada
    invited --> declined: recusa explícita
    invited --> expired: convite expirado
    assigned --> active: primeira ação válida
    assigned --> cancelled: cancelamento operacional
    assigned --> expired
    active --> paused
    paused --> active
    active --> completed: critérios atendidos
    active --> withdrawn: saída do participante
    active --> expired
    paused --> withdrawn
    paused --> expired
    completed --> [*]
    declined --> [*]
    cancelled --> [*]
    withdrawn --> [*]
    expired --> [*]
```

### Observações

- `assigned` significa jornada e trilha formalmente atribuídas;
- conclusão exige critérios da versão, não apenas 100% visualizado;
- reentrada posterior cria nova participação ou extensão explicitamente registrada;
- migração de versão não altera a participação silenciosamente.

## 6. Atribuição de trilha

```mermaid
stateDiagram-v2
    [*] --> pending
    pending --> active
    active --> completed
    active --> superseded: nova atribuição válida
    active --> cancelled
    pending --> cancelled
    completed --> [*]
    superseded --> [*]
    cancelled --> [*]
```

A atribuição mantém:

- política e versão;
- entradas utilizadas;
- justificativa;
- confiança/indeterminação, quando aplicável;
- quem ou o que aprovou a decisão.

## 7. Instância de atividade

Estado comum a todos os tipos:

```mermaid
stateDiagram-v2
    [*] --> locked
    locked --> available: pré-condições atendidas
    available --> started
    available --> skipped: política permite
    available --> expired
    started --> in_progress
    started --> completed: atividade simples
    in_progress --> submitted: exige submissão
    in_progress --> completed: conclusão automática válida
    in_progress --> paused
    paused --> in_progress
    submitted --> under_review: revisão necessária
    submitted --> completed: correção automática aprovada
    submitted --> failed: tentativa sem aprovação
    under_review --> completed: aprovada
    under_review --> revision_requested
    revision_requested --> in_progress
    failed --> in_progress: nova tentativa permitida
    locked --> cancelled
    available --> cancelled
    started --> cancelled
    in_progress --> cancelled
```

### Regras por subtipo

- conteúdo simples pode ir de `started` para `completed` após critério verificável;
- avaliação utiliza tentativas próprias; falhar uma tentativa não cancela a atividade;
- prática pode passar por `submitted`, `under_review` e `revision_requested`;
- `skipped` só existe quando a versão da jornada permite.

## 8. Sessão diagnóstica

```mermaid
stateDiagram-v2
    [*] --> created
    created --> in_progress
    in_progress --> submitted
    in_progress --> abandoned
    abandoned --> in_progress: retomada permitida
    in_progress --> expired
    submitted --> scoring
    scoring --> scored
    scoring --> scoring_failed
    scoring_failed --> scoring: retry/reprocessamento
    scored --> invalidated: erro ou regra formal
    scored --> [*]
    invalidated --> [*]
    expired --> [*]
```

- resposta pode ser alterada enquanto a sessão está `in_progress`;
- `submitted` congela o conjunto de respostas daquela execução;
- novo cálculo preserva a execução anterior;
- invalidação exige motivo e auditoria.

## 9. Tentativa de avaliação

```mermaid
stateDiagram-v2
    [*] --> created
    created --> in_progress
    in_progress --> submitted
    in_progress --> expired
    submitted --> grading
    grading --> passed
    grading --> failed
    grading --> grading_error
    grading_error --> grading
    passed --> [*]
    failed --> [*]
    expired --> [*]
```

- cada tentativa guarda a versão da avaliação;
- número máximo e intervalo entre tentativas pertencem à configuração da atividade;
- correção posterior não sobrescreve o resultado original sem registro de regrade.

## 10. Submissão prática

```mermaid
stateDiagram-v2
    [*] --> draft
    draft --> submitted
    submitted --> under_review
    submitted --> withdrawn: antes do início da revisão, se permitido
    under_review --> approved
    under_review --> rejected
    under_review --> revision_requested
    revision_requested --> draft
    approved --> revoked: erro ou violação formal
    rejected --> [*]
    withdrawn --> [*]
    approved --> [*]
    revoked --> [*]
```

- submissão enviada não deve ser apagada pelo participante;
- uma revisão nova complementa o histórico;
- anexos seguem política própria de retenção e segurança.

## 11. Intervenção

```mermaid
stateDiagram-v2
    [*] --> candidate
    candidate --> suppressed: regra de supressão
    candidate --> scheduled: elegível
    scheduled --> queued
    queued --> dispatched
    dispatched --> delivered
    dispatched --> failed
    failed --> queued: retry permitido
    delivered --> engaged
    delivered --> ignored: janela encerrada
    engaged --> completed
    scheduled --> expired
    queued --> expired
    suppressed --> [*]
    ignored --> [*]
    completed --> [*]
    expired --> [*]
```

A intervenção de negócio é separada das tentativas de entrega por canal.

## 12. Certificado

```mermaid
stateDiagram-v2
    [*] --> eligible
    eligible --> issued
    eligible --> eligibility_expired
    issued --> expired
    issued --> revoked
    issued --> superseded
    expired --> [*]
    revoked --> [*]
    superseded --> [*]
```

- elegibilidade é calculada por critérios versionados;
- emissão preserva evidências;
- revogação não remove o certificado do histórico, mas altera a validade pública.

## 13. Processamento de evento

```mermaid
stateDiagram-v2
    [*] --> pending
    pending --> processing
    processing --> succeeded
    processing --> retryable_failed
    retryable_failed --> pending
    processing --> permanent_failed
    retryable_failed --> dead_letter: limite excedido
    succeeded --> [*]
    permanent_failed --> dead_letter
    dead_letter --> requeued: ação autorizada
    requeued --> pending
```

## 14. Sincronização externa

```mermaid
stateDiagram-v2
    [*] --> pending
    pending --> processing
    processing --> succeeded
    processing --> retryable_failed
    retryable_failed --> pending
    retryable_failed --> dead_letter
    processing --> conflict
    conflict --> resolved
    resolved --> pending: reenviar se necessário
    succeeded --> [*]
    dead_letter --> [*]
```

## 15. Transições ainda dependentes de definição

- estados reais da operação de crédito;
- regras de pausa/expiração da Jornada OpenAI;
- possibilidade de retirada do consentimento durante uma participação;
- política de migração de participantes entre versões;
- SLA de revisão de atividades práticas;
- validade e expiração de certificados.
