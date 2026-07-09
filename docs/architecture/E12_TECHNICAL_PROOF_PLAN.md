# E12 technical proof plan

**Version:** 0.1  
**Date:** 2026-07-08  
**Status:** In progress

## Objective

Validate that the selected application architecture can operate on Supabase for development/test and on AWS for staging/production without changing domain rules, event contracts, or the relational model.

## Proofs

| ID | Proof | Supabase test | AWS staging | Status |
|---|---|---|---|---|
| P01 | Project/API connectivity | required | n/a | ready; key pending |
| P02 | Auth provider adapter | Supabase Auth | Cognito | design ready |
| P03 | Internal identity mapping | `auth_subject` → `iam.user_accounts` | Cognito `sub` → same table | design ready |
| P04 | RLS session context | request transaction context | request transaction context | pending execution |
| P05 | Baseline migrations | hosted Postgres | RDS PostgreSQL | script ready; connection pending |
| P06 | Transactional state + event + outbox | PostgreSQL | RDS PostgreSQL | pending implementation |
| P07 | Queue adapter | test implementation | SQS + DLQ | pending implementation |
| P08 | Storage adapter | Supabase Storage | S3 | pending implementation |
| P09 | Worker idempotency | shared contract | ECS/Fargate worker | pending implementation |
| P10 | OpenTelemetry propagation | local/test exporter | CloudWatch/X-Ray backend | pending implementation |
| P11 | Multi-journey smoke test | OpenAI + synthetic journey | same | pending implementation |
| P12 | Migration/rollback promotion | Supabase test | AWS staging | pending execution |

## Proposed application structure

```text
apps/
  web/       Next.js user/admin application and HTTP API
  worker/    asynchronous consumers and scheduled reconciliation
packages/
  domain/          entities, value objects and invariants
  application/     use cases and ports
  contracts/       API/event schemas
  infrastructure/  PostgreSQL and provider adapters
  ui/              reusable presentation components
infra/
  aws/             infrastructure as code
supabase/
  migrations/
  seed.sql
```

## Stack direction to validate

- Web/API: Next.js + React + TypeScript, self-hosted as a container.
- Worker: Node.js/TypeScript process sharing application/domain packages.
- Database: PostgreSQL with SQL migrations as source of truth.
- Validation: Zod at application boundaries and JSON Schema for event contracts.
- Test auth: Supabase Auth adapter.
- Production auth: Cognito adapter.
- Test storage: Supabase Storage adapter.
- Production storage: S3 adapter.
- Test queue: database-backed or local adapter only for tests.
- Production queue: SQS with DLQ.
- Telemetry: OpenTelemetry-neutral instrumentation.

These are implementation hypotheses to be proved, not accepted solely because the initial repository uses Next.js and Supabase.

## Execution order

1. Run project endpoint smoke test.
2. Apply database preflight.
3. Execute DDL in transaction with rollback.
4. Convert the approved DDL into ordered migrations.
5. Implement identity-provider port and Supabase adapter.
6. Prove authenticated identity mapping and RLS.
7. Implement transactional outbox proof.
8. Implement queue/worker idempotency proof.
9. Implement storage-provider proof.
10. Run OpenAI and synthetic-journey smoke tests.
11. Repeat the same contracts in AWS staging.

## Blocking inputs

- Supabase publishable/anon key for API tests.
- Secure database connection for migration execution.
- Final AWS account/region/network constraints for AWS proof.
