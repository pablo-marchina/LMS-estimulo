# ERD lógico — Plataforma Estímulo

**Revisado em:** 2026-09-01  
**Status:** visão conceitual vigente; migrations são a fonte física

## Identidade e participação

```mermaid
erDiagram
  USER_ACCOUNTS ||--o| ENTREPRENEURS : resolves
  ORGANIZATIONS ||--o{ ORGANIZATION_MEMBERSHIPS : has
  USER_ACCOUNTS ||--o{ ORGANIZATION_MEMBERSHIPS : belongs
  ENTREPRENEURS ||--o{ BUSINESS_MEMBERSHIPS : relates
  BUSINESSES ||--o{ BUSINESS_MEMBERSHIPS : has
  ENTREPRENEURS ||--o{ ENROLLMENTS : receives
  JOURNEYS ||--o{ ENROLLMENTS : enrolls
  ENROLLMENTS ||--|| JOURNEY_INSTANCES : executes
```

`JOURNEYS` representa conceitualmente a linha operacional atualmente armazenada em `catalog.journey_versions`, ligada 1:1 à definição. O nome físico legado não implica snapshots editoriais.

## Jornada e aprendizagem

```mermaid
erDiagram
  PROGRAMS ||--o{ JOURNEYS : groups
  JOURNEYS ||--o{ PATH_TEMPLATES : offers
  PATH_TEMPLATES ||--o{ PATH_STEPS : contains
  ACTIVITY_VERSIONS ||--o{ PATH_STEPS : executes
  JOURNEY_INSTANCES ||--o{ PATH_ASSIGNMENTS : receives
  PATH_ASSIGNMENTS ||--o{ STEP_INSTANCES : materializes
  STEP_INSTANCES ||--o{ ASSESSMENT_ATTEMPTS : evaluates
  STEP_INSTANCES ||--o{ SUBMISSIONS : practices
```

## Diagnóstico

```mermaid
erDiagram
  DIAGNOSTIC_DEFINITIONS ||--o{ DIAGNOSTIC_VERSIONS : versions
  DIAGNOSTIC_VERSIONS ||--o{ DIAGNOSTIC_DIMENSIONS : defines
  DIAGNOSTIC_VERSIONS ||--o{ DIAGNOSTIC_ITEMS : contains
  DIAGNOSTIC_ITEMS ||--o{ DIAGNOSTIC_OPTIONS : offers
  DIAGNOSTIC_VERSIONS ||--o{ DIAGNOSTIC_SESSIONS : executes
  DIAGNOSTIC_SESSIONS ||--o{ DIAGNOSTIC_RESPONSES : records
  DIAGNOSTIC_SESSIONS ||--o{ DIAGNOSTIC_RESULTS : calculates
  DIAGNOSTIC_RESULTS ||--o{ ARCHETYPE_ASSIGNMENTS : assigns
```

## Engajamento e integração

```mermaid
erDiagram
  POINT_LEDGER ||--o{ RANKING_PROJECTION : projects
  BADGE_DEFINITIONS ||--o{ BADGE_AWARDS : awards
  EVENTS ||--o{ OUTBOX : routes
  OUTBOX ||--o{ DELIVERY_ATTEMPTS : attempts
```

Diagramas omitem relações auxiliares para legibilidade. Para nomes/colunas/FKs exatos, consulte `supabase/migrations/` e o catálogo reconstruído nos database gates.