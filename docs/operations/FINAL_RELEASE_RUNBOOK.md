# Runbook do release final

**Revisado em:** 2026-07-31  
**Estado:** Gate A executável por SHA; Gate B bloqueado até decisão da arquitetura AWS

## Regra central

Existem dois gates independentes:

1. **Gate A — software:** comprova que um SHA é íntegro, reproduzível, testado e empacotável;
2. **Gate B — produção:** comprova que o mesmo SHA pode operar com usuários reais no ambiente AWS definitivo.

Gate A verde não autoriza produção. Qualquer commit posterior invalida a evidência anterior.

## Evidência por SHA

Fonte, lockfile, migrations, Edge Functions, contratos, imagem e resultados precisam apontar para o mesmo SHA. Evidências transitórias ficam nos workflows e artefatos; documentos permanentes não congelam SHA, contagens ou benchmarks.

## Toolchain

- Node.js `22.23.1`;
- npm `10.9.8`;
- lockfile v3 instalado por `npm ci`;
- PostgreSQL limpo para replay;
- ações de CI fixadas por SHA.

# Gate A — software

## Workflows obrigatórios

1. `Repository governance`;
2. `Dependency reproducibility`;
3. `Reproducibility`;
4. `Database gates`;
5. `Web CI`.

Nenhum job obrigatório pode ficar ausente, cancelado, ignorado ou vermelho. O PR permanece em rascunho enquanto isso ocorrer.

## Ordem canônica

1. checkout limpo do SHA;
2. instalação pelo lockfile;
3. lint, higiene e configuração;
4. contratos de repositório, aplicação, runtime e integrações;
5. testes de aplicação e diagnóstico oficial;
6. teste da outbox/ETL neutra;
7. replay integral das migrations desde banco vazio;
8. equivalência do schema canônico e contratos de RPC;
9. typecheck e build web;
10. build limpo Linux e Windows;
11. build da imagem `Dockerfile.lambda`;
12. secret scanning, audit e scan da imagem;
13. smoke HTTP e capacidade limitada;
14. manifesto e hashes do candidato.

Comandos locais equivalentes:

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run validate:release-candidate
npm run test:repository-tooling
npm run test:application
npm run test:product
npm run test:integrations
npm run test:database
npm run typecheck:web
npm run build:web
npm run scan:secrets
npm run test:secret-scanning
```

## Checklist funcional da suíte

### Administração

- `/admin/configuracoes`: contatos, documentos legais, nova aceitação e temas;
- `/admin/campanhas`: UTMs, destino, período, público e etapas ignoráveis;
- `/admin/b2b`: blocos, rascunho/publicação, usuários e grupos;
- `/admin/recompensas`: catálogo, estoque, período, regulamento e estados;
- `/admin/entregas`: alvo, rubrica, tentativas e modos de IA;
- `/admin/diagnosticos-opcionais`: publicação sem efeito em arquétipo;
- `/admin/comportamento`: score somente analítico;
- `/admin/certificados`: upload PDF/imagem e escopos;
- biblioteca e produto: temas múltiplos, prévia e perguntas rápidas dinâmicas;
- botão de ajuda ausente apenas na administração.

### Participante

- gate de nova aceitação legal;
- link UTM associado após login/cadastro e redirecionamento autorizado;
- vídeo responsivo sem ultrapassar viewport;
- página B2B invisível e inacessível sem concessão;
- conversão 1:1, resgate e histórico de recompensas;
- entrega por texto, link ou arquivo;
- revisão humana quando IA estiver indisponível ou sem confiança;
- diagnóstico opcional sem alterar arquétipo ou jornada;
- evento comportamental sem efeito sobre a experiência.

### Banco

- saldo e estoque de recompensa na mesma transação;
- cancelamento cria compensação e restaura estoque;
- documentos legais e versões publicadas mantêm unicidade;
- temas em uso não são excluídos;
- B2B é filtrado no servidor;
- diagnóstico principal exige mapeamento completo de perfis;
- diagnóstico opcional não escreve em atribuições;
- score não é referenciado por políticas de acesso;
- outbox permanece independente do destino externo.

## Segurança e integridade

- toda RPC usada está na fronteira autorizada;
- gateway valida sessão, identidade e `actor`;
- funções sensíveis têm `SECURITY DEFINER` e `search_path` fechado;
- `anon` e `authenticated` não executam comandos administrativos diretamente;
- arquivos ficam privados e URLs assinadas não são persistidas;
- código/ZIP de entregas não é executado;
- idempotency key divergente é recusada;
- source, migrations, baseline e documentação descrevem o mesmo comportamento;
- nenhum adapter ou segredo de destino externo específico integra o runtime;
- `ETL_EXPORT_ENABLED=false` por padrão.

## Supabase de teste/preview

Depois dos gates locais:

1. comparar migrations do repositório com o histórico conectado;
2. aplicar somente migrations ausentes, na ordem;
3. implantar Edge Functions autenticadas necessárias;
4. verificar ACLs das RPCs e ausência de execução pública;
5. executar advisors de segurança e desempenho;
6. realizar smoke autenticado com dados de teste;
7. não chamar o ambiente de produção.

## Resultado do Gate A

Com os cinco workflows verdes no mesmo SHA, o PR pode ser marcado como pronto e mesclado. O merge produz um candidato de software, não uma autorização para usuários reais.

# Gate B — produção AWS

Antes de staging/produção, [`AWS_ARCHITECTURE_STATUS.md`](../architecture/AWS_ARCHITECTURE_STATUS.md) deve ser encerrado por ADRs. Só estão aprovados AWS como destino e `Dockerfile.lambda` como artefato.

## Provas obrigatórias

- entrada pública, identidade, banco, storage, assíncrono, rede, segredos e observabilidade implementados;
- E2E de cadastro, administração, jornada, biblioteca, entrega, IA, recompensas, B2B, UTM, certificados e diagnósticos;
- isolamento negativo entre organizações;
- concorrência de saldo, estoque, publicação e outbox;
- consumidor ETL em sandbox com retry, dead letter e reconciliação;
- ramp, spike e soak com usuários e dados sintéticos;
- backups, restore, rollback e recuperação pontual exercitados;
- SLOs, alertas, on-call, RTO, RPO e custos aprovados;
- privacidade, bases legais, retenção, acessibilidade e conteúdo aprovados.

# NO-GO

Bloqueiam promoção:

- workflow não verde no SHA atual;
- migration ou Edge Function diferente do arquivo versionado;
- replay ou equivalência incompletos;
- vulnerabilidade bloqueante ou segredo exposto;
- erro de autorização, isolamento, idempotência, saldo ou estoque;
- código de participante executado no servidor de avaliação;
- score comportamental alterando a experiência;
- diagnóstico opcional alterando arquétipo;
- exportação externa habilitada sem consumidor e destino aprovados;
- deployment diferente do SHA aprovado;
- arquitetura AWS pendente;
- Supabase ou Vercel tratados como produção;
- capacidade, observabilidade ou continuidade não comprovadas.
