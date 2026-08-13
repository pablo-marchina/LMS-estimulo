# Guia de contribuição

Este repositório é a fonte oficial do código da Plataforma Estímulo. Código, migrations, contratos, testes e documentação devem permanecer sincronizados.

## Fluxo padrão

1. Criar branch coesa no formato `<tipo>/<escopo>-<descricao>`.
2. Alterar juntos código, migrations, testes e documentação da capacidade.
3. Abrir PR com título Conventional Commits.
4. Diferenciar código presente, teste local, evidência de ambiente e aprovação institucional.
5. Mesclar somente depois dos gates aplicáveis ao SHA final.
6. Preferir squash merge e excluir a branch.

Commits diretos em `main` são uma exceção operacional. Exigem autorização explícita do proprietário e não dispensam revisão do diff, testes, build, verificação de banco, documentação e acompanhamento do deploy.

PRs empilhados devem declarar a branch-base da qual dependem. Depois que o PR-base for integrado, a branch dependente deve ser reconciliada e todos os gates devem rodar novamente no SHA final antes do merge. Não retargete uma branch dependente apenas para ocultar sua dependência.

Tipos permitidos:

```text
feat fix docs refactor test ci chore security hotfix perf build release
```

Formato:

```text
<tipo>(<escopo>): <descricao imperativa>
```

## Evidência e estado

- o status de release pertence ao SHA avaliado;
- preview pronto não substitui replay, testes, typecheck, build ou scans;
- uma aprovação anterior não cobre mudanças posteriores;
- documentação permanente descreve comportamento vigente e decisões ativas, não resultados transitórios de CI;
- screenshots, traces, relatórios e resultados de navegador pertencem aos artifacts do workflow/deploy, não ao Git.

## Documentação e manutenção

[`PROJECT_INDEX.md`](PROJECT_INDEX.md) é o índice canônico da documentação permanente. A política completa de organização, limpeza e ciclo de vida está em [`docs/REPOSITORY_MAINTENANCE.md`](docs/REPOSITORY_MAINTENANCE.md).

Ao alterar comportamento, estrutura, ambiente, integração, contrato ou operação:

1. atualize a documentação afetada no mesmo PR;
2. atualize `PROJECT_INDEX.md` ao adicionar, renomear ou remover Markdown em `docs/`;
3. substitua afirmações obsoletas em vez de acumular versões contraditórias;
4. mantenha SHAs, métricas de CI e evidências transitórias fora dos documentos permanentes;
5. só remova compatibilidade legada depois de comprovar que runtime, testes, contracts e migrations não dependem dela.

## Nomenclatura

- TypeScript/JavaScript: kebab-case;
- componentes exportados: PascalCase;
- testes: sufixo `.test.*`;
- documentos permanentes: `UPPER_SNAKE_CASE.md`;
- migrations: `YYYYMMDDHHMMSS_descricao_em_snake_case.sql`.

### Migrations

Migrations aplicadas são imutáveis. Correções usam migrations aditivas, validadas em transação revertida antes da aplicação.

## Arquitetura de plataforma

O runtime Supabase/Vercel está ativo para desenvolvimento, demonstração e validação. AWS continua como destino institucional planejado e permanece bloqueado até decisão e implementação da arquitetura completa.

- nenhum segredo pode chegar ao browser;
- funções privilegiadas exigem autorização explícita e `search_path` fechado;
- nenhuma fronteira AWS pode fazer fallback silencioso;
- um serviço AWS específico exige decisão registrada.

## Qualidade mínima

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

## Artefatos proibidos

```text
.env
.secrets/
.tmp/
.artifacts/
artifacts/
test-results/
playwright-report/
blob-report/
coverage/
outputs de build ou teste
cookies ou sessões
payloads reais
credenciais, tokens ou chaves
gatilhos one-off de deploy
```
