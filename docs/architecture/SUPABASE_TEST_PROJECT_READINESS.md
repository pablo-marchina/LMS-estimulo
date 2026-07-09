# Supabase test project readiness

**Version:** 0.1  
**Date:** 2026-07-08  
**Status:** Project URL registered; authenticated and database checks pending

## Registered project

- Project URL: `https://cfpfeavjlgheqqiaqtzv.supabase.co`
- Project reference: `cfpfeavjlgheqqiaqtzv`
- Intended use: shared integration and QA environment only
- Production use: prohibited; staging and production remain on AWS

## What has been verified

- The URL follows the hosted Supabase project URL format.
- A request to the project root returned HTTP 404. The root path is not an application health contract, so this result neither validates nor invalidates Auth, REST, Storage, Realtime, or Postgres.
- No authenticated API request was executed.
- No database connection or migration was executed.

## Required checks

### API gateway and Auth

Requires a Supabase publishable key or legacy anon key:

- Auth health endpoint;
- REST gateway response;
- anonymous session behavior, if enabled;
- sign-up/sign-in configuration;
- JWT issuer, audience and expiry behavior;
- RLS denial for unauthenticated requests;
- RLS positive and negative tests for authenticated test users.

### Database

Requires a secure database connection available only in the execution environment:

- PostgreSQL version;
- enabled extensions;
- create-schema privileges for the migration role;
- transaction-based DDL smoke test;
- full migration from empty database;
- rerun/idempotency behavior;
- rollback strategy;
- constraints and foreign keys;
- RLS policies and session adapter;
- generated TypeScript types.

### Storage

Requires a publishable key and configured test buckets:

- signed upload flow;
- MIME/size enforcement;
- private-by-default behavior;
- signed download flow;
- RLS/object policy tests;
- cleanup and retention behavior.

## Secret handling

- Publishable/anon keys may be used by browser clients when RLS is correct, but must still be environment-configured and never hardcoded.
- The service-role/secret key must not be sent in chat, committed, exposed to the browser, or used for routine client tests.
- Database passwords and connection strings must not be sent in chat or committed.
- Database validation should run through a protected CI secret, local environment variable, or approved secret manager.

## Exit criteria

This intake is complete only when:

1. API smoke tests pass with a publishable key;
2. negative RLS tests prove denied access;
3. the baseline DDL parses and rolls back in a transaction;
4. migrations apply from zero in an isolated schema/database;
5. the same application contracts remain portable to AWS staging.
