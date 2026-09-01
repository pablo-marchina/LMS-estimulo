# Manutenção do repositório

Este documento define como manter o repositório organizado, reproduzível e coerente com o comportamento executável.

## Fontes de verdade

Quando duas fontes divergirem, use esta ordem:

1. código e configuração executados no SHA avaliado;
2. migrations, contratos e schemas versionados;
3. gates automatizados e testes;
4. documentação de implementação e operação;
5. documentação de produto e pesquisa.

A documentação explica o sistema; ela não substitui a prova executável.

## O que pertence ao Git

Devem permanecer versionados:

- código-fonte e configuração reproduzível;
- migrations e manifests canônicos;
- testes e validadores permanentes;
- documentação necessária para compreender, operar e evoluir a plataforma;
- decisões arquiteturais ainda vigentes.

Não devem ser versionados como documentação canônica:

- changelogs de PR ou listas de bugs corrigidos;
- release notes datadas;
- relatórios de auditoria pontual;
- listas de bloqueadores de um candidato específico;
- handoffs de uma entrega;
- backlogs derivados de uma execução de advisor;
- registros de rotação de credencial ou incidente;
- resultados de build, coverage, screenshots, traces, métricas ou CI;
- estado temporário, logs, cookies, sessões, dumps ou segredos.

O histórico Git, PRs, GitHub Releases, issues, Actions e os sistemas operacionais apropriados preservam esses registros quando necessários.

## Ciclo de vida da documentação

`PROJECT_INDEX.md` é o índice da documentação permanente. Todo Markdown em `docs/` deve estar indexado.

Ao alterar comportamento, arquitetura, contrato ou operação:

1. atualize o documento canônico que já descreve o assunto;
2. escreva o comportamento como regra vigente, sem narrar a correção que o originou;
3. remova afirmações superadas em vez de empilhar notas temporais;
4. mantenha estado de execução, SHAs, métricas e evidências fora dos documentos permanentes;
5. crie novo documento apenas quando houver uma responsabilidade conceitual durável que não pertença a outro documento;
6. atualize `PROJECT_INDEX.md` quando a estrutura documental mudar.

Um arquivo não permanece em `docs/` apenas para preservar um link histórico. O Git conserva versões anteriores; a documentação canônica precisa ser inequívoca para quem chega sem contexto.

## Nomenclatura documental

Documentos canônicos usam nomes que descrevem o assunto, não o episódio que os criou. São inadequados nomes baseados em:

- data de uma entrega;
- “corrections” ou “fixes”;
- “blockers” de um candidato;
- “handoff”;
- “backlog”;
- “rebaseline” de uma fase;
- lacunas temporárias de conteúdo.

O gate de higiene aplica parte dessas regras automaticamente.

## Migrations e compatibilidade

Migrations aplicadas são imutáveis. Correções de banco são aditivas e passam pelos mesmos gates de replay e equivalência.

Compatibilidade legada não é sinônimo de código morto. Uma superfície só pode ser removida depois que consumidores, contratos e migrations forem identificados e substituídos.

## Toolchain e dependências

Versões suportadas são lidas dos arquivos versionados:

- Node: `.node-version`, `.nvmrc` e `engines`;
- npm: `packageManager` em `package.json`;
- dependências: `package.json` e `package-lock.json`;
- Actions: versões ou SHAs dos workflows.

## Branches e PRs

Mudanças usam branch + pull request. PRs empilhados devem declarar dependências, evitar duplicar commits e ser revalidados depois da reconciliação da base.

`main` representa o estado integrado. Resultados de outro SHA não podem ser reutilizados como aprovação.

## Checklist de manutenção

Uma mudança estrutural está concluída quando:

- comportamento e contratos necessários permanecem íntegros;
- documentação canônica não contém relato transitório de desenvolvimento;
- links locais e índice estão íntegros;
- scripts permanentes têm consumidor conhecido;
- migrations e lockfile continuam reproduzíveis;
- secret scanning e demais gates permanecem ativos;
- o SHA final, e não um antecessor, foi validado.