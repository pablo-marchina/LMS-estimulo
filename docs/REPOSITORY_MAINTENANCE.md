# Manutenção do repositório

Este documento define como manter o repositório organizado sem apagar evidência histórica necessária, enfraquecer gates ou separar documentação do comportamento executável.

## Fontes de verdade

Quando duas fontes divergirem, use esta ordem para decidir o estado vigente:

1. código e configuração executados no SHA avaliado;
2. migrations, contratos e schemas versionados;
3. gates automatizados e testes que validam esses contratos;
4. documentação de implementação e operação;
5. documentação de produto, pesquisa e propostas ainda não materializadas.

`main` representa o estado integrado do repositório. Uma branch ou PR só representa o estado candidato do próprio head. Resultados de outro SHA não podem ser reutilizados como aprovação.

## O que pertence ao Git

Devem permanecer versionados:

- código-fonte e configuração reproduzível;
- migrations e manifests canônicos;
- testes e validadores permanentes;
- documentação necessária para compreender, operar e evoluir o sistema;
- decisões arquiteturais e registros históricos que ainda expliquem o estado atual.

Não devem ser versionados:

- builds, coverage, screenshots, traces e relatórios gerados por teste;
- `artifacts/`, `.artifacts/`, `test-results/`, `playwright-report/` e `blob-report/`;
- estados temporários, arquivos `.local.*`, logs e pacotes locais;
- cookies, sessões, payloads reais, dumps com dados reais ou qualquer segredo;
- gatilhos one-off de deploy e arquivos criados apenas para forçar uma execução externa.

Evidências transitórias devem ser publicadas como artifacts do CI/deploy e vinculadas ao SHA que as produziu.

## Regra para remover ou consolidar arquivos

Antes de remover um arquivo, confirme que ele não é:

- importado ou executado pelo runtime;
- chamado por `package.json`, workflow, script ou runbook;
- usado por teste, migration, replay ou validação de contrato;
- a única documentação de uma decisão ainda vigente;
- necessário para reproduzir um release ou compreender uma compatibilidade intencional.

Compatibilidade legada não é sinônimo de código morto. Uma camada antiga só pode ser removida depois que seus consumidores, contratos e migrations forem identificados e substituídos.

Migrations já aplicadas são imutáveis e nunca entram em uma limpeza destrutiva. Correções de banco são aditivas.

## Ciclo de vida da documentação

`PROJECT_INDEX.md` é o índice canônico da documentação permanente. Todo Markdown em `docs/` deve estar indexado e usar a nomenclatura aceita pelos gates do repositório.

Ao alterar comportamento, estrutura, ambiente, integração, contrato ou operação:

1. atualize a documentação permanente afetada no mesmo PR;
2. remova afirmações que deixaram de ser verdadeiras em vez de acumular notas contraditórias;
3. diferencie claramente estado implementado, proposta e bloqueador;
4. mantenha métricas de CI, SHAs e resultados transitórios fora da documentação permanente;
5. atualize `PROJECT_INDEX.md` ao adicionar, renomear ou remover documentos.

Documentos datados só devem permanecer quando registram uma decisão, operação ou contexto histórico ainda necessário. Caso contrário, o conteúdo deve ser absorvido pelo documento canônico correspondente e o arquivo antigo removido.

## Toolchain e dependências

As versões suportadas devem ser lidas dos arquivos versionados, não copiadas manualmente para vários lugares:

- Node: `.node-version`, `.nvmrc` e `engines`;
- npm: `packageManager` em `package.json`;
- dependências JavaScript: `package.json` + `package-lock.json`;
- Actions: versões ou SHAs definidos nos workflows.

Atualizações de dependências devem preservar reprodutibilidade do lockfile e passar pelos mesmos gates da aplicação.

## Branches e PRs empilhados

O fluxo preferido é um PR coeso contra a branch que realmente contém suas dependências.

Para PR empilhado:

- declare explicitamente a branch-base;
- não replique commits já presentes na dependência;
- após o PR-base ser integrado, reconcilie a branch dependente antes do merge;
- execute novamente os gates no SHA final reconciliado.

Não retargete um PR apenas para fazê-lo parecer independente quando ele contém mudanças que dependem de outra branch.

## Checklist de manutenção

Uma limpeza de repositório está concluída somente quando:

- não remove comportamento ou contrato necessário;
- não deixa arquivo temporário ou evidência gerada versionada;
- não deixa documentação canônica órfã ou link local quebrado;
- não deixa script permanente sem referência;
- mantém migrations e histórico executável íntegros;
- mantém lockfile e toolchain reproduzíveis;
- preserva secret scanning e demais gates;
- atualiza o índice e as regras de contribuição quando a estrutura muda;
- valida o SHA final, e não um antecessor.

O gate `npm run validate:repository` automatiza parte dessas garantias e deve evoluir junto com novas classes de resíduos identificadas no projeto.
