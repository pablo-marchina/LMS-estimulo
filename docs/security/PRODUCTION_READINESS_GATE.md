# Gate de prontidão para produção

**Revisado em:** 2026-07-30  
**Estado:** produção bloqueada enquanto a arquitetura AWS e as evidências do Gate B estiverem pendentes

## Finalidade

Este documento define os critérios permanentes de segurança, privacidade, operação e governança para liberar usuários reais. Ele não mantém contagem de migrations, SHA, resultados de CI, métricas ou infraestrutura presumida.

O estado detalhado dos bloqueadores está em [`DELIVERY_BLOCKERS.md`](../implementation/DELIVERY_BLOCKERS.md), e o processo de promoção está em [`FINAL_RELEASE_RUNBOOK.md`](../operations/FINAL_RELEASE_RUNBOOK.md).

## Regra central

Existem dois níveis independentes:

1. **Gate A — software:** fonte, dependências, banco, contratos, testes, build, imagem e scans aprovados no mesmo SHA;
2. **Gate B — produção:** arquitetura AWS aprovada e ambiente definitivo comprovado para múltiplos usuários.

A aprovação do Gate A não autoriza produção. Nenhum resultado de outro SHA, preview Vercel, Supabase de teste, fixture ou smoke substitui o Gate B.

## Estado invariável atual

```text
aws_definitive_production_environment = required
approved_aws_artifacts = [Dockerfile.lambda]
aws_production_architecture_decided = false
aws_staging_available = false
production_deploy_allowed = false
supabase_vercel_production_allowed = false
production_ready = false
```

## Pré-condição arquitetural

Antes de implementar staging ou produção, ADRs aprovados devem definir:

- entrada pública e proteção de borda;
- identidade, autenticação e sessão;
- banco e gerenciamento de conexões;
- armazenamento e fluxo de arquivos;
- processamento assíncrono e reconciliação;
- rede e isolamento de ambientes;
- segredos, criptografia e rotação;
- observabilidade, alertas e operação;
- deploy, promoção, rollback e continuidade.

Este documento não escolhe serviços, topologia ou IaC.

## Segurança do ambiente definitivo

### Identidade e autorização

- cadastro, confirmação, login, recuperação, refresh, logout e revogação comprovados;
- identidade externa vinculada à conta interna sem duplicação ou takeover;
- contas administrativas com requisitos corporativos e RBAC ativo;
- capacidades, escopo, validade e finalidade verificados server-side;
- testes negativos de BOLA/IDOR, escalada de privilégio e acesso entre organizações;
- sessão expirada ou revogada fecha acesso imediatamente dentro do objetivo aprovado.

### Isolamento e dados

- isolamento multiorganização comprovado no runtime e no banco definitivos;
- RLS/RBAC e autorização de objetos privados testados sob concorrência;
- classificação de dados, finalidade, acesso e retenção aprovados;
- CPF e demais dados sensíveis protegidos em trânsito e repouso;
- custódia, rotação, recuperação e segregação das chaves exercitadas;
- dados de teste sintéticos e separados de produção.

### Aplicação e dependências

- imagem e deployment correspondem ao SHA e digest aprovados;
- nenhuma configuração, segredo ou fallback Supabase está presente na produção;
- dependências e imagem dentro da política de vulnerabilidades;
- proteção distribuída contra abuso, brute force e sobrecarga;
- limites de payload, timeout, concorrência e consumo de recursos;
- erros internos sanitizados e readiness fechada quando dependência obrigatória falha.

### Arquivos e processamento assíncrono

- upload, confirmação, acesso temporário, retenção e exclusão autorizados;
- objetos órfãos ou divergentes detectados e reconciliados;
- controles de conteúdo definidos pela análise de risco e comprovados no ambiente;
- trabalhos assíncronos idempotentes, com retry, isolamento de falhas e redrive autorizado;
- nenhuma capacidade é declarada ativa apenas porque estruturas históricas existem no banco.

## Privacidade e governança

Antes de usuários reais, devem estar aprovados:

1. controlador, operadores, encarregado ou justificativa formal e canais públicos;
2. registro das atividades de tratamento;
3. bases legais e consentimentos aplicáveis;
4. aviso de privacidade e termos finais;
5. retenção, exclusão, legal hold e direitos dos titulares;
6. finalidade e tratamento de CPF, telefone, CNPJ e identificadores externos;
7. fornecedores, contratos, subprocessadores e transferências;
8. política de logs, redaction, auditoria e acesso;
9. resposta a incidente e comunicação;
10. governança de crédito e proibição de uso não aprovado de sinais educacionais.

Dados educacionais e comportamentais permanecem fora de crédito por padrão. Maturidade, arquétipo, respostas, comentários, ranking e avaliações não podem influenciar elegibilidade, risco ou decisão sem metodologia validada, revisão de vieses, base legal, governança humana e aprovação explícita.

## Capacidade e confiabilidade

O staging AWS aprovado deve passar:

- E2E navegador → runtime → dependências definitivas;
- ramp, spike e soak de operações autenticadas;
- múltiplos usuários e organizações concorrentes;
- saturação, backpressure e rejeição controlada;
- falha e recuperação de dependências;
- integridade de escrita, idempotência e reconciliação;
- estabilidade de memória, conexões, latência e backlog;
- limites e custo operacional aprovados.

## Observabilidade e operação

- logs, métricas e tracing sem dados sensíveis proibidos;
- dashboards associados aos SLOs;
- alertas acionáveis com proprietário e severidade;
- on-call e escalonamento definidos;
- runbooks de incidente, degradação e reconciliação;
- correlação entre request, transação, evento, outbox e integração;
- detecção de deployment divergente do SHA/digest aprovado.

## Continuidade

- backup e recuperação pontual configurados conforme a arquitetura aprovada;
- restore exercitado e validado;
- rollback de aplicação exercitado;
- estratégia segura para migrations incompatíveis;
- RTO e RPO aprovados;
- indisponibilidade de dependência obrigatória fecha readiness e impede corrupção.

## Conteúdo e acessibilidade

- conteúdo e mídias oficiais aprovados;
- diagnóstico, scoring, arquétipos e ativações aprovados metodologicamente;
- auditoria de acessibilidade com teclado, foco, leitores de tela, contraste e mídia;
- linguagem de erro, consentimento, ajuda e suporte revisada;
- piloto homologado pelos responsáveis institucionais.

## Regra de deploy

Produção permanece `NO-GO` quando qualquer item abaixo ocorrer:

- workflow obrigatório não verde no SHA atual;
- arquitetura AWS ainda pendente;
- ambiente diferente do SHA ou digest aprovado;
- erro de autorização, isolamento, integridade ou idempotência;
- capacidade ou SLOs não comprovados;
- proteção, observabilidade ou resposta insuficientes;
- backup, restore ou rollback não exercitado;
- aprovação jurídica, de privacidade, conteúdo ou acessibilidade pendente;
- Supabase ou Vercel configurado como produção;
- risco aceito sem decisão formal identificável.

Ausência de prova permanece bloqueio e nunca é convertida em `passed` por documentação.
