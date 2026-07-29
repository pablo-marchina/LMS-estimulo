# Arquitetura-alvo na AWS

**Revisado em:** 2026-07-29  
**Status:** ECS/Fargate versionado; imagem Lambda preparada; nenhum recurso aplicado

## Estado atual

O runtime ativo continua em Supabase development/test. A aplicação ainda depende de:

- Supabase Auth e cookies SSR;
- Supabase Storage;
- Edge Function `authenticated-rpc`;
- RPC/PostgREST para o PostgreSQL operacional.

RDS, S3 e identidade AWS não são adapters ativos. Nenhuma opção de compute constitui produção enquanto esses limites, os gates operacionais e a prova em staging estiverem abertos.

## Baseline ECS/Fargate existente

`infra/aws/terraform` declara:

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

O baseline não contém CloudFront, WAF, Cognito, SQS, SES, RDS Proxy, blue/green ou tracing distribuído. O RDS declarado não é Multi-AZ e a rede possui um único NAT Gateway, portanto esse baseline não é arquitetura final de alta disponibilidade.

## Preparação AWS Lambda

`Dockerfile.lambda` empacota o mesmo Next.js standalone com AWS Lambda Web Adapter. A imagem:

- executa o servidor HTTP existente na porta `3000`;
- usa `/api/health/live` para inicialização do adapter;
- direciona escrita de cache local para `/tmp`;
- mantém configuração pública congelada no build;
- não introduz backend, identidade, banco ou storage sintéticos.

O guia operacional está em [`infra/aws/lambda/README.md`](../../infra/aws/lambda/README.md).

Essa preparação habilita validação técnica da imagem. Ela não escolhe API Gateway, Function URL ou ALB, não declara a função Lambda e não configura domínio, throttling, WAF, aliases, concorrência, alarmes ou secret injection.

## Compatibilidade e limites de Lambda

### Uploads

Rotas atuais recebem multipart dentro do Next.js e aceitam arquivos de até 4, 6, 8 ou 10 MiB. Esse modelo não é compatível com os limites de invocação síncrona e não escala de forma eficiente.

Antes da produção em Lambda, todo upload deve usar:

```text
intent autorizado
→ URL pré-assinada curta
→ upload direto ao storage privado
→ confirmação de checksum, tamanho, MIME e versão
→ reconciliação assíncrona
```

### Estado e cache

`/tmp` é local e descartável. Não pode ser usado para:

- estado de sessão;
- locks distribuídos;
- fila ou outbox;
- cache compartilhado de correção;
- arquivos persistentes;
- coordenação entre invocações.

Qualquer dependência de ISR ou incremental cache precisa de estratégia compartilhada ou ser eliminada da superfície dinâmica antes do release.

### Banco

Enquanto o runtime usa Supabase remoto, Lambda não abre conexões diretas ao RDS. Se o adapter RDS for ativado, a arquitetura precisa de RDS Proxy, limites de pool e concorrência dimensionados por teste de carga para evitar tempestade de conexões.

### Trabalho assíncrono

O Lambda HTTP não substitui worker. Outbox, HubSpot, reconciliação e tarefas demoradas precisam de consumidores event-driven separados, com retry, DLQ, idempotência e concorrência limitada.

## Comparação de compute

| Critério | ECS/Fargate | Lambda preparada |
|---|---|---|
| Artefato | `Dockerfile` | `Dockerfile.lambda` |
| Infraestrutura | Terraform parcial | não declarada |
| Processo | contínuo | efêmero e concorrente |
| Cache local | compartilhado apenas dentro da task | isolado por execution environment |
| Upload atual | tecnicamente possível, mas pouco eficiente | bloqueado pelos limites de payload |
| Escala | autoscaling de 2 a 6 tasks no baseline | concorrência ainda não dimensionada |
| Rollback | task definition por digest | versão e alias ainda ausentes |
| Estado de produção | bloqueado | bloqueado |

A escolha final deve ser feita por carga, latência, custo, perfil de tráfego, necessidades de cache e operação — não apenas pela existência do container.

## Guardas comuns

- imagem por digest, nunca `latest`;
- secrets fora do build e do Git;
- configuração `NEXT_PUBLIC_*` correspondente ao ambiente;
- domínio HTTPS aprovado;
- privilégio mínimo;
- liveness e readiness fail-closed;
- logs sem payload sensível;
- backup, restore e rollback exercitados;
- teste de carga, soak e falhas;
- E2E autenticado real.

## Bloqueadores para staging

1. CI funcional e build comprovado;
2. conta, região, domínio, certificado e responsável operacional;
3. decisão explícita de compute e front door;
4. identidade de produção e integração com o site;
5. fluxo de upload direto;
6. decisão de manter Supabase ou ativar adapters RDS/S3;
7. secret injection e rotação;
8. worker de HubSpot/outbox e sandbox;
9. rate limiting, WAF e proteção contra abuso;
10. observabilidade, SLOs e alarmes completos;
11. carga, capacidade, cold starts e concorrência testados;
12. backup, restore, rollback e incident response;
13. conteúdo, diagnóstico, privacidade e acessibilidade aprovados;
14. E2E real no ambiente-alvo.

## Disposição

```text
ecs_staging_applied = false
lambda_container_image_prepared = true
lambda_infrastructure_applied = false
production_compute_selected = false
direct_uploads_implemented = false
rds_adapter_active = false
s3_adapter_active = false
production_ready = false
```
