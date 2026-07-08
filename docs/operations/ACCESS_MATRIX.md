# Matriz de acessos

| ID | Recurso | Ambiente | Nível necessário | Status | Observação segura |
|---|---|---|---|---|---|
| ACC-001 | Repositório GitHub | Código | Leitura/ZIP | DISPONÍVEL | ZIP recebido e extraído em 2026-07-08. |
| ACC-002 | HubSpot | Sandbox | Leitura de configuração e API de teste | PENDENTE | Não enviar token no chat. |
| ACC-003 | Supabase | Local/Test | Admin de projeto de teste e CLI | PENDENTE | Criar projeto compartilhado; migrations vêm do repositório. |
| ACC-004 | Supabase Auth / Amazon Cognito | Test / AWS staging | Admin restrito | PENDENTE | Dois provedores atrás do mesmo adapter OIDC. |
| ACC-005 | Conta AWS | Staging/Produção | Deploy controlado por IAM | PENDENTE | AWS definida como nuvem final; criar contas/ambientes segregados. |
| ACC-006 | OpenAI | Projeto de desenvolvimento | Chave restrita e orçamento limitado | PENDENTE | Guardar em secret manager. |
| ACC-007 | DNS/domínio | Staging/Produção | Gerenciamento limitado | FUTURO | Não necessário para auditoria inicial. |
| ACC-008 | Observabilidade | Sandbox/Staging | Projeto e ingestão | NÃO DEFINIDO | Depende da stack. |
| ACC-009 | E-mail/notificações | Sandbox | Envio restrito | NÃO DEFINIDO | Não necessário no primeiro passo. |
| ACC-010 | Amazon RDS PostgreSQL | AWS staging | Admin via migration role | PENDENTE | Não fornecer credencial ao frontend. |
| ACC-011 | Amazon S3 | AWS staging | Bucket e IAM de teste | PENDENTE | Buckets privados e URLs assinadas. |
| ACC-012 | Amazon SQS/DLQ | AWS staging | Publish/consume restrito | PENDENTE | Validar outbox, retry e DLQ. |
| ACC-013 | Amazon ECR/ECS/Fargate | AWS staging | Build/deploy controlado | PENDENTE | Mesmo container que seguirá para produção. |
| ACC-014 | AWS Secrets Manager/SSM | AWS staging | Leitura por task role | PENDENTE | Segredos nunca no repositório. |
| ACC-015 | CloudWatch/X-Ray/ADOT | AWS staging | Escrita de telemetria e leitura operacional | PENDENTE | OpenTelemetry como contrato comum. |
