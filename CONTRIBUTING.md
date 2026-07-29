# Guia de contribuição

Este repositório é a fonte oficial do código da Plataforma Estímulo. O escopo do HubSpot segue a [`DEC-070`](docs/decisions/HUBSPOT_SCOPE_DECISION.md); requisitos, decisões, implementação e bloqueadores devem ser registrados diretamente nos documentos permanentes listados em [`PROJECT_INDEX.md`](PROJECT_INDEX.md).

## Fluxo de mudança

1. Não fazer commit direto em `main`.
2. Criar uma branch coesa no formato `<tipo>/<escopo>-<descricao>`.
3. Alterar juntos código, migrations, contratos, testes e documentação da mesma capacidade.
4. Abrir PR com título Conventional Commits.
5. Diferenciar implementação, teste local, verificação de ambiente e aprovação de produção.
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

- problema e comportamento esperado;
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
- documentos permanentes em `docs/`: `UPPER_SNAKE_CASE.md`;
- contratos legíveis por máquina: kebab-case com versão real;
- migrations: `YYYYMMDDHHMMSS_<descricao_em_snake_case>.sql`, preservando nomes históricos já aplicados.

Migrations aplicadas nunca são editadas. Correções criam novas migrations.

## Qualidade mínima

```text
instalação reproduzível
higiene do repositório
verificação de tipos
testes proporcionais ao risco
build de produção
replay e contratos de banco quando aplicável
varredura de segredos
documentação sincronizada
```

Comandos principais:

```bash
npm run validate:repository
npm run validate:dependency-lock
npm run test:application
npm run test:product
npm run test:integrations
npm run typecheck:web
npm run build:web
```

Mudanças de banco também executam `npm run test:database`.

## Critério para scripts e testes

Um script permanente deve ter consumidor explícito em `package.json`, workflow, Docker, Terraform ou runbook operacional. Um teste deve proteger lógica, contrato, segurança, compatibilidade ou comportamento observável. Scripts órfãos e testes que apenas congelam copy, CSS ou detalhes transitórios de implementação não pertencem ao repositório.

Verificações de ambiente implantado ficam em `scripts/verification/` e nunca introduzem backend, autenticação ou storage sintéticos no runtime da aplicação.

## Ambientes e dados

- Supabase é ambiente de desenvolvimento/teste.
- AWS é o destino de staging e produção.
- Não declarar portabilidade ainda não implementada.
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
referências externas
relatórios de agentes
outputs de build ou teste
scans gerados
cookies ou sessões
payloads de produção
credenciais, tokens ou chaves
```

O histórico Git e os PRs são o registro de desenvolvimento; a árvore ativa contém apenas produto, infraestrutura, operação, testes permanentes e documentação vigente.