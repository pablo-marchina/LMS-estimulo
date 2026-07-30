# Estado da arquitetura AWS

**Revisado em:** 2026-07-29  
**Estado:** decisões de arquitetura de produção pendentes

## Decisões vigentes

Somente três decisões estão aprovadas:

1. a AWS será o ambiente definitivo de produção;
2. a aplicação web será empacotada pela imagem definida em [`../../Dockerfile.lambda`](../../Dockerfile.lambda);
3. Supabase e Vercel são ambientes de desenvolvimento, teste e preview e não podem receber tráfego oficial de produção.

Nenhuma outra escolha de serviço, topologia ou operação AWS está aprovada neste momento.

## Decisões explicitamente pendentes

Devem ser decididos por ADR próprio, com requisitos, alternativas, trade-offs, custos, riscos, limites e plano de operação:

- entrada pública, DNS, TLS, CDN, proteção de borda e rate limiting distribuído;
- identidade, sessão, federação, recuperação e vínculo com as identidades internas;
- banco transacional, conexão, alta disponibilidade, migrations e isolamento;
- armazenamento privado, uploads, downloads, verificação e ciclo de vida;
- processamento assíncrono, retries, idempotência, dead-letter e reconciliação;
- rede, contas, ambientes, isolamento e conectividade;
- segredos, criptografia, rotação e recuperação de chaves;
- logs, métricas, tracing, alertas, on-call e resposta a incidentes;
- deploy, promoção, canary, rollback e disaster recovery;
- perfil de capacidade, limites, custos e SLOs.

## Política fail-closed

Enquanto as decisões permanecerem pendentes:

- `APP_ENV=production` e `PLATFORM_RUNTIME_PROVIDER=aws` são aceitos como seleção de ambiente, mas `/api/health/ready` deve responder `503` com `aws_architecture_pending`;
- autenticação, banco, armazenamento e integrações de produção não podem usar Supabase como fallback;
- a existência do `Dockerfile.lambda` não equivale a uma arquitetura implantável;
- nenhum preview Vercel pode ser promovido ou descrito como produção;
- nenhuma documentação pode declarar serviços AWS específicos como decisão vigente.

## Gate para encerrar esta pendência

A arquitetura somente poderá ser marcada como decidida quando houver:

1. requisitos funcionais e não funcionais aprovados;
2. ADRs das fronteiras acima;
3. modelo de ameaças e avaliação LGPD;
4. diagrama de contexto, containers, rede e fluxos de dados;
5. estimativa de capacidade e custo;
6. estratégia de observabilidade, backup, restore e rollback;
7. plano de migração dos adapters de teste para os adapters de produção;
8. aprovação técnica e institucional registrada.

Depois dessa decisão, o contrato legível por máquina em [`../../config/platform/aws-production.json`](../../config/platform/aws-production.json) deve ser atualizado antes de qualquer implementação de infraestrutura.
