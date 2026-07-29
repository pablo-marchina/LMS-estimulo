# Fluxo lógico de integração com HubSpot

**Versão:** 1.2  
**Data:** 2026-07-29  
**Status:** escopo aprovado pela DEC-070; adapter real pendente

## Objetivo

Este fluxo implementa a [`DEC-070`](../decisions/HUBSPOT_SCOPE_DECISION.md).

O PostgreSQL é o banco operacional e detalhado. O HubSpot recebe apenas identificadores mínimos de vínculo, sinais de engajamento e informações úteis para cálculos aprovados.

## Categorias sincronizadas

### Identificadores mínimos

- ID interno do usuário;
- ID do contato HubSpot;
- ID da empresa quando necessário;
- ID da operação de crédito quando necessário;
- chaves de associação aprovadas.

CPF, CNPJ, e-mail e telefone podem ser consultados para resolução de identidade, mas a integração do LMS não deve duplicá-los em payloads de engajamento além do necessário.

### Engajamento

- acesso, frequência e retorno;
- início, progresso e conclusão;
- atividade, trilha e jornada;
- participação e avaliação de utilidade;
- tentativas e resultados agregados;
- práticas e uploads por estado;
- pontos, conquistas, recompensas e credenciais;
- abandono, retomada e sequência de marcos.

### Dados úteis para cálculo

- respostas selecionadas e resultados do diagnóstico;
- dimensões, arquétipo e maturidade;
- features derivadas de comportamento;
- contexto autorizado;
- classificações, recomendações e ativações;
- desfechos de pesquisa ou avaliação.

Cada variável precisa de finalidade, versão e governança.

## Fluxo de saída

```text
participante ou operador executa ação
→ LMS valida identidade, autorização e estado
→ PostgreSQL persiste estado detalhado
→ evento e outbox são gravados atomicamente
→ transformer consulta a matriz HubSpot
→ item é agregado, minimizado ou descartado conforme classificação
→ adapter escreve no HubSpot com idempotência
→ receipt é registrado
→ falha segue retry ou reconciliação
```

A experiência do participante não depende por padrão da confirmação síncrona do HubSpot.

## Matriz de sincronização

Cada item deve declarar:

```text
source_entity_or_event
sync_classification
business_purpose
calculation_or_engagement_use
hubspot_object
property_event_or_association
transformation
aggregation_window
sync_frequency
maximum_delay
sensitivity
retention
reconciliation_rule
```

Valores de `sync_classification`:

```text
linking_identifier
engagement_signal
calculation_input_or_result
not_synced
```

## Granularidade

A representação pode usar:

- propriedades de contato ou empresa;
- custom behavioral events;
- objetos personalizados;
- atividades de timeline;
- snapshots ou agregados temporais;
- resultados calculados e versionados.

Não é obrigatório enviar cada evento bruto. A granularidade escolhida deve preservar a utilidade aprovada para engajamento ou cálculo.

## Escritas com readback

Readback é usado quando a próxima ação depende da confirmação, incluindo:

- resolução ou criação de contato;
- deduplicação;
- associação com empresa ou crédito;
- escrita crítica consumida por workflow externo;
- atualização com expectativa de versão.

## Fluxo de entrada

```text
webhook ou leitura programada
→ validação de origem, assinatura e replay
→ receipt e idempotência
→ resolução de identidade
→ validação da versão/atualidade
→ atualização de snapshot autorizado no LMS
→ evento de integração
```

Somente dados autorizados do HubSpot podem influenciar o LMS.

## Dados não sincronizados

- configurações editoriais completas;
- conteúdo integral de aulas;
- banco de questões como catálogo;
- respostas abertas e comentários integrais sem finalidade específica;
- arquivos binários;
- URLs assinadas;
- logs, traces, filas e retries;
- segredos e tokens;
- dados temporários sem uso de engajamento ou cálculo.

## Indisponibilidade

Quando o HubSpot estiver indisponível:

- ações continuam no PostgreSQL;
- itens elegíveis permanecem na outbox;
- retries usam backoff, jitter e idempotência;
- `429` respeita limites aplicáveis;
- falhas permanentes seguem para reconciliação;
- backlog e idade geram alertas;
- recuperação deve provar ausência de perda dos itens sincronizáveis.

## Requisitos do adapter real

- autenticação e scopes mínimos;
- inventário de objetos e propriedades;
- busca e deduplicação;
- propriedades, objetos e eventos adequados;
- batch;
- idempotência;
- tratamento de `429`, `4xx` e `5xx`;
- webhooks;
- readback;
- observabilidade sem payload sensível;
- reconciliação;
- testes no sandbox.

## Critério de conclusão

```text
hubspot_inventory_complete = true
hubspot_sync_matrix_approved = true
real_adapter_implemented = true
identity_linking_tested = true
engagement_signal_sync_tested = true
calculation_variable_sync_tested = true
not_synced_rules_tested = true
idempotency_retry_rate_limit_tested = true
reconciliation_tested = true
critical_readback_tested = true
```