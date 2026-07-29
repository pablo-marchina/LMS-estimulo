# Baseline de staging na AWS

**Revisado em:** 2026-07-29  
**Status:** Terraform versionado; nenhum recurso aplicado

## Escopo declarado

`infra/aws/terraform` define um baseline parametrizado:

```text
Internet
  ↓ HTTPS
Application Load Balancer
  ↓
ECS/Fargate — aplicação Next.js

VPC
  ├── subnets públicas: ALB e NAT
  ├── subnets privadas: ECS
  └── subnets isoladas: RDS PostgreSQL

S3 privado
KMS para RDS, S3 e CloudWatch
CloudWatch + alarmes
SNS
ECR imutável
```

O baseline não contém CloudFront, WAF, Cognito, SQS, SES, RDS Proxy, blue/green ou OpenTelemetry.

## Guardas

- `confirm_deployment=false` por padrão;
- conta AWS deve coincidir com o ID esperado;
- região precisa oferecer ao menos duas zonas;
- imagem `latest` é proibida;
- deployment usa imagem por digest;
- secrets são referenciados por ARN;
- domínio e Route 53 são configurados juntos;
- task executa como não-root e com root filesystem read-only.

## Aplicação empacotada

O Dockerfile:

- usa Node.js 22.16.0;
- instala com `npm ci --ignore-scripts`;
- produz Next.js standalone;
- exige URLs públicas HTTPS no build;
- executa como UID/GID 1001;
- expõe liveness em `/api/health/live`.

A readiness em `/api/health/ready` verifica configuração, chaves de CPF e o contrato de readiness do banco Supabase atual. Ela precisará ser adaptada quando o runtime usar RDS.

## Estado real

O Next.js ainda depende de Supabase Auth, Storage e RPC. Portanto:

- RDS não é o banco ativo da aplicação;
- S3 não é o storage ativo;
- o provedor de identidade AWS não foi escolhido;
- nenhuma imagem foi publicada no ECR;
- nenhum `terraform plan` ou `apply` aprovado foi apresentado;
- backup, restore, rollback e alarmes não foram exercitados.

## Caminho para staging

1. aprovar conta, região, rede, domínio e certificado;
2. decidir os adapters de identidade, banco e storage;
3. construir e escanear a imagem;
4. publicar por digest no ECR;
5. aplicar migrations em RDS limpo;
6. implantar ECS/ALB;
7. validar S3 privado;
8. configurar secrets e alarmes;
9. executar E2E real;
10. exercitar backup, restore e rollback.

Produção exige stack separada, disponibilidade, capacidade, SLO, segurança e custos aprovados. O baseline atual não deve ser descrito como produção pronta.
