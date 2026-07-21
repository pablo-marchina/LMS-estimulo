# AWS staging baseline

This directory is a **blocked, parameterized staging baseline**, not evidence that the LMS has migrated to AWS production.

## What it declares

- two-AZ VPC layout with public ALB subnets, private ECS subnets and isolated RDS subnets;
- HTTPS-only Application Load Balancer;
- non-root, read-only-root-filesystem ECS Fargate task;
- immutable ECR repository and digest-pinned deployment input;
- encrypted CloudWatch logs;
- KMS-encrypted, versioned, non-public quarantine and protected S3 buckets;
- encrypted SQS malware-scan queue and dead-letter queue;
- private encrypted PostgreSQL RDS with an AWS-managed master password;
- alarms for ALB 5xx, scan backlog age, DLQ messages and RDS free storage.

## Build the environment-specific image

Next.js freezes every `NEXT_PUBLIC_*` value into the browser bundle during `next build`. The image must therefore be built with the exact public configuration of the target environment:

```bash
docker build \
  --build-arg NEXT_PUBLIC_APP_URL=https://staging.example.org \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://replace.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=replace-with-public-key \
  --tag lms-estimulo-staging:<commit> .
```

The Dockerfile rejects missing values and non-HTTPS URLs. These values are public client configuration, not secrets. The same values are repeated in `public_environment` for server-side runtime access. A built image must not be promoted to another environment with different `NEXT_PUBLIC_*` values.

Only server-side credentials such as `SUPABASE_SERVICE_ROLE_KEY`, HubSpot tokens and scanner API keys belong in Secrets Manager.

## Deliberate deployment block

`confirm_deployment` defaults to `false`. Planning or applying deployable resources is rejected unless all of the following are explicit:

- approved AWS account and region;
- immutable image digest;
- ACM certificate;
- public environment matching the image build;
- required server-side Secrets Manager ARNs;
- optional domain and Route53 zone supplied together.

Never commit a populated `.tfvars` file. Secret **values** are not accepted; only ARNs are passed to the ECS task definition.

## Commands after approval

```bash
terraform init
terraform fmt -check -recursive
terraform validate
terraform plan -var-file=staging.auto.tfvars
```

`terraform apply` requires a separate operational approval. This repository does not run it automatically.

## Portability blockers

The current Next.js runtime still uses Supabase Auth, Storage and RPC APIs. The declared RDS, S3 and SQS resources are not yet selected by production adapters. Before AWS staging can prove the target architecture, the project still needs:

1. identity decision and adapter, such as Cognito or an approved retained provider;
2. direct PostgreSQL/RDS data access replacing Supabase RPC coupling where required;
3. S3 quarantine/release adapter;
4. SQS file-scan worker adapter;
5. database migration/bootstrap and restore rehearsal;
6. actual account, network, certificate, domain and secret configuration;
7. image build, ECR scan and public-config matching evidence;
8. end-to-end staging evidence and rollback exercise.

Until those gates pass, this stack is deployment scaffolding only and must not be described as production-ready.
