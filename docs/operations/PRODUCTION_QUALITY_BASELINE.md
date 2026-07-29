# Baseline de qualidade para produção

## Objetivo

Este documento define os controles versionados que sustentam reprodutibilidade, integridade, desempenho, segurança e capacidade. Ele não substitui evidência operacional: cada release deve produzir seus próprios artefatos, métricas e aprovações.

## Reprodutibilidade e integridade

- Node.js é fixado em `22.23.1` por `.nvmrc`, `.node-version`, Docker e CI.
- npm é fixado em `10.9.8`; instalações usam `npm ci` e o lockfile não pode mudar.
- GitHub Actions de terceiros são referenciadas por SHA completo.
- Linux e Windows executam instalação limpa, validações, typecheck e build.
- O manifesto de release registra commit, toolchain, hashes dos arquivos críticos, conjunto de migrations, imagem e arquivo OCI/Docker quando disponíveis.
- O deployment só pode ser promovido quando seu commit e seu digest corresponderem ao manifesto aprovado.

## Segurança

- A aplicação envia CSP, HSTS, `nosniff`, política de referência, política de permissões e proteção contra framing.
- Rotas protegidas não podem ser cacheadas e recebem identificador e temporização de requisição.
- Sessões inválidas removem cookies de autenticação antes do redirecionamento.
- O gateway RPC impõe allowlist, limites de payload, timeout, fila, concorrência e backpressure.
- A Edge Function não retorna mensagens SQL internas; códigos públicos permanecem estáveis para o cliente.
- O limitador de burst da Edge Function é defesa por instância. Produção AWS exige limite distribuído no WAF/API Gateway.
- A imagem Lambda executa como usuário sem privilégios.

## Desempenho

- Rotas públicas não executam validação remota de sessão desnecessária.
- O gateway mede duração total e a Edge Function separa Auth, identidade e RPC em `Server-Timing` e logs estruturados.
- Foreign keys usadas por arquivos, reconciliação de identidade e progresso recebem índices de cobertura.
- Remoção de índices marcados como não utilizados exige janela representativa de tráfego e análise de planos; não é automática.

## Capacidade

- O gateway rejeita excesso de concorrência antes de esgotar upstreams.
- O teste de capacidade é parametrizável e falha por taxa de erro, p95 ou p99.
- O smoke test de CI valida o container com concorrência baixa; homologação executa cenários progressivos e soak test.
- Limites iniciais de homologação devem ser registrados como evidência, não codificados como promessa permanente.

## Gates mínimos de release

1. Todos os workflows verdes no mesmo commit.
2. Replay do banco em ambiente vazio.
3. Manifesto de release e hash do artefato publicados.
4. Verificação de headers e health checks aprovada.
5. Teste de capacidade aprovado com os SLOs da release.
6. Backlog assíncrono, dead letters e falhas críticas dentro dos limites definidos.
7. Restore e rollback exercitados para a versão candidata.
8. Commit implantado igual ao commit aprovado.

## SLOs iniciais de homologação

Os valores abaixo são gates iniciais e devem ser recalibrados com tráfego real:

- taxa de erro HTTP menor ou igual a 1%;
- p95 de rota dinâmica menor ou igual a 2 segundos;
- p99 menor ou igual a 5 segundos;
- nenhum crescimento sustentado do backlog crítico;
- zero violação de isolamento entre organizações;
- readiness fechado sempre que uma dependência obrigatória não estiver saudável.
