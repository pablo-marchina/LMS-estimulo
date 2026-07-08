# ERD lógico — Plataforma Estímulo

**Versão:** 0.1  
**Status:** visão resumida; o dicionário contém as 121 tabelas.

## 1. Identidade e participação

```mermaid
erDiagram
  USER_ACCOUNTS ||--o| ENTREPRENEURS : authenticates
  ORGANIZATIONS ||--o{ ORGANIZATION_MEMBERSHIPS : has
  USER_ACCOUNTS ||--o{ ORGANIZATION_MEMBERSHIPS : belongs
  ENTREPRENEURS ||--o{ BUSINESS_MEMBERSHIPS : relates
  BUSINESSES ||--o{ BUSINESS_MEMBERSHIPS : has
  ENTREPRENEURS ||--o{ ENROLLMENTS : receives
  BUSINESSES ||--o{ ENROLLMENTS : contextualizes
  JOURNEY_VERSIONS ||--o{ ENROLLMENTS : fixes_version
  ENROLLMENTS ||--|| JOURNEY_INSTANCES : executes
```

## 2. Catálogo e orquestração

```mermaid
erDiagram
  PROGRAMS ||--o{ JOURNEY_DEFINITIONS : groups
  JOURNEY_DEFINITIONS ||--o{ JOURNEY_VERSIONS : versions
  JOURNEY_VERSIONS ||--o{ PATH_TEMPLATES : offers
  PATH_TEMPLATES ||--o{ PATH_STEPS : contains
  PATH_STEPS ||--o{ PATH_TRANSITIONS : origin
  PATH_STEPS ||--o{ PATH_TRANSITIONS : destination
  ACTIVITY_DEFINITIONS ||--o{ ACTIVITY_VERSIONS : versions
  ACTIVITY_VERSIONS ||--o{ PATH_STEPS : executes
  COURSE_DEFINITIONS ||--o{ COURSE_VERSIONS : versions
  COURSE_VERSIONS ||--o{ MODULES : contains
  MODULES ||--o{ MODULE_ACTIVITIES : orders
  ACTIVITY_VERSIONS ||--o{ MODULE_ACTIVITIES : reuses
```

## 3. Execução da jornada

```mermaid
erDiagram
  JOURNEY_INSTANCES ||--o{ PATH_ASSIGNMENTS : receives
  PATH_TEMPLATES ||--o{ PATH_ASSIGNMENTS : instantiates
  PATH_ASSIGNMENTS ||--o{ STEP_INSTANCES : materializes
  PATH_STEPS ||--o{ STEP_INSTANCES : defines
  STEP_INSTANCES ||--o{ ACTIVITY_SESSIONS : observes
  STEP_INSTANCES ||--o{ ATTEMPTS : evaluates
  STEP_INSTANCES ||--o{ SUBMISSIONS : practices
  JOURNEY_INSTANCES ||--|| PROGRESS_PROJECTIONS : summarizes
```

## 4. Diagnóstico e personalização

```mermaid
erDiagram
  DIAGNOSTIC_DEFINITIONS ||--o{ DIAGNOSTIC_VERSIONS : versions
  DIAGNOSTIC_VERSIONS ||--o{ DIMENSIONS : defines
  DIAGNOSTIC_VERSIONS ||--o{ ITEMS : contains
  ITEMS ||--o{ ITEM_OPTIONS : offers
  DIAGNOSTIC_VERSIONS ||--o{ SESSIONS : executes
  SESSIONS ||--o{ RESPONSES : records
  SESSIONS ||--o{ RESULTS : calculates
  RESULTS ||--o{ DIMENSION_RESULTS : decomposes
  SEGMENT_DEFINITIONS ||--o{ SEGMENT_VERSIONS : versions
  SEGMENT_VERSIONS ||--o{ SEGMENT_ASSIGNMENTS : assigns
  ENTREPRENEURS ||--o{ SEGMENT_ASSIGNMENTS : receives
```

## 5. Eventos e integrações

```mermaid
erDiagram
  EVENT_SCHEMAS ||--o{ EVENTS : validates
  EVENTS ||--o{ OUTBOX : routes
  CONSUMER_DEFINITIONS ||--o{ CONSUMER_INBOX : consumes
  EVENTS ||--o{ CONSUMER_INBOX : deduplicates
  OUTBOX ||--o{ DELIVERY_ATTEMPTS : attempts
  EVENTS ||--o{ SYNC_JOBS : triggers
  CONNECTIONS ||--o{ SYNC_JOBS : executes
  SYNC_JOBS ||--o{ SYNC_ATTEMPTS : retries
  CONNECTIONS ||--o{ EXTERNAL_OBJECT_MAPPINGS : maps
  CONNECTIONS ||--o{ WEBHOOK_RECEIPTS : receives
```

## 6. Inteligência comportamental

```mermaid
erDiagram
  FEATURE_DEFINITIONS ||--o{ FEATURE_VERSIONS : versions
  FEATURE_VERSIONS ||--o{ FEATURE_DEPENDENCIES : depends
  FEATURE_VERSIONS ||--o{ FEATURE_COMPUTATION_RUNS : computes
  FEATURE_COMPUTATION_RUNS ||--o{ FEATURE_VALUES : produces
  SCORE_DEFINITIONS ||--o{ SCORE_VERSIONS : versions
  SCORE_VERSIONS ||--o{ SCORE_RUNS : executes
  SCORE_RUNS ||--o{ SCORE_RESULTS : produces
  SCORE_RESULTS ||--o{ SCORE_CONTRIBUTIONS : explains
  FEATURE_VERSIONS ||--o{ SCORE_CONTRIBUTIONS : contributes
```

## 7. Regra de leitura

Diagramas resumidos omitem relações auxiliares, auditoria e FKs de eventos para preservar legibilidade. A fonte completa é `database-model-v0.1.yaml`.
