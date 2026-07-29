# DEC-075 — Arquitetura de produção integral na AWS

**Data:** 2026-07-29  
**Estado:** aprovada; integração com a infraestrutura corporativa pendente

## Decisão

A produção da Plataforma Estímulo será integralmente operada na AWS. Supabase permanece autorizado somente para desenvolvimento, testes de integração e validação temporária enquanto os adapters AWS são implementados e comprovados.

A arquitetura canônica é:

```text
Route 53 ou DNS corporativo
→ CloudFront/edge corporativo
→ AWS WAF ou controle corporativo equivalente
→ API Gateway HTTP API
→ alias versionado de AWS Lambda
→ Next.js standalone via AWS Lambda Web Adapter

Identidade
→ Amazon Cognito User Pool
→ participantes por credenciais aprovadas
→ administração federada por Google, OIDC ou SAML corporativo
→ vínculo com a identidade interna do LMS

Dados
→ RDS Proxy
→ Amazon RDS for PostgreSQL Multi-AZ
→ migrations, funções PostgreSQL, event store e outbox do LMS

Arquivos
→ buckets Amazon S3 privados por finalidade
→ uploads diretos por URL pré-assinada curta
→ confirmação de checksum, tamanho, MIME e versão
→ downloads autorizados e temporários

Processamento assíncrono
→ outbox PostgreSQL
→ dispatcher controlado
→ Amazon SQS
→ Lambdas consumidoras
→ HubSpot, reconciliação e DLQ

Operação
→ ECR por digest
→ Secrets Manager e KMS
→ CloudWatch Logs, métricas e alarmes
→ tracing aprovado
→ backup, PITR, restore e rollback exercitados
```

## Compatibilidade com a AWS existente

A arquitetura define contratos e responsabilidades, não nomes fixos de contas, VPCs ou recursos. Quando a empresa já possuir componentes equivalentes, eles devem ser reutilizados se cumprirem os mesmos contratos de segurança, disponibilidade, observabilidade e isolamento.

Exemplos:

- um IdP corporativo OIDC/SAML pode federar pelo Cognito;
- uma distribuição CloudFront, WAF, hosted zone, VPC, subnets, KMS key, cluster de observabilidade ou pipeline corporativo pode ser reutilizado;
- uma solução corporativa de secrets, filas ou tracing pode substituir o serviço padrão somente mediante equivalência documentada.

Não será criada infraestrutura paralela antes do inventário corporativo.

## Fronteiras obrigatórias da aplicação

O domínio não pode depender diretamente de APIs Supabase ou AWS. Dependências de plataforma devem ficar atrás de adapters server-only para:

1. identidade e sessão;
2. invocação autorizada de operações PostgreSQL;
3. armazenamento privado e URLs temporárias;
4. publicação de mensagens assíncronas;
5. secrets e configuração;
6. telemetria.

A implementação Supabase atual é um adapter temporário. A implementação AWS será a única permitida quando `APP_ENV=production`.

## Banco

As regras transacionais, idempotência, versionamento, eventos e outbox permanecem no PostgreSQL. A migração não deve reescrever essas regras em Lambdas.

O acesso de produção ocorrerá pelo RDS Proxy. O adapter da aplicação poderá chamar funções PostgreSQL versionadas e queries controladas, sem depender de PostgREST ou Edge Functions.

Antes da promoção são obrigatórios:

- replay em RDS PostgreSQL limpo;
- inventário de extensões e roles;
- equivalência de schema, grants e comportamento;
- limites de conexão e concorrência;
- PITR, restore e rollback de migrations.

## Identidade

Amazon Cognito User Pool será o broker OIDC da aplicação, salvo se a arquitetura corporativa fornecer um broker equivalente aprovado.

Participantes e administradores continuam ligados a contas internas do LMS. Claims externas não concedem autorização de domínio diretamente. O domínio administrativo, a federação Google e as permissões RBAC continuam sendo verificações independentes.

## Arquivos

O Lambda web não receberá binários de usuários em produção. O fluxo obrigatório é:

```text
identidade e autorização
→ criação de intent no PostgreSQL
→ URL pré-assinada para uma chave opaca única
→ PUT direto ao S3 com checksum obrigatório
→ HEAD/metadata e confirmação transacional
→ reconciliação assíncrona
```

Buckets são provisionados por infraestrutura, nunca durante uma requisição da aplicação.

## Assíncrono e HubSpot

O Lambda HTTP não executa worker permanente. Eventos elegíveis permanecem na outbox e são entregues por consumidores separados com:

- idempotência persistente;
- concorrência limitada;
- backoff e jitter;
- DLQ;
- readback e reconciliação;
- alarmes de backlog e idade.

## Consequências

- Supabase não pode ser promovido para produção;
- o Terraform ECS existente deixa de ser arquitetura-alvo e permanece bloqueado até decisão explícita de remoção ou reaproveitamento;
- o `Dockerfile.lambda` é o artefato de compute escolhido, mas não prova que a plataforma esteja implantada;
- qualquer deploy marcado como produção deve falhar se `PLATFORM_RUNTIME_PROVIDER` não for `aws`;
- nenhuma infraestrutura AWS será aplicada antes do inventário da conta corporativa;
- staging precisa reproduzir os adapters e serviços de produção, com dados sintéticos ou anonimizados aprovados.

## Critério de conclusão

```text
corporate_aws_inventory_complete = true
aws_runtime_adapters_active = true
cognito_or_equivalent_active = true
rds_proxy_and_postgres_active = true
s3_direct_uploads_active = true
sqs_workers_and_dlq_active = true
observability_and_slos_active = true
backup_restore_rollback_exercised = true
real_transactional_e2e_passed = true
production_runtime_provider = aws
```
