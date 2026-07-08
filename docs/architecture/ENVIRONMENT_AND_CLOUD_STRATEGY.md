# Estratégia de ambientes e nuvem

**Versão:** 0.1  
**Data:** 2026-07-08  
**Status:** Direção aprovada; serviços AWS detalhados serão validados no E12

## 1. Decisão

A plataforma utilizará:

- **Supabase** para desenvolvimento local, CI e ambiente compartilhado de testes/QA;
- **AWS** para staging equivalente à produção e para produção final.

Supabase é um acelerador de testes, não o runtime arquitetural definitivo. Nenhuma regra central do produto poderá depender de um serviço proprietário do Supabase sem adapter e equivalente definido na AWS.

## 2. Ambientes oficiais

| Ambiente | Plataforma | Finalidade | Dados | Tráfego real |
|---|---|---|---|---|
| `local` | Supabase CLI + serviços locais | desenvolvimento rápido, migrations, seeds, testes de RLS e integração | fictícios/sintéticos | não |
| `test` | projeto Supabase gerenciado | QA compartilhado, testes integrados, revisão de produto | sintéticos ou anonimizados | não |
| `staging` | AWS | validação de paridade de produção, carga, segurança, deploy, rollback e integrações reais em sandbox | sintéticos/anonimizados | não |
| `production` | AWS | operação real | reais | sim |

## 3. Regra de promoção

```text
local
→ CI com Supabase efêmero
→ Supabase test/QA
→ AWS staging
→ gate de produção
→ AWS production
```

Nenhuma release poderá seguir diretamente do Supabase para produção. O gate em AWS staging é obrigatório porque autenticação, IAM, storage, filas, rede, observabilidade e comportamento operacional diferem.

## 4. Fonte única de verdade de schema

A fonte de verdade será o repositório Git:

- migrations SQL PostgreSQL portáveis;
- seeds separados por ambiente;
- schemas de eventos;
- contratos de API;
- infraestrutura como código da AWS;
- políticas e testes de autorização.

O dashboard do Supabase e o console da AWS não serão fontes primárias de configuração. Mudanças manuais emergenciais deverão ser convertidas em código versionado.

## 5. Política de dados por ambiente

### Local e test

- dados sintéticos por padrão;
- dados reais somente após anonimização/pseudonimização aprovada;
- chaves e endpoints próprios;
- e-mails e notificações redirecionados ou bloqueados;
- integrações externas em sandbox;
- sem cópia integral de produção.

### Staging

- topologia equivalente à produção;
- escala menor permitida;
- mesmas classes de serviço e políticas essenciais;
- integrações em sandbox;
- testes de migration, rollback, backup, restauração e carga.

### Produção

- dados reais;
- menor privilégio;
- alta disponibilidade conforme SLO;
- backups e recuperação testados;
- auditoria e alertas ativos;
- acesso administrativo controlado e registrado.

## 6. Requisitos de paridade

Devem permanecer iguais entre Supabase e AWS:

- versão principal do PostgreSQL;
- migrations e constraints;
- schemas de domínio;
- contrato de eventos;
- regras de negócio;
- adapter de identidade interno;
- modelo de arquivos;
- código da aplicação;
- testes funcionais e E2E;
- formato de observabilidade OpenTelemetry.

Podem variar atrás de adapters:

- provedor de identidade;
- object storage;
- fila;
- secret manager;
- serviço de e-mail;
- implementação de observabilidade;
- infraestrutura de compute.

## 7. Gate de produção

Antes da promoção, staging deve comprovar:

1. migrations aplicadas do zero e a partir da versão anterior;
2. testes de RLS/autorização positivos e negativos;
3. autenticação Cognito e mapeamento de identidade interna;
4. upload/download por URLs assinadas no S3;
5. outbox, SQS, retries e DLQ;
6. sincronização e reconciliação HubSpot;
7. backup e restauração do RDS;
8. deploy e rollback;
9. logs, métricas, traces e alertas;
10. teste multi-jornada com a OpenAI e uma jornada sintética;
11. teste de carga acordado;
12. revisão de segurança e privacidade.

## 8. Fontes técnicas oficiais

- Supabase: desenvolvimento local, migrations, seeds e testes.
- AWS: ECS/Fargate, RDS PostgreSQL, S3, SQS, Cognito, Secrets Manager e CloudWatch.
