# Bloqueadores da entrega

**Revisado em:** 2026-07-30  
**Candidato aprovado do software:** `d87ad6346b922f9c1d52639b13e90370814ce363`  
**Estado:** Gate A aprovado; Gate B de produção bloqueado

## Decisão executiva

O candidato do software está liberado para merge, revisão de integração e preparação do futuro staging AWS. Ele **não está autorizado a receber usuários reais nem a ser promovido como produção**, porque a arquitetura AWS definitiva ainda não foi decidida e, portanto, as provas transacionais e operacionais do ambiente final ainda não podem existir.

São estados diferentes:

| Escopo | Decisão | Justificativa |
|---|---|---|
| desenvolvimento local | `GO` | instalação, testes e banco reproduzíveis |
| CI e banco efêmero | `GO` | cinco workflows obrigatórios verdes no mesmo SHA |
| Supabase/Vercel para teste e preview | `GO condicionado` | não podem ser descritos nem promovidos como produção; ambiente remoto possui drift a reconciliar |
| artefato `Dockerfile.lambda` | `GO` | build, inspeção, scan, smoke, capacidade limitada e manifesto aprovados |
| staging AWS | `NO-GO` | arquitetura e ambiente ainda não definidos |
| produção AWS multiusuário | `NO-GO` | Gate B não executável enquanto a arquitetura permanecer pendente |
| Supabase ou Vercel como produção | `PROIBIDO` | contraria a política de ambientes aprovada |

## Gate A — release do software aprovado

### Workflows no mesmo SHA

No candidato `d87ad6346b922f9c1d52639b13e90370814ce363`, concluíram com sucesso:

- Repository governance;
- Dependency reproducibility;
- Reproducibility;
- Database gates;
- Web CI.

Nenhum passo obrigatório ficou vermelho, cancelado ou ignorado.

### Capacidade e performance do artefato

O container foi executado com filesystem read-only, `1 vCPU`, `512 MiB` de memória, swap limitado ao mesmo valor e limite de `256` processos.

Resultado do teste curto e controlado de liveness:

| Métrica | Resultado | Limite do gate |
|---|---:|---:|
| concorrência | 40 | — |
| duração | 15,026 s | 15 s planejados |
| requisições concluídas | 14.861 | ≥ 750 |
| throughput | 989,04 req/s | ≥ 50 req/s |
| erros | 0 | ≤ 1% |
| p50 | 30 ms | informativo |
| p95 | 85 ms | ≤ 2.000 ms |
| p99 | 109 ms | ≤ 5.000 ms |
| latência máxima | 314,91 ms | informativo |
| memória observada | 76,49 MiB | ≤ 512 MiB |
| OOM | não | obrigatório |
| reinícios | 0 | obrigatório |

Essa evidência comprova capacidade e estabilidade **do artefato web e do endpoint de liveness sob limites definidos**. Ela não substitui ramp, spike e soak dos fluxos autenticados e transacionais no futuro ambiente AWS.

### Integridade do banco e do domínio

- PostgreSQL reconstruído desde zero por `386/386` migrations;
- equivalência canônica de schema aprovada;
- contrato público congelado em `20` RPCs;
- todas as RPCs usadas pela aplicação contidas no gateway autenticado de testes;
- backend E2E transacional aprovado;
- idempotência, conflito de versão e imutabilidade publicada testados;
- mutação direta de conteúdo publicado bloqueada de forma fail-closed;
- fixtures independentes de dados ou contas humanas;
- todas as suítes de domínio aprovadas, incluindo identidade, Auth, RBAC, administração, uploads, biblioteca, credenciais, comentários, signup, relatórios e scanner removido;
- eventos e outbox validados nos fluxos cobertos.

### Reprodutibilidade

- Node.js `22.23.1` e npm `10.9.8` fixados;
- instalação exclusivamente por lockfile;
- instalação, typecheck e build aprovados em Linux e Windows;
- checkout e fonte versionada permanecem limpos;
- replay do banco não depende do Supabase remoto;
- manifesto de release reproduzível e verificado por SHA-256;
- imagem associada ao SHA aprovado.

### Segurança

- histórico Git submetido a secret scanning bloqueante;
- dependências de produção sem vulnerabilidade bloqueante pelo audit;
- imagem sem vulnerabilidade `HIGH` ou `CRITICAL` corrigível pelo Trivy;
- imagem base fixada por digest;
- processo não-root `10001:10001`;
- runtime sem configuração pública Supabase;
- filesystem read-only no smoke;
- limites de corpo, timeout, concorrência, processos, CPU e memória;
- CSP e headers HTTP verificados;
- mensagens internas do PostgreSQL sanitizadas;
- resolução de identidade fail-closed e portátil entre versões suportadas do Supabase Auth;
- provider AWS sem fallback para Supabase;
- readiness AWS permanece `503 aws_architecture_pending`.

### Qualidade

- lint determinístico da fonte versionada;
- testes de aplicação, produto e integrações aprovados;
- typecheck aprovado;
- build Next.js aprovado;
- contratos de runtime e configuração aprovados;
- imagem Lambda construída e inspecionada;
- manifesto imutável e evidências arquivadas.

## Drift do ambiente Supabase de testes

O projeto remoto de testes contém migrations ad hoc que não pertencem ao histórico Git aprovado:

- `20260730020728_complete_diagnostic_point_rule`;
- `20260730021001_operator_certificate_template_catalog`;
- `20260730021926_safe_library_content_archiving`;
- `20260730022413_safe_admin_track_archiving`.

Essas alterações não são chamadas pelo candidato aprovado, não estão na allowlist versionada e não foram incorporadas silenciosamente ao release. O banco efêmero da CI, reconstruído somente pelo Git, é a fonte da evidência do Gate A.

Antes de usar novamente o Supabase remoto como ambiente de homologação, deve-se escolher uma destas ações, com revisão explícita:

1. recuperar cada migration para o Git, adicionar contratos e testes e repetir integralmente o Gate A; ou
2. recriar o ambiente de teste a partir do histórico canônico aprovado, preservando qualquer dado necessário por exportação controlada.

A divergência bloqueia a certificação **desse ambiente remoto**, mas não invalida o candidato reproduzido em CI. Nenhuma exclusão remota foi executada automaticamente.

## Gate B — bloqueadores ativos de produção

### P0 — arquitetura e ambiente definitivo

| ID | Estado atual | Lacuna bloqueante | Evidência para encerrar |
|---|---|---|---|
| `AWS-ARCHITECTURE-DECISIONS` | somente AWS como destino e `Dockerfile.lambda` estão aprovados | serviços, topologia, identidade, dados, storage, rede, edge, assíncrono, segredos, observabilidade e operação não definidos | ADRs e arquitetura aprovados, sem inferência automática |
| `AWS-STAGING-ENVIRONMENT` | inexistente | não há ambiente equivalente à futura produção | ambiente criado a partir da arquitetura aprovada e associado ao SHA/digest |
| `AWS-RUNTIME-INTEGRATION` | adapters de produção fail-closed | fronteiras reais de identidade, dados, arquivos e integrações não implementadas | adapters, probes e contratos executando no staging aprovado |
| `REAL-TRANSACTIONAL-E2E` | E2E local do banco aprovado | navegador até dependências definitivas ainda não foi exercitado | fluxos completos com usuários e dados sintéticos no staging AWS |
| `MULTIUSER-ISOLATION` | RBAC/RLS e testes locais aprovados | isolamento negativo entre múltiplas organizações no ambiente final não comprovado | matriz de autorização, BOLA/IDOR e revogação aprovada |

### P0 — capacidade e confiabilidade no ambiente final

| ID | Estado atual | Lacuna bloqueante | Evidência para encerrar |
|---|---|---|---|
| `TRANSACTIONAL-CAPACITY` | container web suporta o gate curto de liveness | não há ramp, spike e soak de leituras e escritas autenticadas | relatório por operação com throughput, p50/p95/p99, erros e saturação |
| `DEPENDENCY-SATURATION` | limites locais aprovados | limites de banco, identidade, arquivos, integrações e processamento ainda desconhecidos | testes de saturação, backpressure e rejeição controlada |
| `ASYNC-INTEGRITY` | eventos e outbox testados no banco | consumidores, retries, dead-letter e reconciliação dependem da arquitetura futura | falha parcial, retry, deduplicação, redrive e reconciliação comprovados |
| `SOAK-AND-RESOURCE-STABILITY` | container curto sem OOM ou restart | estabilidade prolongada e vazamentos não comprovados | soak com memória, conexões, latência e backlog estáveis |

### P0 — segurança, privacidade e operação

| ID | Estado atual | Lacuna bloqueante | Evidência para encerrar |
|---|---|---|---|
| `THREAT-MODEL` | hardening de fonte, banco e imagem aprovado | modelo de ameaças do ambiente definitivo ausente | threat model e mitigação revisados |
| `DISTRIBUTED-ABUSE-PROTECTION` | limiter do gateway Supabase é apenas defesa de preview | proteção distribuída ainda depende da arquitetura | limites por identidade/IP/operação e testes de abuso |
| `CPF-KEY-OPERATIONS` | AES-GCM, HMAC e self-test implementados | custódia, rotação, recuperação e segregação institucionais pendentes | runbook e exercício com chaves não sintéticas |
| `SECURITY-PRIVACY-APPROVAL` | controles técnicos principais presentes | LGPD, retenção, direitos, fornecedores e incidentes ainda sem aprovação final | aprovações técnicas, jurídicas e institucionais |
| `OBSERVABILITY-AND-ONCALL` | logs e métricas locais/CI existem | telemetria, alertas, dashboards e escalonamento dependem do ambiente | detecção e resposta exercitadas |
| `BACKUP-RESTORE-ROLLBACK` | banco reproduzível e imagem imutável | backup, restore, recuperação pontual e rollback não exercitados no destino | exercícios com RTO/RPO e evidências |
| `ACCESSIBILITY-AND-CONTENT` | semântica e testes de produto presentes | conteúdo oficial, teclado, leitor de tela, mídias e WCAG sem aceite final | auditoria e aprovação editorial/assistiva |

## Regras de promoção

O software só pode avançar a staging depois que a arquitetura AWS for decidida. A produção só pode ser liberada quando:

1. o mesmo SHA e digest aprovados no Gate A forem usados;
2. todos os bloqueadores P0 do Gate B forem encerrados;
3. ramp, spike e soak transacionais passarem;
4. isolamento multiusuário e multiorganização passar;
5. observabilidade, backup, restore e rollback forem exercitados;
6. segurança, privacidade, conteúdo e acessibilidade tiverem aprovação aplicável;
7. nenhum Supabase ou Vercel estiver configurado como produção.

## Estado verificável

```text
software_release_candidate_sha = d87ad6346b922f9c1d52639b13e90370814ce363
software_release_gate = passed
software_release_ready = true
required_workflows_green_same_sha = true
canonical_database_replay = 386/386
public_rpc_contract_count = 20
linux_clean_build = passed
windows_clean_build = passed
lambda_container_build = passed
lambda_container_trivy_blocking_scan = passed
lambda_container_capacity_gate = passed
lambda_container_test_rps = 989.04
lambda_container_test_error_rate = 0
lambda_container_test_p95_ms = 85
lambda_container_test_p99_ms = 109
approved_aws_artifacts = [Dockerfile.lambda]
aws_definitive_production_environment = required
aws_production_architecture_decided = false
aws_staging_available = false
aws_transactional_e2e_passed = false
aws_multiuser_capacity_passed = false
aws_backup_restore_rollback_passed = false
aws_production_deploy_allowed = false
supabase_vercel_production_allowed = false
supabase_test_environment_drift = detected
production_ready = false
```

## Conclusão

**O release final do software está aprovado. O deploy final de produção permanece bloqueado.**

Essa distinção é obrigatória: o candidato está íntegro, reproduzível, seguro, testado e empacotável, mas a produção multiusuário só pode ser comprovada depois que a arquitetura AWS definitiva for decidida e o Gate B for executado no ambiente correspondente.
