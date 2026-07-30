# Baseline de qualidade para produção

**Revisado em:** 2026-07-30

## Objetivo

Este documento define controles permanentes de reprodutibilidade, integridade, desempenho, segurança e capacidade. Ele não substitui evidência operacional: cada SHA e cada ambiente produzem seus próprios artefatos, métricas e aprovações.

## Reprodutibilidade e integridade do software

- Node.js e npm são fixados pelos arquivos de toolchain, Docker e CI.
- Instalações usam `npm ci`; o lockfile não pode ser alterado pela instalação.
- Actions de terceiros são referenciadas por SHA completo.
- Linux e Windows executam instalação limpa, validações, typecheck e build.
- O PostgreSQL é reconstruído desde banco vazio pelo histórico Git.
- Contratos públicos, gateway, RLS, RBAC, idempotência e E2E são validados no banco efêmero.
- O manifesto registra commit, toolchain, hashes de arquivos críticos, migrations e imagem.
- Um artefato só pode ser promovido quando SHA e digest correspondem à evidência aprovada.

## Segurança do software

- A aplicação envia CSP, HSTS, `nosniff`, políticas de referência e permissões e proteção contra framing.
- Rotas protegidas não podem ser cacheadas e recebem identificação e temporização de requisição.
- Sessões inválidas são encerradas sem expor tokens ou estado interno.
- O gateway RPC impõe allowlist, limites de payload, timeout, fila, concorrência e backpressure.
- A Edge Function de teste sanitiza erros e não devolve mensagens SQL internas.
- O limitador local é somente defesa por instância; produção exige proteção distribuída definida na futura arquitetura.
- A imagem executa como usuário sem privilégios, com filesystem read-only no smoke e sem segredos incorporados.
- O provider AWS não faz fallback para Supabase.

## Desempenho do software

- Rotas públicas evitam validação remota de sessão desnecessária.
- Gateway e adapters emitem duração e logs estruturados sem dados sensíveis.
- Foreign keys críticas recebem índices de cobertura.
- Remoção de índice exige janela representativa, análise de plano e rollback.
- Cache, invalidação e consultas devem preservar autorização e consistência.

## Capacidade do artefato

- o gateway rejeita excesso antes de esgotar dependências;
- o harness falha por taxa de erro, throughput mínimo e percentis;
- o container é testado sob limites explícitos de CPU, memória e processos;
- OOM, reinícios e crescimento de recursos são observados;
- resultados numéricos ficam nos artefatos do workflow.

Esse teste valida o processo HTTP e a imagem. Ele não comprova capacidade transacional do ambiente de produção.

## Gate A — mínimo do software

1. workflows obrigatórios verdes no mesmo SHA;
2. instalação limpa e árvore sem alterações;
3. replay integral do banco vazio;
4. contratos e suítes comportamentais aprovados;
5. typecheck e build aprovados;
6. secret scanning, audit e scan da imagem aprovados;
7. headers, liveness, readiness fail-closed e capacidade do artefato aprovados;
8. manifesto e hashes publicados.

## Gate B — mínimo do ambiente de produção

Somente após decisão da arquitetura AWS:

1. staging equivalente à futura produção no mesmo SHA e digest;
2. E2E transacional e isolamento multiorganização;
3. ramp, spike e soak autenticados;
4. proteção distribuída contra abuso e sobrecarga;
5. processamento assíncrono, retry, dead-letter e reconciliação;
6. observabilidade, alertas, on-call e incidente;
7. backup, restore e rollback exercitados;
8. aprovações de segurança, privacidade, conteúdo e acessibilidade;
9. commit implantado igual ao commit aprovado.

## SLOs

Os SLOs finais serão aprovados com a arquitetura, capacidade e operação. Valores iniciais usados em testes são thresholds de validação, não promessa permanente, e devem permanecer nos workflows ou artefatos correspondentes.

Invariantes independentes de valores:

- nenhuma escrita confirmada perdida;
- zero violação de isolamento;
- rejeição controlada sob sobrecarga;
- readiness fechado quando dependência obrigatória falha;
- nenhum crescimento sustentado de backlog ou recurso durante soak.
