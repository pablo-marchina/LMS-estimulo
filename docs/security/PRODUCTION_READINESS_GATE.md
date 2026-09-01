# Gate de prontidão para produção

Este documento define critérios permanentes para liberar usuários reais em um ambiente institucional.

## Dois níveis de prova

1. **Software:** fonte, dependências, migrations, contratos, testes, build e scans aprovados no mesmo SHA.
2. **Ambiente:** infraestrutura, identidade, dados, segurança, capacidade, observabilidade, continuidade e governança comprovados no provider definitivo.

A aprovação do software não autoriza produção por si só.

## Arquitetura

O ambiente de produção precisa de decisões explícitas para:

- entrada pública, DNS, TLS e proteção de borda;
- identidade, sessão, federação e recuperação;
- banco, conexões e disponibilidade;
- storage e fluxo de arquivos;
- processamento assíncrono e reconciliação;
- rede e isolamento;
- segredos, criptografia e rotação;
- observabilidade, deploy, rollback e disaster recovery.

A estratégia institucional de provider é definida em [`../architecture/ENVIRONMENT_AND_CLOUD_STRATEGY.md`](../architecture/ENVIRONMENT_AND_CLOUD_STRATEGY.md) e [`../architecture/AWS_ARCHITECTURE_STATUS.md`](../architecture/AWS_ARCHITECTURE_STATUS.md).

## Identidade e autorização

- cadastro, confirmação, login, recuperação, refresh, logout e revogação comprovados;
- vínculo entre identidade externa e conta interna protegido contra takeover;
- administração exige identidade e membership válidos, com RBAC;
- BOLA/IDOR e escalada de privilégio possuem testes negativos;
- sessão expirada ou revogada deixa de autorizar dentro do objetivo operacional aprovado.

## Isolamento e dados

- isolamento multiorganização comprovado;
- RLS/RBAC e objetos privados testados;
- classificação, finalidade, acesso e retenção aprovados;
- dados sensíveis protegidos em trânsito e repouso;
- custódia e rotação de chaves definidas;
- dados de teste separados dos dados reais.

## Aplicação

- imagem/deployment correspondem ao SHA e digest aprovados;
- nenhum fallback de desenvolvimento aparece na produção;
- vulnerabilidades obedecem à política de segurança;
- limites de payload, timeout, concorrência e recursos são definidos;
- readiness falha quando uma dependência obrigatória não está apta.

## Arquivos e assíncrono

- upload, acesso temporário, retenção e exclusão são autorizados;
- divergências de objetos são reconciliáveis;
- controles de conteúdo derivam do threat model;
- jobs são idempotentes, com retry, dead letter e redrive governado.

## Privacidade e governança

Devem existir, conforme os tratamentos ativados:

- responsabilidades e canais públicos;
- ROPA e bases legais;
- termos e avisos aplicáveis;
- retenção, direitos dos titulares e legal hold;
- contratos, subprocessadores e transferências;
- logging/redaction e auditoria;
- resposta a incidentes;
- governança explícita para qualquer eventual uso de sinais educacionais fora de aprendizagem/pesquisa.

## Capacidade e confiabilidade

O ambiente definitivo precisa provar:

- E2E navegador → runtime → dependências;
- concorrência de múltiplos usuários/organizações;
- ramp, spike e soak proporcionais ao uso esperado;
- saturação e backpressure controlados;
- recuperação de dependências;
- integridade, idempotência e reconciliação;
- limites e custo operacional aceitáveis.

## Observabilidade e continuidade

- logs, métricas e tracing com minimização;
- dashboards e alertas acionáveis;
- on-call e escalonamento definidos;
- backup e restore exercitados;
- rollback de aplicação exercitado;
- estratégia segura para migrations incompatíveis;
- RTO/RPO aprovados.

## Conteúdo e acessibilidade

- conteúdo publicado possui aprovação e direitos aplicáveis;
- instrumentos diagnósticos e avaliações possuem fonte/metodologia quando apresentados como oficiais;
- teclado, foco, leitores de tela, contraste e mídia são validados;
- suporte e linguagem crítica são revisados.

## NO-GO

Produção não é promovida quando faltar prova material de segurança, isolamento, integridade, capacidade, continuidade, governança ou correspondência com o SHA aprovado. Risco aceito exige registro formal no sistema de governança apropriado.

O processo de promoção está em [`../operations/RELEASE_RUNBOOK.md`](../operations/RELEASE_RUNBOOK.md).