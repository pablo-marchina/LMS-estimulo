# Fluxo lógico de integração com HubSpot

**Versão:** 0.3  
**Data:** 2026-07-14  
**Status:** fluxo lógico simplificado; adapter real pendente

## Papel do HubSpot

O HubSpot é o User 360 da Estímulo e concentra os dados necessários para relacionamento e acompanhamento do empreendedor.

Projeções prioritárias:

- identidade e negócio;
- vínculo com a jornada de crédito;
- versão e resultado vigente do diagnóstico;
- arquétipo vigente;
- matrícula e progresso agregado;
- conclusão, selos e certificados;
- sinais comportamentais aprovados;
- segmentos, tarefas e comunicações.

O HubSpot não substitui o banco operacional do LMS nem o event store detalhado.

## Fluxo de saída do LMS

```text
participante ou operador executa ação
→ LMS valida e persiste a transação
→ evento e outbox são gravados atomicamente
→ worker transforma a projeção necessária
→ adapter escreve no HubSpot com idempotência
→ sucesso encerra a entrega
→ falha segue retry e reconciliação
```

A experiência do participante não depende, por padrão, da confirmação síncrona do HubSpot.

## Escritas que exigem confirmação

Readback deve ser usado quando a confirmação do CRM é necessária antes do próximo efeito, como:

- criação ou vínculo de identidade CRM;
- alteração de dado crítico consumido imediatamente por workflow externo;
- escrita sujeita a conflito de versão;
- ação irreversível baseada na confirmação externa.

Para progresso, avaliações e eventos comuns, confirmação assíncrona e reconciliação são suficientes.

## Fluxo de entrada do HubSpot

```text
webhook HubSpot
→ validação de assinatura e replay
→ registro do receipt
→ resolução de contato/empresa
→ atualização do snapshot autorizado
→ evento de integração
→ reconciliação quando necessário
```

Dados do HubSpot que podem influenciar o LMS incluem identidade, empresa, segmento, status de crédito autorizado e preferências de relacionamento.

## Matriz de projeção

Cada projeção deve declarar:

```text
source_entity_or_event
business_purpose
hubspot_object
hubspot_property_or_association
transformation
sync_frequency
sensitivity
retention
reconciliation_rule
```

Não é necessário criar um objeto HubSpot para cada entidade interna do LMS.

## Configuração do produto

Formulários, jornadas, conteúdos, avaliações, arquétipos e regras são versionados na plataforma.

O HubSpot recebe:

- identificador da definição e versão publicada;
- resultado vigente e histórico necessário para operação;
- agregados e referências úteis para segmentação e relacionamento.

A edição completa dessas estruturas não depende de modelagem editorial dentro do CRM.

## Indisponibilidade

Quando o HubSpot estiver indisponível:

- ações do LMS continuam sendo persistidas;
- projeções permanecem pendentes na outbox;
- retries usam backoff e idempotência;
- erros permanentes são enviados para reconciliação;
- apenas funcionalidades que exigem estado CRM atual ficam degradadas.

## Requisitos do adapter real

- autenticação e scopes mínimos;
- mapeamento de contato e empresa;
- batch quando vantajoso;
- idempotência;
- tratamento de `429` e `5xx`;
- webhooks quando disponíveis;
- observabilidade sem payload sensível;
- reconciliação periódica;
- testes no sandbox.

## Dados que não devem ser projetados por padrão

- cada clique ou visualização bruta;
- logs técnicos;
- tokens e segredos;
- arquivos binários;
- payloads completos sem finalidade operacional;
- dados temporários de retry além do necessário.

## Critério de conclusão

```text
hubspot_inventory_complete = true
projection_matrix_approved = true
real_adapter_implemented = true
identity_mapping_tested = true
idempotency_and_retry_tested = true
reconciliation_tested = true
critical_readback_tested = true
lms_outage_independence_tested = true
```