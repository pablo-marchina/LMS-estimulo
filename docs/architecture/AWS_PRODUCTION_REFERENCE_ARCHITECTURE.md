# Arquitetura de referência para produção na AWS

**Versão:** 0.1  
**Status:** Baseline proposto; dimensionamento e IaC serão fechados no E12

## 1. Objetivo

Hospedar a plataforma multi-jornada em uma arquitetura gerenciada, segura, observável e compatível com o modelo já definido.

## 2. Baseline proposto

```text
Internet
  ↓
Route 53 + ACM
  ↓
CloudFront + AWS WAF
  ↓
Application Load Balancer
  ↓
ECS/Fargate web-api service ──────────────┐
  │                                       │
  ├── Amazon RDS for PostgreSQL           │
  ├── Amazon S3                           │
  ├── Amazon Cognito                      │
  ├── Amazon SQS + DLQ                    │
  ├── AWS Secrets Manager / SSM           │
  └── HubSpot / OpenAI / SES              │
                                          │
ECS/Fargate worker services ◀── SQS ──────┘

OpenTelemetry/ADOT
  ↓
CloudWatch Logs, Metrics, Alarms + X-Ray
```

## 3. Serviços propostos

### Compute

- imagens no Amazon ECR;
- serviço `web-api` em Amazon ECS com AWS Fargate;
- workers separados por responsabilidade quando necessário;
- tarefas agendadas por EventBridge Scheduler;
- Auto Scaling orientado por CPU, memória, latência e profundidade de fila;
- containers sem estado local persistente.

### Banco

- Amazon RDS for PostgreSQL;
- subnets privadas;
- criptografia KMS;
- TLS obrigatório;
- automated backups e point-in-time recovery;
- Multi-AZ na produção conforme SLO;
- acesso somente por security groups autorizados;
- pooling controlado; RDS Proxy será avaliado por carga e custo.

### Identidade

- Amazon Cognito User Pools;
- OIDC/OAuth 2.0;
- MFA obrigatório para perfis administrativos;
- mapeamento de `sub` externo para identidade interna;
- autorização de domínio e RLS independentes do Cognito.

### Arquivos

- buckets S3 privados separados por ambiente e classe;
- URLs assinadas curtas;
- versionamento e lifecycle;
- criptografia KMS quando aplicável;
- bloqueio de acesso público;
- scan antes da promoção do arquivo;
- CloudFront somente para conteúdo que possa ser distribuído com segurança.

### Assíncrono

- SQS Standard para comandos/jobs tolerantes a entrega pelo menos uma vez;
- DLQ por fila;
- outbox PostgreSQL como origem confiável;
- inbox/idempotência nos consumidores;
- EventBridge somente quando roteamento ou agendamento trouxer benefício claro.

### Secrets e configuração

- AWS Secrets Manager para credenciais rotacionáveis;
- SSM Parameter Store para configuração não secreta;
- task roles IAM com menor privilégio;
- nenhuma credencial estática em imagem ou repositório.

### Observabilidade

- instrumentação OpenTelemetry no código;
- AWS Distro for OpenTelemetry quando adotado;
- CloudWatch Logs/Metrics/Alarms;
- X-Ray para traces distribuídos;
- correlation IDs alinhados ao envelope de eventos;
- alarmes de disponibilidade, erro, latência, backlog, DLQ, banco e integração.

### Edge e segurança

- Route 53;
- certificados ACM;
- CloudFront;
- AWS WAF;
- ALB;
- VPC com serviços internos em subnets privadas;
- NAT/endpoints privados avaliados por custo e segurança;
- CloudTrail e AWS Config/Security Hub a avaliar no baseline de segurança.

## 4. Topologia por ambiente

### Staging

- mesma arquitetura lógica;
- tamanhos menores;
- integrações em sandbox;
- Single-AZ permitido para componentes não críticos, desde que a diferença seja registrada;
- banco restaurável a partir de dados sintéticos/anonimizados.

### Produção

- Multi-AZ para banco conforme SLO;
- mínimo de tarefas definido para evitar ponto único de falha;
- backups, alarmes e runbooks ativos;
- rollout blue/green ou rolling com rollback automatizado;
- acesso administrativo restrito e auditado.

## 5. Decisões ainda do E12

- RDS PostgreSQL tradicional versus Aurora PostgreSQL;
- ECS/Fargate versus alternativa AWS equivalente;
- CDK versus Terraform;
- estratégia de deploy do Next.js;
- número e separação inicial dos workers;
- RDS Proxy/PgBouncer;
- serviços de scan de arquivos;
- solução exata de analytics/BI;
- retenção e replicação de backups;
- região AWS final.

## 6. Requisitos de validação

A arquitetura só será aprovada após provas técnicas de:

- build e execução do container;
- migrations no RDS;
- Cognito e contexto interno de RLS;
- uploads S3;
- outbox → SQS → worker;
- retries e DLQ;
- tracing OpenTelemetry;
- deploy e rollback;
- backup e restauração;
- conectividade com HubSpot e OpenAI via secrets e egress controlado.
