# Fluxo lógico de integração com HubSpot

**Versão:** 1.0  
**Data:** 2026-07-16  
**Status:** alinhado à premissa; adapter real pendente

## Autoridade e objetivo

Este fluxo implementa [ADR-003](../decisions/ADR-003-HUBSPOT-AUTHORITATIVE-DATA-SOURCE.md) e a exigência superior de que todos os dados do usuário capturados ou usados possuam representação no HubSpot.

O HubSpot é o centro das informações do usuário. O PostgreSQL é o banco operacional, event store e mecanismo de entrega confiável.

## Categorias obrigatórias

A integração deve cobrir:

- identidade, contato, CPF, telefone, CNPJ e UTMs;
- negócio e associações;
- contexto e jornada de crédito autorizados;
- diagnóstico, respostas, versão, resultado e histórico;
- arquétipo, maturidade e contextos usados;
- matrículas, elegibilidade, recomendações e ativações;
- progresso, sessões, atividades, avaliações e tentativas;
- comentários, avaliações de utilidade e práticas;
- uploads, consentimento, status de segurança e revisão;
- pontos, conquistas, ranking, recompensas, selos e certificados;
- eventos comportamentais, sequência e contexto;
- segmentos, tarefas, comunicações e intervenções.

A matriz de dados define o recurso físico do HubSpot para cada categoria. Não pode excluir unilateralmente uma categoria de dado do usuário.

## Fluxo de saída do LMS

```text
participante ou operador executa ação
→ LMS valida identidade, autorização e estado
→ transação persiste estado operacional
→ evento e outbox são gravados atomicamente
→ dispatcher seleciona itens pendentes
→ transformer produz representação HubSpot
→ adapter escreve com idempotência
→ receipt é registrado
→ sucesso encerra a entrega
→ falha segue retry, DLQ operacional ou reconciliação
```

A experiência do participante não depende por padrão da confirmação síncrona do HubSpot, mas nenhuma informação pode ser descartada durante a indisponibilidade.

## Representação de eventos comportamentais

Eventos podem ser materializados no HubSpot como:

- custom behavioral events;
- objetos personalizados associados;
- atividades de timeline;
- propriedades agregadas com histórico;
- snapshots ou lotes aprovados;
- referência íntegra para detalhe recuperável, quando tecnicamente necessário.

A estratégia escolhida deve preservar:

- usuário;
- tipo de ação;
- data e hora;
- sequência;
- objeto e jornada;
- versão da configuração;
- contexto;
- origem;
- estado de entrega;
- rastreabilidade para o evento canônico.

## Escritas que exigem confirmação

Readback deve ser usado antes do próximo efeito quando houver dependência imediata, incluindo:

- criação ou resolução de contato/empresa;
- deduplicação;
- vínculo com crédito existente;
- atualização de dado crítico consumido por workflow externo;
- escrita sujeita a conflito de versão;
- associação que será usada em ação irreversível.

Para progresso, avaliação e eventos comuns, entrega assíncrona com reconciliação é suficiente.

## Fluxo de entrada do HubSpot

```text
webhook ou leitura programada
→ validação de origem, assinatura e replay
→ receipt e idempotência
→ resolução de contato, empresa e operação
→ validação da versão/atualidade
→ atualização do snapshot autorizado no LMS
→ evento de integração
→ reconciliação quando necessário
```

Podem influenciar o LMS somente dados autorizados, como identidade, empresa, segmento, status de crédito, preferências e contexto de relacionamento.

## Matriz completa de dados

Cada linha deve declarar:

```text
source_entity_or_event
user_data_category
business_purpose
hubspot_object
property_event_or_association
representation_mode
transformation
sync_frequency
maximum_delay
sensitivity
retention
access_scope
reconciliation_rule
failure_owner
```

A matriz também deve identificar:

- volume estimado;
- limites de API/licença;
- uso de batch;
- regra de deduplicação;
- consulta de verificação;
- caminho de recuperação.

## Configuração editorial

Formulários, jornadas, conteúdos, avaliações, arquétipos e regras permanecem versionados no LMS.

O HubSpot recebe:

- versões necessárias para interpretar o histórico do usuário;
- respostas e resultados relacionados ao usuário;
- estado vigente e histórico operacional necessário;
- associações e referências para as entidades editoriais.

Entidades editoriais sem vínculo com usuário não precisam ser duplicadas integralmente no CRM.

## Arquivos

Arquivos binários permanecem no storage privado.

Quando relacionados ao usuário, o HubSpot recebe metadados e referência segura, incluindo:

- finalidade;
- contexto;
- status de scan;
- status de revisão;
- autorização de uso;
- identificador do objeto;
- retenção.

Segredos, tokens, URLs assinadas expirantes e arquivos não liberados não são enviados.

## Indisponibilidade

Quando o HubSpot estiver indisponível:

- ações do LMS continuam sendo persistidas;
- todas as representações permanecem pendentes;
- retries usam backoff, jitter e idempotência;
- `429` respeita limites e headers aplicáveis;
- falhas permanentes seguem para reconciliação;
- backlog, idade e volume geram alertas;
- recuperação deve provar que nenhum dado do usuário foi perdido.

## Requisitos do adapter real

- autenticação e scopes mínimos;
- inventário de objetos e propriedades;
- contato, empresa, crédito e associações;
- objetos/eventos comportamentais adequados;
- busca e deduplicação;
- batch;
- idempotência;
- tratamento de `429`, `4xx` e `5xx`;
- webhooks;
- readback;
- observabilidade sem segredo;
- reconciliação periódica;
- testes no sandbox.

## Dados excluídos da sincronização de usuário

Somente podem ser excluídos por padrão:

- segredos e tokens;
- logs puramente técnicos sem informação do usuário;
- arquivos binários, quando seus metadados e referência adequada forem sincronizados;
- dados temporários internos de retry sem valor de relacionamento;
- informação proibida por lei ou política, com a exclusão documentada.

Uma ação do usuário não pode ser classificada como log técnico para evitar o requisito.

## Critério de conclusão

```text
hubspot_inventory_complete = true
complete_user_data_matrix_approved = true
all_user_data_categories_mapped = true
real_adapter_implemented = true
identity_mapping_and_deduplication_tested = true
behavioral_event_representation_tested = true
idempotency_retry_rate_limit_tested = true
reconciliation_tested = true
critical_readback_tested = true
outage_backlog_recovery_tested = true
no_user_data_category_silently_excluded = true
```
