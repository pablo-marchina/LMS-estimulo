# Runbook do release final

**Revisado em:** 2026-07-29  
**Estado:** gate de software executável; deploy de produção bloqueado pela arquitetura AWS

## Regra central

Existem dois gates independentes:

1. **release do software** — comprova que um SHA é íntegro, reproduzível, testado e empacotável;
2. **release de produção** — comprova que esse mesmo SHA pode operar com múltiplos usuários no ambiente AWS definitivo.

A aprovação do primeiro não autoriza o segundo.

## Candidato único

O candidato deve partir de uma única branch `release/YYYY-MM-descricao`. Fonte, lockfile, migrations, gateway de teste, imagem, manifestos e resultados precisam registrar o mesmo SHA.

## Toolchain fixada

- Node.js `22.23.1`;
- npm `10.9.8`;
- Next.js `16.2.12`;
- Sharp `0.35.3` por override;
- PostCSS `8.5.23` por override;
- lockfile v3 instalado exclusivamente por `npm ci`.

Qualquer mudança nesses componentes exige repetição integral dos gates.

# Gate A — release do software

## Ordem obrigatória

1. checkout do SHA exato com árvore limpa e line endings determinísticos;
2. `npm ci --ignore-scripts --no-audit --no-fund`;
3. `npm run validate:release-candidate`;
4. `npm run test:repository-tooling`;
5. `npm run test:application`;
6. `npm run test:product`;
7. `npm run test:integrations`;
8. reconstrução do PostgreSQL desde zero;
9. equivalência de schema, contratos públicos e `npm run test:database`;
10. `npm run typecheck:web`;
11. `npm run build:web`;
12. secret scanning e audit de dependências;
13. build da imagem de `Dockerfile.lambda` por digest;
14. scan de vulnerabilidades e inspeção não-root/read-only;
15. smoke de `/api/health/live` e comprovação de que `/api/health/ready` permanece fechado no provider AWS pendente;
16. geração de manifesto e hashes.

Nenhum passo obrigatório pode ficar `skipped`, cancelado ou vermelho.

## Integridade

- toda RPC chamada pela aplicação está na allowlist do gateway de teste;
- o gateway valida sessão, identidade e correspondência do ator;
- migrations estruturais não dependem de conteúdo editorial mutável;
- o replay começa em banco vazio e termina com todos os gates aprovados;
- idempotency keys incompatíveis, duplicatas e transições inválidas são rejeitadas;
- código, contratos, migrations e documentação descrevem o mesmo comportamento;
- a imagem e os manifestos apontam para o SHA aprovado.

## Reprodutibilidade

- Linux e Windows usam a mesma toolchain e lockfile;
- o checkout permanece limpo antes e depois da instalação e do build;
- nenhum download não fixado ou chamada externa ocorre durante validação de configuração;
- artefatos são produzidos novamente a partir do mesmo SHA;
- banco vazio é reconstruído sem depender de estado remoto.

## Segurança da fonte e da imagem

- histórico Git sem segredo não autorizado;
- dependências sem vulnerabilidade corrigível incompatível com a política;
- imagem por digest, não-root e sem gerenciador de pacotes no runtime;
- filesystem read-only no smoke;
- payload, timeout, concorrência e fila limitados;
- mensagens internas não são devolvidas aos clientes;
- CSP e headers HTTP verificados;
- Supabase e Vercel permanecem restritos a teste/preview;
- o provider AWS não faz fallback para Supabase.

## Resultado do Gate A

Quando todos os passos estiverem verdes, o SHA pode ser marcado como **candidato de software aprovado**. Isso permite revisão e preparação de staging, mas não usuários reais.

# Gate B — produção AWS multiusuário

## Pré-condição arquitetural

Antes de implementar ou promover produção, [`AWS_ARCHITECTURE_STATUS.md`](../architecture/AWS_ARCHITECTURE_STATUS.md) deve estar encerrado por ADRs aprovados. O único elemento previamente definido é `Dockerfile.lambda`.

Os ADRs precisam resolver:

- entrada pública e proteção de borda;
- identidade e sessão;
- banco e gerenciamento de conexões;
- armazenamento privado e uploads;
- processamento assíncrono e reconciliação;
- rede e isolamento de ambientes;
- segredos, criptografia e rotação;
- observabilidade e operação;
- deploy, promoção, rollback e continuidade.

## E2E transacional

No mesmo SHA e digest aprovados, staging deve comprovar:

- cadastro, confirmação, login, refresh, logout e recuperação;
- vínculo da identidade externa com a conta interna sem duplicação;
- participante e administrador com capacidades corretas;
- isolamento negativo entre organizações;
- diagnóstico, jornada, progresso, avaliação e prática;
- CMS, edição, publicação e imutabilidade histórica;
- upload, inspeção, download e remoção autorizada;
- eventos, outbox, processamento assíncrono, retry, dead-letter e reconciliação;
- integração externa em sandbox;
- falhas parciais sem corrupção ou duplicação.

## Capacidade e performance

O teste curto de liveness não atende este gate. Devem existir cenários representativos com dados e usuários sintéticos:

- ramp progressivo;
- spike acima do pico esperado;
- soak prolongado;
- concorrência autenticada de leitura e escrita;
- carga administrativa e publicação;
- arquivos e processamento assíncrono;
- múltiplas organizações;
- falha e recuperação de dependências.

SLOs iniciais, sujeitos à aprovação do produto e da operação:

- erro HTTP não esperado ≤ 1%;
- p95 de rota dinâmica ≤ 2 segundos;
- p99 ≤ 5 segundos;
- nenhuma perda de escrita confirmada;
- nenhum crescimento sustentado de backlog crítico;
- rejeição controlada sob sobrecarga;
- readiness fecha quando dependência obrigatória falha;
- soak sem crescimento contínuo de memória, conexões ou latência.

Os resultados precisam incluir throughput, p50, p95, p99, erros por operação, saturação, conexões, memória, backlog, cold starts e custo estimado.

## Segurança e privacidade

- modelo de ameaças aprovado;
- rate limiting e abuse protection distribuídos;
- testes de autorização e isolamento entre organizações;
- rotação e recuperação de segredos e chaves;
- proteção de dados sensíveis em trânsito e repouso;
- logs e tracing sem CPF, tokens ou conteúdo proibido;
- bases legais, consentimento, retenção, exclusão e direitos dos titulares aprovados;
- fornecedores e transferências avaliados;
- plano de incidente exercitado;
- acessibilidade e segurança de conteúdo aprovadas.

## Operação e continuidade

- dashboards e alertas associados aos SLOs;
- on-call e escalonamento definidos;
- runbooks de degradação e reconciliação;
- backup, restore e recuperação pontual comprovados;
- rollback de aplicação exercitado;
- estratégia segura para migrations incompatíveis;
- RTO e RPO aprovados;
- capacidade e custos com limites e alertas.

# Condições de NO-GO

Qualquer item abaixo bloqueia promoção:

- workflow obrigatório ausente, cancelado, ignorado ou não verde;
- migration aplicada diferente do arquivo manifestado;
- replay de banco incompleto;
- RPC usada fora da fronteira autorizada;
- imagem ou deployment diferente do SHA aprovado;
- vulnerabilidade bloqueante ou segredo não rotacionado;
- erro de autorização, isolamento, idempotência ou integridade;
- arquitetura AWS ainda pendente;
- Supabase ou Vercel configurado como produção;
- capacidade ou SLOs não comprovados;
- backlog sem processamento e reconciliação comprovados;
- observabilidade insuficiente para detectar falhas;
- backup, restore ou rollback não exercitado;
- aprovação jurídica, privacidade, conteúdo ou acessibilidade pendente quando aplicável.

# Evidência arquivada

## Gate A

- SHA e `release-manifest.json`;
- hashes das migrations e contratos;
- logs do replay e gates SQL;
- resultados dos testes, typecheck e build;
- digest, SBOM quando disponível e scan da imagem;
- secret scanning e audit de dependências;
- evidência de toolchain Linux e Windows.

## Gate B

- ADRs e diagrama da arquitetura aprovada;
- IDs e configuração dos ambientes;
- relatório E2E transacional;
- relatório de isolamento e segurança;
- resultados de ramp, spike e soak;
- dashboards e alertas;
- registros de backup, restore, rollback e incidente;
- aprovações institucionais aplicáveis.
