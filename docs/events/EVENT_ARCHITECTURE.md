# Arquitetura canônica de eventos comportamentais

**Versão:** 0.1  
**Data:** 2026-07-08  
**Status:** Baseline de arquitetura para produção — E08

## 1. Objetivo

Definir como a plataforma SaaS/LMS multi-jornada da Estímulo produzirá, validará, persistirá e distribuirá fatos de domínio e evidências comportamentais de forma reproduzível. A Jornada OpenAI é o primeiro caso real, mas nenhum evento central pode depender do nome, do slug ou da estrutura dessa jornada.

## 2. Decisão arquitetural central

A plataforma usará uma **arquitetura orientada à captura de eventos**, mas **não adotará event sourcing integral** na primeira release.

- tabelas operacionais mantêm o estado atual e aplicam invariantes;
- eventos canônicos preservam fatos relevantes e sua origem;
- projeções são reconstruíveis quando seus eventos de origem estiverem disponíveis;
- o event log não substitui automaticamente todas as tabelas de domínio;
- alterações operacionais e seu evento correspondente devem ser confirmados atomicamente;
- eventos derivados nunca substituem os fatos brutos usados para produzi-los.

## 3. Classes de informação

### 3.1 Comando

Pedido para executar uma ação, que pode ser recusado. Exemplos: `completeActivity`, `submitAssessment`, `publishJourneyVersion`.

Um comando **não é um evento**. O evento só existe depois que a regra foi validada e o fato ocorreu.

### 3.2 Evento de domínio

Fato durável produzido pelo backend após uma transação válida, como `learning.activity.completed` ou `credential.certificate.issued`.

### 3.3 Evento comportamental

Evidência de uma interação do participante. Pode ser transacional, reconhecida pelo servidor, observada no cliente, confirmada externamente ou autorrelatada. O tipo de evidência deve ser explícito.

### 3.4 Evento comportamental de domínio (`behavioral_domain`)

Fato transacional que altera o estado do produto e, simultaneamente, constitui evidência comportamental, como iniciar uma jornada, concluir uma atividade ou reenviar uma prática. Continua sujeito às invariantes do domínio.

### 3.5 Evento de integração

Fato sobre comunicação com outro sistema: webhook recebido, sincronização solicitada, conflito detectado ou entrega confirmada.

### 3.6 Evento de auditoria

Fato privilegiado ou de segurança que exige acesso e retenção próprios, como suspensão de conta, invalidação de tentativa ou alteração de permissão.

### 3.7 Telemetria

Logs, métricas e traces operacionais não pertencem ao catálogo de fatos comportamentais. Uma exceção só pode ser promovida a evento canônico quando houver significado de negócio e contrato explícito.

## 4. Responsabilidade de produção

```text
Navegador envia comando ou observação
        ↓
Backend autentica, autoriza e valida
        ↓
Regra de negócio é executada
        ↓
Estado operacional + evento/outbox são confirmados atomicamente
        ↓
Dispatcher valida schema e entrega aos consumidores
        ↓
Projeções, intervenções, integrações e pesquisa processam idempotentemente
```

Regras:

- o navegador nunca declara como fato que uma jornada, avaliação ou atividade foi concluída;
- o cliente pode informar observações, como progresso de mídia, sempre com `clienteventid`;
- o backend decide se a observação é aceita, consolidada ou descartada;
- webhooks externos são verificados antes de virar eventos canônicos;
- eventos do crédito só serão implementados depois da definição da fonte oficial, IDs e estados.

## 5. Padrões externos adotados como referência

- Envelope compatível com CloudEvents 1.0, atualmente publicado em sua release 1.0.2.
- Schemas de payload em JSON Schema Draft 2020-12.
- Contexto distribuído compatível com W3C Trace Context v1; Level 2 permanece em trilha de recomendação e não será requisito.
- Semântica educacional inspirada no xAPI 2.0, sem obrigar a adoção de um LRS ou reproduzir integralmente o modelo Actor–Verb–Object.

O padrão interno é deliberadamente mais orientado aos domínios da Estímulo, preservando um mapeamento futuro para xAPI quando houver benefício de interoperabilidade.

## 6. Componentes lógicos

```text
Command/API layer
  ├── Domain transaction
  ├── Canonical event writer
  └── Transactional outbox

Event dispatcher
  ├── Schema validation
  ├── Retry/backoff
  ├── Dead-letter handling
  └── Delivery observability

Canonical event store
  ├── Raw immutable event
  ├── Processing metadata
  └── Privacy/redaction controls

Consumers
  ├── Operational projections
  ├── Journey orchestration
  ├── Intervention engine
  ├── Gamification/credentials
  ├── HubSpot connector
  ├── Feature pipeline
  └── Research/analytics
```

Os componentes são lógicos. E10 e E12 decidirão tabelas, tecnologias e implantação física.

## 7. Garantias e limites

### Garantias obrigatórias

- persistência durável antes de confirmar sucesso ao comando;
- entrega **pelo menos uma vez** aos consumidores;
- idempotência em todos os consumidores;
- ordenação por agregado quando necessária;
- validação por schema antes da distribuição;
- rastreabilidade entre comando, evento e efeitos posteriores;
- observabilidade de atraso, falha e dead letter;
- separação entre dados pessoais e referências pseudônimas.

### Garantias que não serão prometidas

- exatamente uma entrega na infraestrutura;
- ordenação global entre todos os eventos;
- relógios de cliente confiáveis;
- inferência comportamental a partir de um único evento;
- retenção indefinida;
- consistência síncrona com HubSpot.

## 8. Fatos brutos e derivados

Eventos elegíveis como evidência bruta incluem início, retomada, conclusão validada, submissão, reenvio, pedido de ajuda e aplicação verificada.

Eventos derivados incluem pontos, selos, certificado, score e marco. Eles preservam auditabilidade, mas não devem substituir seus eventos de origem como inputs de features.

## 9. Resultado do E08

O E08 define contrato, taxonomia e governança. O E09 desenhará o caminho ponta a ponta de cada família, incluindo tabelas, filas lógicas, retries, DLQ, HubSpot e estados intermediários.

## 10. Referências técnicas verificadas

- [CloudEvents Specification](https://github.com/cloudevents/spec) — core 1.0.2.
- [xAPI Specification](https://github.com/adlnet/xAPI-Spec) — o repositório oficial indica xAPI 2.0 como versão atual.
- [JSON Schema Specification](https://json-schema.org/specification) — Draft 2020-12.
- [W3C Trace Context](https://www.w3.org/TR/trace-context/) — Recommendation v1.
- [RFC 9562 — UUIDs](https://datatracker.ietf.org/doc/html/rfc9562).
- [Debezium Outbox Event Router](https://debezium.io/documentation/reference/stable/transformations/outbox-event-router.html) — referência do padrão outbox; a adoção de Debezium não está decidida.
