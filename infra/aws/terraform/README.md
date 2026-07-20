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

## Deliberate deployment block

`confirm_deployment` defaults to `false`. Planning or applying deployable resources is rejected unless all of the following are explicit:

- approved AWS account and region;
- immutable image digest;
- ACM certificate;
- required Secrets Manager ARNs;
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

1. identity decision and adapter (for example Cognito or an approved retained provider);
2. direct PostgreSQL/RDS data access replacing Supabase RPC coupling where required;
3. S3 quarantine/release adapter;
4. SQS file-scan worker adapter;
5. database migration/bootstrap and restore rehearsal;
6. actual account, network, certificate, domain and secret configuration;
7. end-to-end staging evidence and rollback exercise.

Until those gates pass, this stack is deployment scaffolding only and must not be described as production-ready.
