# Guia de contribuição

Este repositório é a fonte oficial do código da Plataforma Estímulo. O estado da arquitetura de produção segue [`AWS_ARCHITECTURE_STATUS.md`](docs/architecture/AWS_ARCHITECTURE_STATUS.md). PostgreSQL é a fonte operacional; integrações futuras consomem contratos e outbox genéricos, sem acoplamento a um CRM específico.

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

Uma migration recém-integrada que nunca passou pelo replay canônico pode ser corrigida antes do próximo release somente quando o arquivo impede reconstrução desde zero, a causa está registrada, existe alinhamento aditivo para ambientes que já receberam a versão e todo o Gate A é repetido.

## Arquitetura de plataforma

```text
Supabase + Vercel = development, test e preview
AWS                = staging e produção definitivos
```

Regras obrigatórias:

- `APP_ENV=staging|production` exige `PLATFORM_RUNTIME_PROVIDER=aws`;
- nenhum adapter AWS pode fazer fallback para Supabase;
- fronteira não decidida ou implementada falha fechado;
- módulos de domínio não importam SDKs de provider diretamente;
- `Dockerfile.lambda` não é arquitetura completa;
- preview Vercel não é descrito como produção;
- serviço AWS específico exige ADR aprovado.

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

## Scripts, dados e integrações

Um script permanente deve ter consumidor explícito em `package.json`, workflow, Docker ou runbook. Testes protegem lógica, contrato, segurança, compatibilidade ou comportamento observável.

- Supabase e Vercel são desenvolvimento, teste e preview.
- AWS é staging e produção após decisão e gates.
- Dados reais não entram em fixtures, logs, documentos ou testes.
- Estado operacional permanece no PostgreSQL.
- Produtores escrevem eventos e outbox genérica; destinos ETL são substituíveis.
- Segredos ficam no mecanismo institucional aprovado.
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
