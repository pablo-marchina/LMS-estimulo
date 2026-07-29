# Guia de contribuição

Este repositório é a fonte oficial do código da Plataforma Estímulo. O escopo HubSpot segue a [`DEC-070`](docs/decisions/HUBSPOT_SCOPE_DECISION.md), e a arquitetura de produção segue a [`DEC-075`](docs/decisions/AWS_PRODUCTION_ARCHITECTURE.md).

## Fluxo de mudança

1. Não fazer commit direto em `main`.
2. Criar branch coesa no formato `<tipo>/<escopo>-<descricao>`.
3. Alterar juntos código, migrations, contratos, testes e documentação da capacidade.
4. Abrir PR com título Conventional Commits.
5. Diferenciar código presente, teste local, evidência de ambiente e aprovação de produção.
6. Preferir squash merge e excluir a branch após o merge.

Tipos permitidos:

```text
feat fix docs refactor test ci chore security hotfix
```

Formato:

```text
<tipo>(<escopo>): <descricao imperativa>
```

## Conteúdo obrigatório do PR

- problema e comportamento esperado;
- escopo e decisões não óbvias;
- impacto em identidade, banco, arquivos, eventos, filas, HubSpot e ambientes;
- provider afetado: `supabase`, `aws` ou ambos;
- testes executados e limitações da evidência;
- riscos e rollback;
- documentação e contrato de plataforma atualizados.

## Nomenclatura

- TypeScript/JavaScript: kebab-case;
- componentes exportados: PascalCase;
- hooks: `use-<nome>.ts`;
- testes: comportamento semântico com sufixo `.test.*`;
- documentos permanentes em `docs/`: `UPPER_SNAKE_CASE.md`;
- contratos legíveis por máquina: kebab-case e versão explícita;
- migrations: `YYYYMMDDHHMMSS_<descricao_em_snake_case>.sql`, preservando nomes já aplicados.

Migrations aplicadas nunca são editadas. Correções criam novas migrations.

## Arquitetura de plataforma

```text
Supabase = desenvolvimento/teste
AWS = staging/produção
```

Produção usa:

```text
Lambda container
API Gateway HTTP API
Cognito/OIDC corporativo
RDS Proxy + RDS PostgreSQL
S3 privado com upload direto
SQS + Lambdas consumidoras + DLQ
Secrets Manager/KMS
CloudWatch/tracing
```

Regras obrigatórias:

- `APP_ENV=production` exige `PLATFORM_RUNTIME_PROVIDER=aws`;
- nenhum adapter AWS pode fazer fallback para Supabase;
- adapters ainda não implementados falham fechado;
- módulos de domínio não importam SDKs Supabase ou AWS diretamente;
- identidade, PostgreSQL, storage e async ficam atrás das fronteiras de plataforma;
- buckets AWS são provisionados por infraestrutura, não por requisição;
- arquivos não atravessam o Lambda web em produção;
- trabalho assíncrono não depende do tempo de vida da requisição;
- recursos AWS corporativos existentes são inventariados antes de criar equivalentes.

Mudanças de arquitetura atualizam, conforme aplicável:

```text
config/platform/aws-production.json
docs/decisions/AWS_PRODUCTION_ARCHITECTURE.md
docs/architecture/AWS_TARGET_ARCHITECTURE.md
docs/architecture/ENVIRONMENT_AND_CLOUD_STRATEGY.md
docs/implementation/APPLICATION_FOUNDATION.md
docs/implementation/DELIVERY_BLOCKERS.md
infra/aws/PLATFORM_INTEGRATION_REQUIREMENTS.md
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
npm run validate:repository
npm run validate:dependency-lock
npm run validate:platform-contract
npm run test:application
npm run test:product
npm run test:integrations
npm run typecheck:web
npm run build:web
```

Mudanças de banco também executam `npm run test:database`. Mudanças AWS precisam construir `Dockerfile.lambda` e manter a readiness fail-closed.

## Scripts e testes

Um script permanente deve ter consumidor explícito em `package.json`, workflow, Docker, infraestrutura ou runbook. Um teste deve proteger lógica, contrato, segurança, compatibilidade ou comportamento observável.

Scripts órfãos e testes que apenas congelam copy, CSS ou detalhes transitórios não pertencem ao repositório.

Verificações de ambiente implantado ficam em `scripts/verification/` e nunca introduzem backend, autenticação, banco ou storage sintéticos.

## Ambientes e dados

- Supabase é desenvolvimento/teste somente.
- AWS é staging/produção somente.
- Não declarar adapter, recurso ou portabilidade como implementado sem evidência.
- Dados reais não entram em fixtures, logs, documentos ou testes locais.
- HubSpot recebe somente dados autorizados pela DEC-070.
- Secrets ficam em Secrets Manager/KMS ou solução corporativa equivalente.
- Não criar infraestrutura paralela antes do inventário corporativo.

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

O histórico Git e os PRs preservam o desenvolvimento; a árvore ativa contém apenas produto, código, infraestrutura, operação, testes permanentes e documentação vigente.
