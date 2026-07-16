# Estratégia de ambientes e nuvem

**Versão:** 1.0  
**Data:** 2026-07-16  
**Status:** direção definida pela premissa; implementação AWS pendente

## Autoridade

`premissas-desenvolvimento.md` determina:

- Supabase para desenvolvimento e testes;
- AWS para staging e produção final.

Este documento define os meios técnicos. Os demais documentos do pacote não são autoridade para escolhas de serviços, topologia ou implementação de nuvem.

## Decisão

A plataforma utilizará:

- **local** para desenvolvimento individual e testes rápidos;
- **Supabase gerenciado** para desenvolvimento compartilhado, integração e QA;
- **AWS staging** para provar paridade de produção;
- **AWS production** para operação real.

Supabase é ambiente de desenvolvimento/teste e não o runtime final. Nenhuma regra central deve depender exclusivamente de um recurso proprietário sem adapter ou equivalente AWS comprovado.

## Ambientes oficiais

| Ambiente | Plataforma | Finalidade | Dados | Tráfego real |
|---|---|---|---|---|
| `local` | serviços locais | desenvolvimento, migrations e testes | sintéticos | não |
| `development/test` | Supabase autorizado | integração, QA e revisão | sintéticos ou anonimizados aprovados | não |
| `staging` | AWS | paridade, segurança, carga, integrações, backup e rollback | sintéticos/anonimizados | não |
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

Nenhuma release pode seguir diretamente do Supabase para produção.

## Fonte de verdade técnica

O repositório Git contém:

- migrations portáveis;
- configuração por ambiente sem segredos;
- schemas de eventos;
- contratos de API;
- infraestrutura como código;
- políticas e testes de autorização;
- runbooks e evidências de operação.

Console do Supabase e console AWS não são fonte primária. Mudança manual emergencial deve ser registrada e convertida em código.

## Política de dados

### Local e desenvolvimento/teste

- dados sintéticos por padrão;
- dados reais somente com anonimização/pseudonimização aprovada;
- credenciais próprias do ambiente;
- e-mails e notificações bloqueados ou redirecionados;
- integrações em sandbox;
- nenhuma cópia integral de produção;
- usuários e cadastros claramente marcados como teste.

### Staging

- mesma arquitetura lógica da produção;
- escala menor permitida;
- integrações reais em sandbox;
- dados sintéticos ou anonimizados;
- testes de migration, backup, restauração, carga e rollback;
- validação da sincronização completa com HubSpot sandbox.

### Produção

- dados reais;
- menor privilégio;
- alta disponibilidade conforme SLO aprovado;
- backups e recuperação testados;
- auditoria e alertas ativos;
- acesso administrativo controlado;
- nenhuma feature exclusiva de teste ativa.

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
- testes funcionais;
- semântica da outbox, idempotência e reconciliação;
- instrumentação OpenTelemetry.

Podem variar atrás de adapters:

- provedor de identidade;
- object storage;
- fila;
- secret manager;
- e-mail;
- observabilidade;
- compute;
- adapter físico de banco e pooling.

## Segredos

Valores sensíveis presentes em fontes de referência não são copiados para o repositório.

- `.env.example` contém somente placeholders;
- valores reais ficam em secret manager ou ambiente autorizado;
- segredos expostos devem ser rotacionados;
- CI deve executar secret scanning;
- imagens, logs, artifacts e PRs não podem conter credenciais.

## Gate de AWS staging

Staging deve comprovar:

1. container e deploy automatizado;
2. migrations em RDS PostgreSQL;
3. autenticação e identidade interna;
4. autorização positiva e negativa;
5. upload e download no S3;
6. scanner real e promoção segura de arquivos;
7. outbox, SQS, retries e DLQ;
8. integração completa e reconciliação HubSpot;
9. backup e restauração do RDS;
10. deploy e rollback;
11. logs, métricas, traces e alertas;
12. E2E real da Jornada OpenAI;
13. acessibilidade dos fluxos críticos;
14. teste de carga acordado;
15. revisão de segurança e privacidade.

Uma jornada sintética pode testar extensibilidade técnica, mas não é gate de produto nem substitui a Jornada OpenAI oficial.

## Direção técnica inicial

A baseline proposta continua sendo:

- ECS/Fargate ou alternativa AWS tecnicamente justificada;
- RDS PostgreSQL;
- S3;
- Cognito ou provedor de identidade aprovado;
- SQS e DLQ;
- Secrets Manager/SSM;
- CloudWatch e OpenTelemetry;
- Route 53, ACM, CloudFront, WAF e ALB conforme necessidade.

A escolha final deve ser comprovada em staging e pode mudar por decisão técnica registrada, desde que preserve os requisitos superiores.
