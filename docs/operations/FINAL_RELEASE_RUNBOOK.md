# Runbook do release final

**Revisado em:** 2026-07-30  
**Estado:** Gate A executável por SHA; Gate B bloqueado até decisão da arquitetura AWS

## Regra central

Existem dois gates independentes:

1. **Gate A — release do software:** comprova que um SHA é íntegro, reproduzível, testado e empacotável;
2. **Gate B — release de produção:** comprova que o mesmo SHA pode operar com múltiplos usuários no ambiente AWS definitivo.

A aprovação do Gate A não autoriza o Gate B. Uma aprovação anterior também não cobre commits posteriores.

## Evidência por SHA

Fonte, lockfile, migrations, contratos, gateway de teste, imagem e resultados devem apontar para o mesmo SHA.

A evidência transitória fica nos workflows e artefatos:

- `release-manifest.json` e checksum;
- conjunto e hashes de migrations;
- logs do replay e dos testes;
- evidência de toolchain Linux e Windows;
- scan da imagem;
- resultado do smoke e da capacidade.

Documentos permanentes não mantêm manualmente SHA, contagens ou benchmarks de um candidato.

## Toolchain fixada

- Node.js `22.23.1`;
- npm `10.9.8`;
- lockfile v3 instalado por `npm ci`;
- versões da aplicação e overrides definidas nos manifests versionados.

Qualquer mudança de toolchain, dependência, migration, contrato, workflow, imagem ou configuração exige nova execução proporcional ao risco.

# Gate A — release do software

## Workflows obrigatórios

No SHA final devem passar:

1. `Repository governance`;
2. `Dependency reproducibility`;
3. `Reproducibility`;
4. `Database gates`;
5. `Web CI`.

Nenhum workflow, job ou passo obrigatório pode ficar ausente, cancelado, ignorado ou vermelho. O PR não pode ser mesclado antes desse estado.

## Ordem canônica

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
13. build e inspeção da imagem de `Dockerfile.lambda`;
14. scan de vulnerabilidades;
15. smoke HTTP e capacidade limitada do artefato;
16. manifesto e hashes imutáveis.

## Integridade

- toda RPC chamada pela aplicação está na fronteira autorizada;
- o gateway valida sessão, identidade e correspondência do ator;
- migrations não dependem de contas, conteúdo ou estado remoto não versionado;
- o replay começa em banco vazio;
- correções de ambientes já migrados usam migrations aditivas e idempotentes;
- idempotency keys incompatíveis, duplicatas e transições inválidas são rejeitadas;
- código, contratos, migrations, testes e documentação descrevem o mesmo comportamento;
- imagem e manifestos apontam para o SHA aprovado.

## Reprodutibilidade

- Linux e Windows usam a mesma toolchain e lockfile;
- o checkout permanece limpo antes e depois da instalação e do build;
- validações de configuração não dependem de chamadas externas não fixadas;
- banco vazio é reconstruído sem o Supabase remoto;
- o artefato pode ser produzido novamente a partir do mesmo SHA.

## Segurança

- histórico Git sem segredo não autorizado;
- dependências e imagem dentro da política de vulnerabilidades;
- imagem por digest, não-root e sem gerenciador de pacotes no runtime;
- filesystem read-only no smoke;
- payload, timeout, concorrência, processos, CPU e memória limitados;
- mensagens internas não são devolvidas aos clientes;
- CSP e headers HTTP verificados;
- Supabase e Vercel restritos a desenvolvimento, teste e preview;
- provider AWS sem fallback para Supabase.

## Capacidade do artefato

O Gate A deve verificar liveness, estabilidade, consumo de recursos, taxa de erros e percentis sob os limites versionados do workflow. Essa prova cobre a imagem web e não representa capacidade transacional de produção.

## Resultado

Quando todos os workflows estiverem verdes no mesmo SHA, ele pode ser marcado como **candidato de software aprovado**. Isso permite preparação de staging, mas não usuários reais.

# Gate B — produção AWS multiusuário

## Pré-condição arquitetural

Antes de implementar ou promover staging, [`AWS_ARCHITECTURE_STATUS.md`](../architecture/AWS_ARCHITECTURE_STATUS.md) deve estar encerrado por ADRs aprovados. O único elemento previamente definido é `Dockerfile.lambda`.

As decisões pendentes abrangem:

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
- vínculo de identidade externa sem duplicação;
- participante e administrador com capacidades corretas;
- isolamento negativo entre organizações;
- diagnóstico, jornada, progresso, avaliação e prática;
- CMS, edição, publicação e histórico;
- upload, download e remoção autorizada;
- eventos, outbox, processamento assíncrono, retry, dead-letter e reconciliação;
- integração externa em sandbox;
- falhas parciais sem corrupção ou duplicação.

## Capacidade e performance

Devem existir cenários representativos com dados e usuários sintéticos:

- ramp progressivo;
- spike acima do pico esperado;
- soak prolongado;
- leitura e escrita autenticadas;
- administração e publicação;
- arquivos e processamento assíncrono;
- múltiplas organizações;
- falha e recuperação de dependências.

Os SLOs e limites finais dependem da arquitetura e da operação aprovadas. O relatório deve incluir throughput, p50, p95, p99, erros por operação, saturação, conexões, memória, backlog, cold starts e custo.

## Segurança, privacidade e acessibilidade

- modelo de ameaças aprovado;
- proteção distribuída contra abuso;
- testes de autorização e isolamento;
- rotação e recuperação de segredos e chaves;
- proteção de dados sensíveis em trânsito e repouso;
- logs e tracing sem CPF, tokens ou conteúdo proibido;
- bases legais, consentimento, retenção, exclusão e direitos aprovados;
- fornecedores e transferências avaliados;
- plano de incidente exercitado;
- acessibilidade e conteúdo aprovados.

## Operação e continuidade

- dashboards e alertas associados aos SLOs;
- on-call e escalonamento definidos;
- runbooks de degradação e reconciliação;
- backup, restore e recuperação pontual comprovados;
- rollback da aplicação exercitado;
- estratégia segura para migrations incompatíveis;
- RTO, RPO, capacidade e custos aprovados.

# Condições de NO-GO

Qualquer item abaixo bloqueia promoção:

- workflow obrigatório não verde no SHA atual;
- migration aplicada diferente do arquivo manifestado;
- replay incompleto;
- RPC usada fora da fronteira autorizada;
- imagem ou deployment diferente do SHA aprovado;
- vulnerabilidade bloqueante ou segredo não rotacionado;
- erro de autorização, isolamento, idempotência ou integridade;
- arquitetura AWS pendente;
- Supabase ou Vercel configurado como produção;
- capacidade ou SLOs não comprovados;
- processamento assíncrono sem retry e reconciliação comprovados;
- observabilidade insuficiente;
- backup, restore ou rollback não exercitado;
- aprovação jurídica, de privacidade, conteúdo ou acessibilidade pendente quando aplicável.
