# Índices, volume e particionamento

**Versão:** 0.1

## 1. Princípio

Índices serão derivados de consultas e SLOs reais. O DDL preliminar inclui índices obrigatórios para FKs e caminhos críticos, mas o plano final será validado com `EXPLAIN (ANALYZE, BUFFERS)` em dados representativos.

## 2. Índices prioritários

### Execução

- inscrições por empreendedor/status;
- instâncias por status/atualização;
- passos por atribuição/status;
- tentativas e submissões por participante/data.

### Eventos

- `received_at`;
- `event_name + received_at`;
- sujeito + data;
- jornada + data;
- correlação e causalidade;
- agregado + versão;
- outbox por status/disponibilidade.

### Integrações

- external mapping por entidade interna;
- jobs por status/agendamento;
- conflitos por status;
- webhooks por status/data.

### Inteligência

- feature values por sujeito/data;
- feature values por jornada/data;
- scores por sujeito/data.

## 3. JSONB

Não criar GIN indiscriminadamente. Um índice JSONB só será criado quando uma consulta recorrente e seletiva justificar. Configurações editoriais devem ser lidas por ID/versão, não filtradas por chaves arbitrárias em escala.

## 4. Event store

A primeira release pode operar `eventing.events` sem particionamento, preservando `event_id` como PK simples e reduzindo complexidade.

Avaliar particionamento temporal quando qualquer condição ocorrer:

- mais de 50 milhões de eventos;
- tabela/índices acima de aproximadamente 100 GB;
- retenção por janela exigir drops frequentes;
- vacuum ou reindex afetar SLOs;
- consultas temporais degradarem apesar de índices.

Antes disso, considerar:

- arquivamento frio;
- índices BRIN em `received_at` para grande volume sequencial;
- compressão/warehouse para analytics;
- read replica para pesquisas.

## 5. Tabelas candidatas a particionamento futuro

- `eventing.events`;
- `governance.audit_log`;
- `eventing.delivery_attempts`;
- `integration.sync_attempts`;
- `intelligence.feature_values`.

## 6. Projeções

Projeções pequenas usam update/upsert. Projeções de análise em escala devem migrar para warehouse/lakehouse sem alterar o banco operacional como fonte.
