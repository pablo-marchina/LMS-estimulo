# AWS Lambda web runtime preparation

This directory documents the container-image path for running the Next.js standalone server on AWS Lambda. It is migration preparation, not evidence of a production deployment.

## Image

`Dockerfile.lambda` uses the AWS Lambda Web Adapter to translate Lambda HTTP events into requests for the existing Next.js server. The application remains a normal HTTP server on port `3000` and does not include a Lambda-specific application handler.

The image:

- builds the same Next.js standalone output as the ECS image;
- uses the Lambda Web Adapter extension;
- runs with `APP_ENV=production`;
- uses `/api/health/live` for adapter startup readiness;
- redirects Next.js runtime cache writes to `/tmp` because the Lambda filesystem is read-only outside `/tmp`;
- keeps secrets out of image layers;
- does not add a synthetic authentication, database, storage or RPC path.

## Build

Build one architecture at a time. The Lambda function architecture must match the image architecture.

```bash
docker build \
  --platform linux/amd64 \
  --file Dockerfile.lambda \
  --build-arg NEXT_PUBLIC_APP_URL=https://staging.example.org \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://replace.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=replace-with-public-key \
  --tag lms-estimulo-lambda:<commit> .
```

Push the immutable image to an ECR repository in the same AWS Region as the Lambda function. Deploy by digest, not by a mutable tag.

## Required runtime configuration

Public configuration must match the values frozen into the image at build time:

```text
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Server-only configuration must be injected by the Lambda function configuration or a secret-management integration:

```text
SUPABASE_SERVICE_ROLE_KEY
CPF_ENCRYPTION_KEY
CPF_LOOKUP_HMAC_KEY
```

Additional integration and bucket variables remain required when the corresponding feature is enabled. Secret values must not enter Terraform state, image metadata, logs or build arguments.

## HTTP front door

The Lambda Web Adapter supports API Gateway, Lambda Function URLs and ALB integrations. The production front door is not selected by this preparation. The final choice must include:

- approved custom domain and TLS certificate;
- request throttling and abuse controls;
- WAF or an equivalent edge policy where supported;
- maximum request and response sizes;
- cookie, redirect and forwarded-header behavior;
- access logging without sensitive payloads;
- rollback between immutable Lambda versions and aliases.

## Blocking application changes

The existing upload endpoints parse multipart files inside Next.js and currently accept files up to 4, 6, 8 or 10 MiB depending on the feature. Lambda synchronous invocation payloads are limited, and multipart encoding adds overhead. Before Lambda production, uploads must become a direct-to-storage flow:

```text
browser requests authorized upload intent
→ server returns short-lived pre-signed destination
→ browser uploads directly to private storage
→ server confirms size, type, checksum and object version
→ asynchronous validation/reconciliation completes the state transition
```

The Next.js function must not proxy participant or administrative file bodies in production.

## Statelessness and cache

`/tmp` is execution-environment-local and disposable. The symlink in `Dockerfile.lambda` only prevents writes to the read-only image. It does not provide a shared Next.js cache across concurrent Lambda environments.

Before release, verify that no correctness requirement depends on local ISR, local incremental cache, in-memory locks, local files or process-lifetime background work. Shared state, locks, queues and caches must use approved external services.

## Background work

A request-serving Lambda must not be used as a permanent outbox or HubSpot worker. Production requires separate event-driven workers with bounded concurrency, idempotency, retries, dead-letter handling and reconciliation. The current HubSpot worker and sandbox proof remain blockers.

## Required infrastructure before production

- Lambda function deployed from an immutable ECR digest;
- version and alias based promotion/rollback;
- reserved concurrency selected from load tests;
- provisioned concurrency only if latency objectives require it;
- CloudWatch logs, metrics, alarms and tracing policy;
- alarms for errors, throttles, duration, concurrency and cold-start impact;
- API/front-door access logs and rate limits;
- Secrets Manager or approved equivalent with rotation procedures;
- deployment role with least privilege;
- VPC design only when private AWS resources require it;
- RDS Proxy before direct high-concurrency Lambda-to-RDS access;
- direct S3 upload adapter before replacing Supabase Storage;
- load, soak, failure, restore and rollback tests;
- real authenticated end-to-end verification.

## Current disposition

```text
lambda_container_image = prepared
lambda_infrastructure = not_implemented
lambda_load_test = not_executed
direct_upload_flow = not_implemented
shared_next_cache = not_implemented
rds_adapter = not_active
rds_proxy = not_declared
s3_adapter = not_active
hubspot_worker = not_implemented
production_release = blocked
```
