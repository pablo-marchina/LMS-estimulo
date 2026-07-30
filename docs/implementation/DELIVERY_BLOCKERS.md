# Bloqueadores da entrega

**Revisado em:** 2026-07-30  
**Estado permanente:** produção AWS bloqueada; aprovação do software depende dos workflows do SHA atual

## Finalidade

Este documento mantém somente bloqueadores ativos e regras de promoção. Ele não congela SHA, quantidade de migrations, contagem de RPCs, throughput ou percentis de um candidato específico.

As evidências transitórias pertencem a:

- workflows do GitHub Actions no SHA avaliado;
- `release-manifest.json` e seus hashes;
- artefatos de replay, testes, scan e capacidade;
- descrição e revisão do pull request correspondente.

Uma aprovação anterior não se transfere automaticamente para commits posteriores. Qualquer alteração em código, migrations, dependências, contratos, workflows, imagem ou configuração exige nova avaliação proporcional ao risco.

## Decisão executiva

| Escopo | Regra vigente |
|---|---|
| desenvolvimento local | permitido com provider Supabase e dados de teste |
| CI e banco efêmero | permitido; são a fonte canônica de replay e validação do software |
| preview Vercel + Supabase | permitido somente para revisão controlada e dados de teste |
| candidato de software | aprovado somente quando todos os workflows obrigatórios estiverem verdes no mesmo SHA |
| `Dockerfile.lambda` | único artefato AWS atualmente aprovado |
| staging AWS | bloqueado até decisões arquiteturais e implementação correspondentes |
| produção AWS multiusuário | bloqueada até o Gate B completo |
| Supabase ou Vercel como produção | proibido |

## Gate A — release do software

### Fonte de verdade

O estado do Gate A é calculado no SHA atual. São obrigatórios:

1. `Repository governance`;
2. `Dependency reproducibility`;
3. `Reproducibility`;
4. `Database gates`;
5. `Web CI`.

Nenhum workflow, job ou passo obrigatório pode estar ausente, cancelado, ignorado ou vermelho.

### Critérios

#### Fonte e qualidade

- checkout limpo e line endings determinísticos;
- instalação exclusivamente pelo lockfile e toolchain fixada;
- lint da fonte versionada;
- higiene do repositório, links e índice documental;
- testes de aplicação, produto, integração e tooling;
- typecheck e build Next.js;
- documentação coerente com o runtime atual.

#### Banco e integridade

- replay integral desde banco vazio somente pelo histórico Git;
- migrations sem dependência de contas, dados editoriais ou estado remoto não versionado;
- equivalência canônica de schema;
- contratos públicos verificados pelo artefato versionado;
- todas as RPCs chamadas pela aplicação cobertas pela fronteira autorizada;
- E2E transacional e suítes de domínio aprovados;
- autorização, RLS, RBAC, idempotência, concorrência e imutabilidade exercitados;
- eventos e outbox coerentes nos fluxos cobertos.

#### Reprodutibilidade

- instalação, typecheck e build em Linux e Windows;
- fonte limpa antes e depois de instalação e build;
- banco reconstruído sem usar o Supabase remoto como precondição;
- imagem e manifesto associados ao mesmo SHA;
- hashes verificáveis dos artefatos críticos.

#### Segurança

- secret scanning bloqueante do histórico;
- audit de dependências conforme a política;
- scan bloqueante da imagem;
- imagem por digest, não-root e sem segredos ou configuração Supabase;
- filesystem read-only no smoke;
- limites de payload, timeout, concorrência, processos, CPU e memória;
- CSP e headers HTTP verificados;
- erros internos sanitizados;
- provider AWS sem fallback para Supabase;
- readiness AWS fechada enquanto a arquitetura estiver pendente.

#### Capacidade do artefato

O Gate A deve comprovar que a imagem inicia, permanece estável sob limites definidos e atende aos thresholds versionados do harness. Essa prova cobre o artefato web e não substitui carga transacional no ambiente definitivo.

Os resultados numéricos ficam em `.artifacts/load-test.json` e no artefato do workflow, nunca copiados manualmente para este documento.

## Ambiente Supabase de teste

As migrations de produto adicionadas após o primeiro candidato de release agora fazem parte do histórico Git. O ambiente remoto de teste só pode ser considerado alinhado quando:

- todas as migrations canônicas aplicáveis estiverem registradas;
- a Edge Function `authenticated-rpc` corresponder à fonte versionada;
- o gate de cobertura do gateway passar;
- `npm run verify:supabase` passar sem mutações;
- não houver função temporária, segredo antigo ou configuração divergente usada pelo runtime.

O ambiente remoto não é fonte de autoridade para criar o banco. Divergências devem ser corrigidas por migration aditiva ou recriação controlada, nunca incorporadas silenciosamente ao contrato canônico.

## Gate B — bloqueadores ativos de produção

### P0 — arquitetura e ambiente definitivo

| ID | Lacuna bloqueante | Evidência para encerrar |
|---|---|---|
| `AWS-ARCHITECTURE-DECISIONS` | somente AWS como destino e `Dockerfile.lambda` estão aprovados; as demais fronteiras não foram decididas | ADRs e arquitetura aprovados, sem inferência automática |
| `AWS-STAGING-ENVIRONMENT` | não existe ambiente equivalente à futura produção | ambiente criado a partir da arquitetura aprovada e associado ao SHA/digest |
| `AWS-RUNTIME-INTEGRATION` | adapters de produção permanecem fail-closed | adapters, probes e contratos executando no staging aprovado |
| `REAL-TRANSACTIONAL-E2E` | não há prova navegador → runtime → dependências definitivas | fluxos completos com usuários e dados sintéticos no staging AWS |
| `MULTIUSER-ISOLATION` | isolamento negativo no ambiente final não foi comprovado | matriz de autorização, BOLA/IDOR e revogação aprovada |

### P0 — capacidade e confiabilidade no ambiente final

| ID | Lacuna bloqueante | Evidência para encerrar |
|---|---|---|
| `TRANSACTIONAL-CAPACITY` | não há ramp, spike e soak de operações autenticadas | relatório por operação com throughput, percentis, erros e saturação |
| `DEPENDENCY-SATURATION` | limites das dependências definitivas são desconhecidos | testes de saturação, backpressure e rejeição controlada |
| `ASYNC-INTEGRITY` | consumidores, retries, dead-letter e reconciliação dependem da arquitetura futura | falha parcial, retry, deduplicação, redrive e reconciliação comprovados |
| `SOAK-AND-RESOURCE-STABILITY` | estabilidade prolongada não foi comprovada | soak com memória, conexões, latência e backlog estáveis |

### P0 — segurança, privacidade e operação

| ID | Lacuna bloqueante | Evidência para encerrar |
|---|---|---|
| `THREAT-MODEL` | modelo de ameaças do ambiente definitivo ausente | threat model e mitigação revisados |
| `DISTRIBUTED-ABUSE-PROTECTION` | proteção distribuída depende da arquitetura ainda pendente | limites por identidade/IP/operação e testes de abuso |
| `CPF-KEY-OPERATIONS` | custódia, rotação, recuperação e segregação institucionais pendentes | runbook e exercício com chaves não sintéticas |
| `SECURITY-PRIVACY-APPROVAL` | LGPD, retenção, direitos, fornecedores e incidentes sem aceite final | aprovações técnicas, jurídicas e institucionais |
| `OBSERVABILITY-AND-ONCALL` | telemetria, alertas e escalonamento do ambiente definitivo ausentes | detecção e resposta exercitadas |
| `BACKUP-RESTORE-ROLLBACK` | continuidade não foi exercitada no destino | exercícios com RTO/RPO e evidências |
| `ACCESSIBILITY-AND-CONTENT` | conteúdo oficial e auditoria assistiva sem aceite final | aprovação editorial e de acessibilidade |

## Regras de promoção

O software só pode avançar para staging depois que a arquitetura AWS for decidida. A produção só pode ser liberada quando:

1. o mesmo SHA e digest aprovados no Gate A forem usados;
2. todos os bloqueadores P0 do Gate B forem encerrados;
3. ramp, spike e soak transacionais passarem;
4. isolamento multiusuário e multiorganização passar;
5. observabilidade, backup, restore e rollback forem exercitados;
6. segurança, privacidade, conteúdo e acessibilidade tiverem aprovação aplicável;
7. nenhum Supabase ou Vercel estiver configurado como produção.

## Estado invariável enquanto a arquitetura estiver pendente

```text
approved_aws_artifacts = [Dockerfile.lambda]
aws_definitive_production_environment = required
aws_production_architecture_decided = false
aws_staging_available = false
aws_transactional_e2e_passed = false
aws_multiuser_capacity_passed = false
aws_backup_restore_rollback_passed = false
aws_production_deploy_allowed = false
supabase_vercel_production_allowed = false
production_ready = false
```

## Conclusão

O repositório pode produzir um candidato de software aprovado quando o SHA atual concluir o Gate A. O deploy final de produção permanece bloqueado até a decisão da arquitetura AWS e a execução integral do Gate B no ambiente correspondente.
