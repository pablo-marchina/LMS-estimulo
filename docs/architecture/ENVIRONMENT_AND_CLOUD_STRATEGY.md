# Estratégia de ambientes e nuvem

**Versão:** 1.1  
**Data:** 2026-07-16  
**Status:** direção definida; implementação AWS pendente

## Autoridade

`premissas-desenvolvimento.md` determina:

- Supabase para desenvolvimento e testes;
- AWS para staging e produção.

Este documento define os meios técnicos. A sincronização HubSpot segue a DEC-070.

## Ambientes

| Ambiente | Plataforma | Finalidade | Dados | Tráfego real |
|---|---|---|---|---|
| `local` | serviços locais | desenvolvimento e testes rápidos | sintéticos | não |
| `development/test` | Supabase autorizado | integração, QA e revisão | sintéticos ou anonimizados aprovados | não |
| `staging` | AWS | paridade, segurança, carga e integrações | sintéticos/anonimizados | não |
| `production` | AWS | operação oficial | reais | sim |

## Promoção

```text
local
→ CI
→ Supabase development/test
→ AWS staging
→ gate de produção
→ AWS production
```

Nenhuma release segue diretamente do Supabase para produção.

## Fonte de verdade técnica

O Git contém:

- migrations portáveis;
- configuração sem segredos;
- schemas de eventos;
- contratos de API;
- infraestrutura como código;
- políticas e testes;
- runbooks.

Mudança manual emergencial deve ser registrada e convertida em código.

## Política de dados

### Local e desenvolvimento/teste

- dados sintéticos por padrão;
- dados reais somente anonimizados ou pseudonimizados com aprovação;
- credenciais próprias;
- e-mails bloqueados ou redirecionados;
- integrações em sandbox;
- nenhuma cópia integral de produção;
- usuários de teste marcados.

### Staging

- mesma arquitetura lógica da produção;
- escala menor permitida;
- integrações reais em sandbox;
- testes de migration, backup, restauração, carga e rollback;
- validação do escopo HubSpot aprovado na DEC-070.

### Produção

- dados reais;
- menor privilégio;
- alta disponibilidade conforme SLO;
- backups e recuperação testados;
- auditoria e alertas;
- nenhuma feature exclusiva de teste.

## Paridade

Devem permanecer equivalentes:

- versão suportada do PostgreSQL;
- migrations e constraints;
- schemas de domínio;
- contratos de eventos;
- regras de negócio;
- identidade interna;
- modelo de arquivos;
- código da aplicação;
- semântica de outbox, idempotência e reconciliação;
- instrumentação OpenTelemetry.

Podem variar atrás de adapters:

- provedor de identidade;
- object storage;
- fila;
- secret manager;
- e-mail;
- observabilidade;
- compute;
- pooling e conexão de banco;
- adapter físico HubSpot.

## Segredos

- `.env.example` contém apenas placeholders;
- valores reais ficam em secret manager;
- segredos expostos são rotacionados;
- CI executa secret scanning;
- logs e artifacts não contêm credenciais.

## Gate de AWS staging

Staging deve comprovar:

1. container e deploy automatizado;
2. migrations em RDS PostgreSQL;
3. autenticação e identidade interna;
4. autorização positiva e negativa;
5. upload e download no S3;
6. scanner real de arquivos;
7. outbox, SQS, retries e DLQ;
8. sincronização HubSpot das classes aprovadas pela DEC-070;
9. dados `not_synced` permanecendo fora do CRM;
10. backup e restauração do RDS;
11. deploy e rollback;
12. logs, métricas, traces e alertas;
13. E2E real da Jornada OpenAI;
14. acessibilidade;
15. teste de carga;
16. revisão de segurança e privacidade.

Uma jornada sintética pode testar extensibilidade, mas não substitui o E2E oficial.

## Direção técnica inicial

- ECS/Fargate ou alternativa justificada;
- RDS PostgreSQL;
- S3;
- Cognito ou provedor aprovado;
- SQS e DLQ;
- Secrets Manager/SSM;
- CloudWatch e OpenTelemetry;
- Route 53, ACM, CloudFront, WAF e ALB conforme necessidade.

A escolha final deve ser comprovada em staging.
