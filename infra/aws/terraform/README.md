# Terraform ECS anterior — não aplicar

**Estado:** scaffolding bloqueado e substituído como arquitetura-alvo pela DEC-075

Este diretório declara uma stack de staging baseada em ALB e ECS/Fargate. Ele foi criado antes da decisão de operar a aplicação web em AWS Lambda e **não representa mais o caminho oficial de deploy**.

## Regra operacional

Não executar `terraform plan` ou `terraform apply` para esta stack até uma decisão explícita após o inventário da AWS corporativa.

Motivos:

- pode duplicar VPC, subnets, NAT, ALB, ECR, RDS, S3, KMS, logs e alarmes já existentes;
- usa ECS/Fargate, enquanto o compute canônico é Lambda;
- declara RDS single-AZ e um único NAT Gateway;
- não contém Cognito/broker OIDC, RDS Proxy, SQS, DLQ, API Gateway HTTP API ou os adapters AWS da aplicação;
- ainda recebe configuração Supabase e não comprova produção integral na AWS.

## Conteúdo preservado

O código pode ser reutilizado seletivamente após o inventário corporativo para:

- convenções de tags e deployment guard;
- ECR imutável;
- RDS, S3, KMS e alarmes, caso não existam equivalentes corporativos;
- políticas de imagem por digest e secrets por referência.

Reaproveitamento exige extrair recursos compatíveis para a stack Lambda, e não aplicar esta stack integralmente.

## Arquitetura vigente

A decisão oficial está em:

- [`docs/decisions/AWS_PRODUCTION_ARCHITECTURE.md`](../../../docs/decisions/AWS_PRODUCTION_ARCHITECTURE.md);
- [`docs/architecture/AWS_TARGET_ARCHITECTURE.md`](../../../docs/architecture/AWS_TARGET_ARCHITECTURE.md);
- [`infra/aws/PLATFORM_INTEGRATION_REQUIREMENTS.md`](../PLATFORM_INTEGRATION_REQUIREMENTS.md).

O caminho canônico é:

```text
CloudFront/edge + WAF
→ API Gateway HTTP API
→ Lambda container
→ Cognito/OIDC
→ RDS Proxy + RDS PostgreSQL
→ S3 direto
→ SQS + Lambdas consumidoras
```

## Disposição futura

Após o inventário AWS, esta pasta deverá receber uma das decisões:

1. exclusão integral;
2. extração de módulos reutilizáveis para a stack Lambda;
3. movimentação para histórico fora da árvore ativa.

Enquanto isso:

```text
ecs_terraform_target = false
terraform_apply_allowed = false
corporate_inventory_required = true
```
