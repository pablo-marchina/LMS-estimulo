# Guia de contribuição

Este repositório é a fonte oficial do código da Plataforma Estímulo. A autoridade documental segue [`SOURCE_AUTHORITY_HIERARCHY.md`](docs/product/SOURCE_AUTHORITY_HIERARCHY.md), e o escopo do HubSpot segue [`DEC-070`](docs/decisions/HUBSPOT_SCOPE_DECISION.md).

## Fluxo de mudança

1. Não fazer commit direto em `main`.
2. Criar uma branch coesa no formato `<tipo>/<escopo>-<descricao>`.
3. Alterar juntos código, migrations, contratos, testes e documentação da mesma capacidade.
4. Abrir PR com título Conventional Commits.
5. Diferenciar implementação, teste sintético, teste real e aprovação de produção.
6. Preferir squash merge e excluir a branch após o merge.

Tipos permitidos:

```text
feat fix docs refactor test ci chore security hotfix
```

Commits e títulos de PR:

```text
<tipo>(<escopo>): <descricao imperativa>
```

## Conteúdo obrigatório do PR

- problema, fonte e comportamento esperado;
- escopo e decisões não óbvias;
- impacto em banco, eventos, dados, HubSpot e ambientes;
- testes executados e limitações da evidência;
- riscos e rollback;
- documentação atualizada.

## Nomenclatura

- TypeScript/JavaScript: arquivos em kebab-case;
- componentes exportados: PascalCase;
- hooks: `use-<nome>.ts`;
- testes: nome semântico do comportamento com sufixo `.test.*`;
- documentos canônicos em `docs/`: `UPPER_SNAKE_CASE.md`;
- contratos legíveis por máquina: kebab-case com versão real;
- migrations: `YYYYMMDDHHMMSS_<descricao_em_snake_case>.sql`, preservando nomes históricos já aplicados.

Migrations aplicadas nunca são editadas. Correções criam novas migrations.

## Qualidade mínima

```text
instalação reproduzível
higiene do repositório
verificação de tipos
testes relevantes
build de produção
replay e contratos de banco quando aplicável
varredura de segredos
documentação sincronizada
```

Comandos principais:

```bash
npm run validate:repository
npm run validate:dependency-lock
npm run test:application-foundation
npm run typecheck:web
npm run build:web
```

Mudanças de banco também executam `npm run test:database-gates`.

## Ambientes e dados

- Supabase é ambiente de desenvolvimento/teste.
- AWS é o destino de staging e produção.
- Dependências físicas permanecem atrás de limites de infraestrutura quando isso já existe; não declarar portabilidade ainda não implementada.
- Dados reais não entram em fixtures, logs, documentos ou testes locais.
- HubSpot recebe somente dados autorizados pela DEC-070.
- Segredos ficam em secret manager ou configuração protegida por ambiente.

## Artefatos proibidos

Não versionar:

```text
.env
.secrets/
.tmp/
.artifacts/
coverage/
relatórios de agentes
outputs de build ou teste
scans gerados
cookies ou sessões
payloads de produção
credenciais, tokens ou chaves
```

O histórico Git e os PRs são o registro de desenvolvimento; o repositório não mantém pastas de planos ou progresso de agentes.
