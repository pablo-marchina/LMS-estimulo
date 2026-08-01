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
- documentação permanente descreve comportamento vigente e decisões ativas, não resultados transitórios de CI.

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
coverage/
outputs de build ou teste
cookies ou sessões
payloads reais
credenciais, tokens ou chaves
```
