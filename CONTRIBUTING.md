# Guia de contribuição

Este repositório é a fonte oficial do código da Plataforma Estímulo. `Estimulo_all` e as decisões explícitas posteriores da Estímulo têm precedência sobre código, schemas, mockups e documentos conflitantes.

## Princípios

1. Não realizar commits diretos em `main`.
2. Cada PR deve tratar uma preocupação coesa.
3. Código, migrations, contratos, testes e documentação da mesma capacidade mudam juntos.
4. Nenhuma capacidade é concluída sem evidência executável.
5. Supabase é desenvolvimento/teste; AWS é staging/produção.
6. Regras de domínio não dependem diretamente de SDKs de Supabase ou AWS.
7. Não criar tabelas, adapters ou serviços paralelos sem auditar a lacuna.
8. Dados e eventos novos exigem finalidade, classificação, retenção e decisão HubSpot.
9. Arquivos substituídos são apagados da árvore ativa; o histórico Git é o arquivo histórico.
10. Outputs gerados ficam em artifacts do CI ou arquivos locais ignorados, nunca em `docs/**`.

## Ciclo de vida de branch, issue e PR

### Branch

Criar branch somente quando existir uma mudança concreta que será submetida a PR.

Formato:

```text
<tipo>/<escopo>-<descrição-curta>
```

Tipos permitidos:

- `feat`;
- `fix`;
- `docs`;
- `refactor`;
- `test`;
- `ci`;
- `chore`;
- `security`;
- `hotfix`.

Regras:

- letras minúsculas, números e hífens;
- kebab-case;
- incluir o workstream quando aplicável;
- não usar nome de pessoa, data solta ou termos genéricos;
- reutilizar o branch ativo quando o trabalho pertence ao mesmo PR;
- excluir o branch imediatamente após merge;
- branch substituído deve ter o PR fechado e ser excluído.

Exemplos:

```text
feat/e14-archetype-assignment
fix/web-auth-session-expiry
refactor/database-runtime-recovery
ci/database-migration-replay
```

### Issue

Não criar issue para toda tarefa ou bloqueador.

Uma issue é justificada somente quando pelo menos uma condição existe:

- o trabalho é independente de qualquer PR atual;
- possui responsável ou prazo próprio;
- depende de decisão externa;
- precisa sobreviver a mais de um PR;
- é bug reproduzível que ainda não será corrigido.

Checklist, subtarefa de implementação e bloqueador pertencente a um PR permanecem no PR ou no registro canônico correspondente.

### Pull request

Um PR deve:

- ter mudança concreta e revisável;
- usar título Conventional Commits;
- explicar problema, decisão e impacto;
- declarar efeitos em banco, eventos, dados pessoais, HubSpot e ambientes;
- incluir testes e documentação;
- permanecer draft enquanto gates conhecidos estiverem abertos;
- ser fechado quando substituído;
- não permanecer aberto sem próximo passo executável.

Preferir squash merge.

## Commits e títulos

Formato:

```text
<tipo>(<escopo>): <descrição imperativa>
```

Tipos:

```text
feat fix docs refactor test ci chore security perf build
```

Exemplos:

```text
feat(diagnostics): add versioned archetype assignment
fix(eventing): prevent duplicate outbox delivery
docs(e14): update runtime gap
ci(web): enforce production build
```

Evitar mensagens como `update files`, `changes`, `fix stuff` ou commits com assuntos sem relação.

## Nomenclatura de arquivos

### TypeScript e React

- módulos, utilitários e componentes: kebab-case;
- componentes exportados: PascalCase;
- hooks: `use-<nome>.ts`;
- testes: mesmo nome do alvo com `.test.ts`, `.test.tsx`, `.test.mjs` ou `.spec.ts`;
- nomes reservados do Next.js permanecem conforme o framework;
- segmentos dinâmicos usam o identificador do domínio.

### Documentação

Em `docs/**`:

- documentos humanos canônicos: `UPPER_SNAKE_CASE.md`;
- ADRs: `ADR-NNN-TITULO-EM-KEBAB-MAIUSCULO.md`;
- contratos máquina-legíveis: kebab-case com versão real;
- não usar `final`, `final2`, `novo`, `copia` ou datas como pseudo-versão;
- não versionar output de teste, build, validação, smoke test, scan de integridade ou histórico remoto gerado;
- não criar diretório de arquivo histórico: conteúdo substituído é removido e recuperável pelo Git.

### Migrations

Formato:

```text
YYYYMMDDHHMMSS_mNN[_sufixo]_<descrição_em_snake_case>.sql
```

Regras:

- migration aplicada nunca é editada ou renomeada;
- correção cria nova migration;
- DDL deve ser PostgreSQL-portável salvo adapter documentado;
- nenhuma migration é criada antes do delta de schema;
- replay, RLS, índices e rollback operacional são obrigatórios;
- migrations históricas fora da convenção são mantidas somente para reconciliar versões remotas e devem ser registradas como exceção.

## Artefatos gerados

Nunca versionar:

```text
*-test-output.txt
*-build-output.txt
*-validation-output.json
*-live-validation.json
*-integrity-scan.json
*-remote-migration-history*.json
*.local.*
.artifacts/
```

Exceção: um JSON/YAML é permitido quando é entrada canônica, contrato versionado ou fixture ainda executada por teste ativo.

## Qualidade mínima

Antes da revisão:

```text
instalação reproduzível
higiene do repositório
lint
verificação de tipos
testes unitários e de contrato
build de produção
validação de migrations
validação de eventos
varredura de segredos
documentação sincronizada
```

O repositório ainda não possui lockfile npm canônico. Até resolver isso, a instalação não pode ser descrita como totalmente determinística.

## Banco e ambientes

- Supabase `cfpfeavjlgheqqiaqtzv`: desenvolvimento/teste apenas;
- AWS: staging e produção;
- migrations no Git são a fonte do schema;
- teste no Supabase não substitui AWS staging;
- mudança manual remota não conta como implementação até ser reproduzida por migration e teste.

## Segurança

Nunca versionar:

- chaves, tokens ou senhas;
- dados pessoais reais;
- payloads de produção;
- arquivos `.env`;
- segredos de Supabase, HubSpot ou AWS.

Usar somente dados sintéticos. Toda coleta nova declara finalidade, retenção, acesso e projeção no HubSpot.

## Ordem de revisão

1. aderência a `Estimulo_all` e premissas atuais;
2. segurança, LGPD e integridade;
3. correção funcional;
4. migrations e eventos;
5. manutenibilidade e dependências;
6. testes;
7. documentação e nomenclatura;
8. ausência de arquivos, branches, issues e PRs desnecessários.
