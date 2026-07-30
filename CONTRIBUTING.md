# Guia de contribuição

Este repositório é a fonte oficial do código da Plataforma Estímulo. O escopo HubSpot segue a [`DEC-070`](docs/decisions/HUBSPOT_SCOPE_DECISION.md), e o estado da produção segue [`AWS_ARCHITECTURE_STATUS.md`](docs/architecture/AWS_ARCHITECTURE_STATUS.md).

## Fluxo de mudança

1. Não fazer commit direto em `main`.
2. Criar branch coesa no formato `<tipo>/<escopo>-<descricao>` ou `release/YYYY-MM-descricao`.
3. Alterar juntos código, migrations, contratos, testes e documentação da capacidade.
4. Abrir PR com título Conventional Commits.
5. Diferenciar código presente, teste local, evidência de ambiente e aprovação de produção.
6. Não mesclar enquanto qualquer workflow obrigatório do SHA atual estiver ausente, cancelado, ignorado ou vermelho.
7. Preferir squash merge e excluir a branch após o merge.

Tipos permitidos:

```text
feat fix docs refactor test ci chore security hotfix perf build release
```

Formato:

```text
<tipo>(<escopo>): <descricao imperativa>
```

## Conteúdo obrigatório do PR

- problema e comportamento esperado;
- escopo e decisões não óbvias;
- impacto em identidade, banco, arquivos, eventos, filas, integrações e ambientes;
- provider afetado: `supabase`, `aws` ou ambos;
- testes executados e limitações da evidência;
- riscos e rollback;
- documentação e contrato de plataforma atualizados;
- lista dos workflows obrigatórios e estado no SHA final.

## Evidência e estado

- o status de release pertence aos workflows e artefatos do SHA avaliado;
- documentos permanentes não congelam SHA, contagem de migrations, quantidade de RPCs ou métricas de carga;
- aprovação de um commit anterior não cobre alterações posteriores;
- preview pronto não substitui replay, testes, typecheck, build, scan ou Gate B;
- um merge não pode ser justificado por evidência de outro SHA.

## Nomenclatura

- TypeScript/JavaScript: kebab-case;
- componentes exportados: PascalCase;
- hooks: `use-<nome>.ts`;
- testes: comportamento semântico com sufixo `.test.*`;
- documentos permanentes em `docs/`: `UPPER_SNAKE_CASE.md`;
- contratos legíveis por máquina: kebab-case e versão explícita;
- migrations: `YYYYMMDDHHMMSS_<descricao_em_snake_case>.sql`, preservando nomes já aplicados.

### Imutabilidade de migrations

Uma migration que pertence a um candidato já aprovado por replay canônico nunca é editada. Correções criam migrations aditivas.

Uma migration recém-integrada que nunca passou pelo replay canônico do Gate A pode ser corrigida antes do próximo release somente quando:

1. o arquivo atual impede a reconstrução desde zero;
2. a causa e a alteração estão documentadas no PR;
3. existe migration aditiva e idempotente para alinhar ambientes de teste onde a versão defeituosa já foi aplicada;
4. todo o Gate A é repetido no SHA corrigido.

Validações comportamentais que dependem de conteúdo usam fixtures controladas depois do replay estrutural.

## Arquitetura de plataforma

```text
Supabase + Vercel = development, test e preview
AWS                = staging e produção definitivos
```

Decisões AWS vigentes:

- AWS será o ambiente definitivo de produção;
- a aplicação será empacotada por `Dockerfile.lambda`;
- Supabase e Vercel não podem ser produção nem fallback.

As demais escolhas — entrada pública, identidade, banco, armazenamento, assíncrono, rede, segredos, observabilidade, deploy e continuidade — permanecem pendentes e exigem ADR aprovado.

Regras obrigatórias:

- `APP_ENV=staging|production` exige `PLATFORM_RUNTIME_PROVIDER=aws`;
- nenhum adapter AWS pode fazer fallback para Supabase;
- fronteira ainda não decidida ou implementada falha fechado;
- módulos de domínio não importam SDKs de provider diretamente;
- `Dockerfile.lambda` não é tratado como arquitetura completa;
- preview Vercel não é promovido ou descrito como produção;
- serviço AWS específico não entra em código, configuração ou documentação como decisão vigente antes do ADR.

Mudanças da fronteira de produção atualizam, conforme aplicável:

```text
config/platform/aws-production.json
docs/architecture/AWS_ARCHITECTURE_STATUS.md
docs/architecture/ENVIRONMENT_AND_CLOUD_STRATEGY.md
docs/decisions/DECISION_LOG.md
docs/implementation/APPLICATION_FOUNDATION.md
docs/implementation/DELIVERY_BLOCKERS.md
docs/operations/FINAL_RELEASE_RUNBOOK.md
```

## Qualidade mínima

```text
instalação reproduzível
higiene do repositório
contrato de plataforma
verificação de tipos
testes proporcionais ao risco
build web e Lambda
replay e contratos de banco
varredura de segredos
documentação sincronizada
```

Comandos principais:

```bash
npm run validate:release-candidate
npm run test:repository-tooling
npm run test:application
npm run test:product
npm run test:integrations
npm run test:database
npm run typecheck:web
npm run build:web
npm run scan:secrets
```

Mudanças de produção precisam construir `Dockerfile.lambda` e manter `/api/health/ready` fail-closed enquanto a arquitetura estiver pendente.

## Scripts e testes

Um script permanente deve ter consumidor explícito em `package.json`, workflow, Docker ou runbook. Um teste deve proteger lógica, contrato, segurança, compatibilidade ou comportamento observável.

Scripts órfãos e testes que apenas congelam copy, CSS ou detalhes transitórios não pertencem ao repositório.

Verificações de ambiente implantado ficam em `scripts/verification/` e nunca introduzem backend, autenticação, banco ou storage sintéticos.

## Ambientes e dados

- Supabase e Vercel são desenvolvimento, teste e preview somente.
- AWS é staging e produção somente, após decisão e gates.
- Não declarar adapter, recurso ou portabilidade como implementado sem evidência.
- Dados reais não entram em fixtures, logs, documentos ou testes locais.
- HubSpot recebe somente dados autorizados pela DEC-070.
- Segredos ficam no mecanismo institucional aprovado; nenhum serviço específico é presumido antes do ADR.
- Não criar infraestrutura paralela antes das decisões arquiteturais.

## Artefatos proibidos

```text
.env
.secrets/
.tmp/
.artifacts/
coverage/
referências externas
relatórios de agentes
outputs de build ou teste
scans gerados
cookies ou sessões
payloads de produção
credenciais, tokens ou chaves
```

O histórico Git e os PRs preservam o desenvolvimento; a árvore ativa contém apenas produto, código, operação, testes permanentes e documentação vigente.
