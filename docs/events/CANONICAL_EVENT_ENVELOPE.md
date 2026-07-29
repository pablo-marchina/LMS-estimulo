# Envelope canônico de evento

**Versão do contrato:** 1.0.0  
**Compatibilidade:** CloudEvents 1.0  
**Status:** Obrigatório para todos os eventos canônicos

## 1. Exemplo

```json
{
  "specversion": "1.0",
  "id": "0190f2de-7f56-7f52-a4f0-d4a20d7d2e01",
  "source": "urn:estimulo:service:learning-delivery",
  "type": "org.estimulo.learning.activity.completed",
  "subject": "urn:estimulo:activity-instance:<uuid>",
  "time": "2026-07-08T14:30:00Z",
  "datacontenttype": "application/json",
  "dataschema": "https://schemas.estimulo.org/events/learning/activity-completed/1.0.0.json",
  "tenantid": "<organization-uuid>",
  "correlationid": "<correlation-uuid>",
  "causationid": "<event-or-command-uuid>",
  "traceparent": "00-...",
  "partitionkey": "journey-instance:<uuid>",
  "aggregateid": "<activity-instance-uuid>",
  "aggregateversion": 7,
  "privacyclass": "pseudonymous",
  "producer": "learning_delivery",
  "clienteventid": null,
  "correctionof": null,
  "data": {}
}
```

## 2. Campos base

| Campo | Regra |
|---|---|
| `specversion` | Sempre `1.0` enquanto o envelope CloudEvents adotado for v1. |
| `id` | UUID único, preferencialmente UUIDv7 por implementação aprovada; nunca usar sua ordenação como garantia de negócio. |
| `source` | URN estável do produtor lógico, não URL de uma instância temporária. |
| `type` | Nome canônico estável em passado, no namespace `org.estimulo`. |
| `subject` | URN do recurso principal; não conter nome, e-mail, CPF, CNPJ ou outro identificador direto. |
| `time` | Momento confiável da ocorrência. Para observação de cliente, é o momento de aceite no servidor; o horário do cliente fica em `data`. |
| `dataschema` | URI imutável da versão exata do payload. |
| `tenantid` | Organização operadora/escopo de isolamento, em UUID opaco. |
| `correlationid` | Une eventos de uma mesma operação ou jornada de processamento. |
| `causationid` | Evento ou comando que causou diretamente este evento; nulo quando for raiz. |
| `traceparent` | Contexto W3C de observabilidade; não substitui correlation/causation. |
| `partitionkey` | Chave usada para preservar ordem local na distribuição. |
| `aggregateid` | Instância de domínio cuja versão foi alterada. |
| `aggregateversion` | Número monotônico transacional por agregado. |
| `privacyclass` | `internal`, `pseudonymous` ou `restricted`. |
| `producer` | Nome lógico do módulo produtor. |
| `clienteventid` | UUID do cliente para deduplicar observações; proibido para fatos exclusivamente server-side. |
| `correctionof` | Referência a um evento com erro de representação, quando uma correção formal for necessária. |
| `data` | Payload validado pelo schema específico do tipo. |

## 3. Metadados de persistência

Os campos abaixo pertencem ao armazenamento/processamento e não precisam viajar em toda entrega:

- `recorded_at`: timestamp gerado pelo banco;
- `ingested_at`: entrada no dispatcher;
- `validated_at` e versão do validador;
- `delivery_attempts`;
- `last_processing_error` sanitizado;
- `redaction_status`;
- checksum do envelope e payload;
- origem da replay, quando aplicável.

## 4. Estrutura comum de `data`

Quando aplicável, os payloads devem reutilizar:

```json
{
  "actor": {
    "entrepreneur_id": "uuid",
    "business_id": "uuid-ou-null"
  },
  "context": {
    "program_id": "uuid",
    "journey_version_id": "uuid",
    "journey_instance_id": "uuid",
    "path_assignment_id": "uuid-ou-null",
    "activity_instance_id": "uuid-ou-null",
    "session_id": "uuid-ou-null"
  },
  "evidence": {
    "kind": "server_transactional",
    "verification_status": "verified"
  }
}
```

Nem todos os eventos precisam desses blocos. Os schemas específicos devem proibir campos sem finalidade.

## 5. Tempo

- `time` nunca é substituído pelo horário informado livremente pelo cliente;
- `client_time` é opcional e marcado como não confiável;
- eventos externos preservam `source_occurred_at` e o momento em que foram recebidos;
- cálculos temporais usam a regra documentada por feature;
- clock skew e eventos atrasados devem ser observáveis.

## 6. Identificadores

- IDs internos são opacos;
- IDs do HubSpot ou crédito ficam em mapas de identidade/integracão e só entram no payload quando indispensáveis;
- valores de `subject`, `partitionkey` e atributos CloudEvents podem aparecer em logs/roteadores, portanto não podem conter PII;
- arquivos e textos são referenciados por IDs, nunca incorporados ao evento.

## 7. Schema executável

O contrato executável está em [`schemas/event-envelope-v1.schema.json`](schemas/event-envelope-v1.schema.json). Exemplos canônicos devem permanecer incorporados aos schemas e testes versionados, evitando diretórios documentais sem inventário próprio.
