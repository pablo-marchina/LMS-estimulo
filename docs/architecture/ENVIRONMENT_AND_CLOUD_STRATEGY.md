# Estratégia de ambientes

**Revisado em:** 2026-07-29  
**Status:** política vigente; AWS ainda não implantada

## Ambientes

| Ambiente | Estado real | Finalidade | Dados |
|---|---|---|---|
| `local` | suportado | desenvolvimento e testes rápidos | sintéticos |
| `development/test` | runtime Supabase ativo | integração, QA e revisão | sintéticos ou anonimizados aprovados |
| `preview` | hospedagem temporária pode usar Vercel | revisão de interface e fluxos | somente dados de teste |
| `staging` | Terraform presente, recursos não aplicados | prova de paridade e operação AWS | sintéticos/anonimizados |
| `production` | inexistente | operação oficial na AWS | reais após gates |

Vercel e Supabase não são ambientes oficiais de produção.

## Promoção

```text
mudança revisada
→ validações locais/CI
→ Supabase development/test
→ AWS staging
→ gates de produção
→ AWS production
```

No estado atual, a cadeia para no ambiente de desenvolvimento/teste porque AWS staging e GitHub Actions funcionais ainda não foram comprovados.

## Fonte de verdade

O Git contém:

- aplicação e configuração sem segredos;
- migrations e contratos;
- testes;
- Dockerfile;
- Terraform bloqueado por padrão;
- documentação operacional vigente.

Uma mudança manual remota precisa ser materializada em código ou migration antes de ser considerada parte do sistema.

## Paridade esperada

Devem ser preservados entre Supabase e AWS:

- modelo de domínio e regras de negócio;
- histórico de migrations;
- contratos de eventos e idempotência;
- autorização interna;
- semântica de arquivos privados;
- código da aplicação.

Ainda não existe paridade comprovada para:

- autenticação;
- RPC/PostgREST versus acesso ao RDS;
- Supabase Storage versus S3;
- extensões PostgreSQL;
- operação de outbox e integrações;
- observabilidade.

## AWS staging

O baseline atual declara ECR, ECS/Fargate, ALB, RDS PostgreSQL, S3, KMS, CloudWatch, SNS, VPC e rede. Não declara nem comprova Cognito, SQS, SES, CloudFront, WAF ou OpenTelemetry.

Staging exige:

1. conta, região, domínio, certificado e rede aprovados;
2. imagem construída com configuração pública do ambiente e digest imutável;
3. secrets por ARN;
4. adapters ativos para identidade, RDS e S3;
5. migrations em banco limpo;
6. testes de autorização, arquivos e integrações;
7. backup, restore e rollback;
8. logs, métricas e alarmes;
9. E2E real da Jornada OpenAI;
10. segurança, privacidade e acessibilidade aprovadas.

## Dados e segredos

- dados sintéticos por padrão fora de produção;
- nenhuma cópia integral de produção em desenvolvimento;
- secrets somente em configuração protegida;
- arquivos `.env`, cookies e dados pessoais permanecem fora do Git;
- integrações externas usam sandbox antes de produção.
