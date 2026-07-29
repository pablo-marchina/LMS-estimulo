# Fluxo lógico de integração com HubSpot

**Versão:** 1.3  
**Data:** 2026-07-29  
**Status:** política e adapter HTTP implementados; inventário, SQS worker, sandbox e reconciliação pendentes

## Objetivo

Este fluxo implementa a [`DEC-070`](../decisions/HUBSPOT_SCOPE_DECISION.md). O PostgreSQL é o banco operacional e detalhado. O HubSpot recebe somente dados minimizados e aprovados para vínculo, engajamento ou cálculos autorizados.

## Classificação

```text
linking_identifier
engagement_signal
calculation_input_or_result
not_synced
```

Cada projeção precisa declarar:

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

Sem inventário e destino físico aprovado, o item permanece `not_synced`.

## Fluxo canônico AWS

```text
participante ou operador executa ação
→ LMS valida identidade, autorização e estado
→ RDS PostgreSQL persiste estado, evento e outbox atomicamente
→ dispatcher seleciona itens elegíveis
→ transformer aplica matriz, minimização e agregação
→ mensagem é publicada em SQS
→ Lambda consumidora chama o adapter HTTP HubSpot
→ readback e receipt são persistidos
→ sucesso, retry, DLQ ou reconciliação
```

A experiência do participante não depende da confirmação síncrona do HubSpot.

## Adapter HTTP implementado

O adapter real já existe e:

- usa API CRM v3;
- exige object type e ID interno explícitos;
- aceita somente propriedades allowlisted;
- faz PATCH parcial e GET/readback;
- compara hashes e versão física;
- classifica falhas transitórias e permanentes;
- respeita `retry-after` quando disponível;
- redige detalhes de erro;
- falha fechado sem token ou portal;
- não cria registros, associações ou deduplicação sem inventário aprovado.

O adapter em memória permanece apenas como double de contrato. Idempotência em memória não é garantia distribuída e não substitui outbox, receipts e consumidor persistente.

## Itens pendentes

- inventário real de objetos, propriedades, events e association types;
- private app, scopes mínimos e sandbox;
- matriz de sincronização aprovada;
- resolução, criação, associação e deduplicação de identidade;
- dispatcher de outbox;
- filas SQS e DLQ;
- Lambda consumidora com reserved concurrency;
- batch, retry, backoff e jitter operacionais;
- receipts persistentes e reconciliação;
- webhooks de entrada com assinatura e replay protection;
- dashboards e alarmes de backlog, idade, erros e rate limit;
- testes de escrita/readback e recuperação no sandbox.

## Dados elegíveis

Após aprovação de destino:

- identificadores canônicos mínimos;
- marcos agregados de início, progresso e conclusão;
- conclusões agregadas de atividade;
- pontos, conquistas ou credenciais quando aprovados;
- inputs, features e resultados de cálculo com finalidade e versão aprovadas.

## Dados bloqueados por padrão

- CPF bruto e outros identificadores sem necessidade específica;
- respostas brutas de diagnóstico;
- comentários e textos abertos;
- arquivos binários e URLs assinadas;
- conteúdo e configuração editorial;
- logs, traces, filas, retries e secrets;
- sinais sem destino, finalidade ou classificação aprovados.

## Readback

Readback é obrigatório quando a próxima ação depende da confirmação, incluindo:

- resolução ou criação de registro;
- deduplicação e associação;
- escrita consumida por workflow externo;
- atualização com expectativa de versão;
- projeção crítica para cálculo aprovado.

## Indisponibilidade

Quando o HubSpot estiver indisponível:

- o LMS continua persistindo no PostgreSQL;
- itens elegíveis permanecem na outbox/SQS;
- retries usam backoff, jitter e idempotência persistente;
- `429` respeita limites e `retry-after`;
- falhas permanentes seguem para DLQ/reconciliação;
- backlog e idade geram alarmes;
- recuperação precisa provar ausência de perda ou duplicação divergente.

## Entrada a partir do HubSpot

```text
webhook ou leitura programada
→ validação de origem, assinatura, timestamp e replay
→ receipt/idempotência
→ resolução da identidade interna
→ validação de versão e atualidade
→ atualização de snapshot autorizado
→ evento de integração
```

Somente dados autorizados podem influenciar o LMS. Webhooks ainda não estão implementados.

## Gate

```text
hubspot_policy_implemented = true
hubspot_http_adapter_implemented = true
hubspot_inventory_complete = false
hubspot_sync_matrix_approved = false
hubspot_sandbox_proven = false
sqs_worker_active = false
persistent_receipts_active = false
identity_linking_tested = false
engagement_signal_sync_tested = false
calculation_variable_sync_tested = false
reconciliation_tested = false
```
