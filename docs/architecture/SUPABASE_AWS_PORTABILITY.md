# Lacunas de portabilidade entre Supabase e AWS

**Revisado em:** 2026-07-29  
**Status:** análise de lacunas; portabilidade ainda não implementada

## Estado atual

O runtime usa diretamente:

- `@supabase/ssr` e `@supabase/supabase-js`;
- Supabase Auth;
- Supabase Storage;
- RPC/PostgREST;
- Edge Function `authenticated-rpc`.

O Terraform declara RDS e S3, mas esses recursos não estão ligados à aplicação. Nenhum adapter AWS de identidade, banco ou storage está ativo.

## Objetivo

Migrar para AWS sem reescrever regras de negócio, histórico de migrations ou experiência do produto. Esse objetivo ainda precisa ser comprovado por implementação e testes.

## Matriz

| Capacidade | Runtime atual | Destino AWS definido | Estado |
|---|---|---|---|
| banco | Supabase PostgreSQL + RPC | RDS PostgreSQL | recurso declarado; adapter pendente |
| identidade | Supabase Auth | provedor ainda não aprovado | decisão e adapter pendentes |
| arquivos | Supabase Storage | S3 privado | recurso declarado; adapter pendente |
| compute | Next.js em desenvolvimento/preview | ECS/Fargate + ALB | Terraform presente; deploy pendente |
| secrets | ambiente protegido | Secrets Manager por ARN | Terraform preparado |
| observabilidade | logs da plataforma atual | CloudWatch + alarmes | Terraform parcial; operação pendente |
| integrações | outbox e adapters no código | execução AWS a definir | não implantada |

Cognito, SQS, SES, EventBridge, CloudFront, WAF, RDS Proxy e ADOT não são componentes ativos nem decisões finais.

## Banco

As migrations usam PostgreSQL, mas incluem contratos ligados ao ecossistema Supabase. Antes de RDS:

- identificar extensões e APIs não portáveis;
- definir autenticação e contexto transacional;
- substituir dependências de PostgREST/RPC quando necessário;
- executar replay em RDS limpo;
- comparar schema e comportamento;
- exercitar backup, PITR e restore.

## Identidade

A identidade interna não deve depender apenas do identificador externo. A produção precisa preservar a relação entre provedor, conta interna, participante, organização e permissões.

A escolha do provedor de produção permanece aberta. Nenhuma documentação deve declarar Cognito como implementado ou obrigatório sem decisão posterior.

## Arquivos

O domínio deve manter metadados e chave opaca do objeto, nunca URL assinada persistida. A implementação S3 precisa reproduzir:

```text
autorização
validação de MIME/extensão/tamanho
hash SHA-256
upload privado
download autorizado
revogação e retenção
```

O scanner de malware não faz parte do produto atual.

## Prova necessária

- replay e testes em RDS;
- testes equivalentes de identidade;
- upload/download em S3;
- importações de infraestrutura contidas fora das regras de domínio;
- E2E em AWS staging;
- rollback para versão anterior;
- documentação operacional baseada na implementação real.
