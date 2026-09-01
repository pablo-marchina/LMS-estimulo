# Fronteira da arquitetura AWS

Este documento define a fronteira arquitetural que deve permanecer verdadeira enquanto a produção institucional da Plataforma Estímulo utilizar a estratégia AWS.

## Decisões aprovadas

- AWS é o provider institucional destinado à produção;
- a aplicação web possui empacotamento definido por [`../../Dockerfile.lambda`](../../Dockerfile.lambda);
- Supabase e Vercel pertencem aos ambientes de desenvolvimento, teste e preview e não são fallback implícito de produção.

Escolhas adicionais de serviço ou topologia só se tornam contrato depois de decisão arquitetural explícita e atualização dos contratos legíveis por máquina.

## Fronteiras que exigem definição

A arquitetura de produção precisa especificar, antes da ativação da capacidade correspondente:

- entrada pública, DNS, TLS, CDN e proteção de borda;
- identidade, sessão, federação, recuperação e linking;
- banco, conexões, disponibilidade e migrations;
- armazenamento privado e ciclo de vida de objetos;
- processamento assíncrono, retry, dead letter e reconciliação;
- rede, contas e isolamento de ambientes;
- segredos, criptografia e rotação;
- logs, métricas, tracing, alertas e on-call;
- deploy, promoção, rollback e disaster recovery;
- capacidade, limites, custos e SLOs.

## Fail-closed

Uma fronteira de produção ainda não implementada não reutiliza silenciosamente o adapter Supabase/Vercel. Readiness deve falhar quando o provider selecionado não possui as dependências obrigatórias.

A existência do `Dockerfile.lambda` comprova apenas o contrato de empacotamento, não toda a infraestrutura.

## Critério arquitetural

Novas decisões AWS devem incluir requisitos, alternativas, trade-offs, threat model, privacidade, capacidade, custo, observabilidade, continuidade e plano de migração dos adapters. O contrato em [`../../config/platform/aws-production.json`](../../config/platform/aws-production.json) deve acompanhar as decisões executáveis.