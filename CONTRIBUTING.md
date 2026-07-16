# Guia de contribuição

Este repositório é a fonte oficial do código da Plataforma Estímulo. A especificação do produto segue [docs/product/SOURCE_AUTHORITY_HIERARCHY.md](docs/product/SOURCE_AUTHORITY_HIERARCHY.md).

## Hierarquia obrigatória

```text
1. premissas-desenvolvimento.md
2. demais documentos do pacote para produto, negócio, conteúdo, pedagogia, operação e impacto
3. decisões posteriores explicitamente aprovadas
4. issues do GitHub
5. ADRs, documentação técnica, código e testes
```

Para escolhas estritamente técnicas, usar segurança, evidência dos ambientes, documentação oficial e melhores práticas. Nenhuma escolha técnica pode reduzir requisito superior sem aprovação explícita.

## Princípios

1. Não realizar commits diretos em `main`.
2. Cada PR deve tratar uma preocupação coesa.
3. Código, migrations, contratos, testes, issues e documentação da mesma capacidade mudam juntos.
4. Nenhuma capacidade é concluída sem evidência executável proporcional.
5. Supabase é desenvolvimento/teste; AWS é staging/produção.
6. Regras de domínio não dependem diretamente de SDKs de infraestrutura sem adapter.
7. Não criar tabelas, adapters ou serviços paralelos sem auditar a lacuna.
8. Todas as ações relevantes do usuário geram evento estruturado.
9. Todos os dados do usuário capturados ou usados possuem representação HubSpot.
10. Arquivos substituídos são removidos da árvore ativa; o histórico Git preserva versões.
11. Outputs gerados ficam em artifacts do CI ou arquivos locais ignorados.
12. Lacuna de fonte não é preenchida por heurística silenciosa.

## Branch, issue e PR

### Branch

Criar branch somente para mudança concreta que será submetida a PR.

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

- minúsculas, números e hífens;
- kebab-case;
- escopo claro;
- não usar nome de pessoa ou termos genéricos;
- excluir branch após merge;
- fechar PR substituído.

### Issue

As issues são backlog funcional obrigatório, mas não superam as fontes.

Uma issue deve possuir:

- problema e fonte do requisito;
- experiência ou comportamento esperado;
- critérios de aceite;
- dados/eventos afetados;
- destino HubSpot;
- segurança e privacidade;
- dependências;
- evidência necessária para fechamento.

Uma issue não pode remover ou restringir requisito superior sem decisão aprovada.

### Pull request

Um PR deve:

- ter mudança concreta e revisável;
- usar título Conventional Commits;
- citar a fonte de produto afetada;
- explicar problema, decisão e impacto;
- declarar efeitos em banco, eventos, dados pessoais, HubSpot e ambientes;
- incluir testes e documentação;
- permanecer draft enquanto gates conhecidos estiverem abertos;
- não afirmar conclusão além da evidência;
- ser fechado quando substituído.

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
docs(product): align source authority
ci(web): enforce production build
```

## Nomenclatura

### TypeScript e React

- módulos, utilitários e componentes: kebab-case;
- componentes exportados: PascalCase;
- hooks: `use-<nome>.ts`;
- testes: mesmo nome do alvo com sufixo de teste;
- nomes reservados do Next.js seguem o framework;
- segmentos dinâmicos usam identificadores de domínio.

### Documentação

Em `docs/**`:

- documentos canônicos: `UPPER_SNAKE_CASE.md`;
- ADRs: `ADR-NNN-TITULO-EM-KEBAB-MAIUSCULO.md`;
- contratos legíveis por máquina: kebab-case com versão real;
- não usar `final`, `final2`, `novo`, `copia` ou datas como pseudo-versão;
- não versionar outputs de testes ou scans;
- documentos de produto devem citar a hierarquia de fontes;
- mudança de requisito deve identificar a fonte substituída e a aprovação.

### Migrations

Formato:

```text
YYYYMMDDHHMMSS_mNN[_sufixo]_<descricao_em_snake_case>.sql
```

Regras:

- migration aplicada nunca é editada ou renomeada;
- correção cria nova migration;
- DDL deve ser PostgreSQL-portável salvo adapter documentado;
- nenhuma migration é criada sem delta de schema;
- replay, RLS, índices e recuperação são obrigatórios;
- migrations históricas fora da convenção permanecem apenas para reconciliação.

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

Exceção: entrada canônica, contrato versionado ou fixture usada por teste ativo.

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

O lockfile npm é canônico e deve permanecer sem drift após `npm ci`.

## Banco e ambientes

- Supabase autorizado: desenvolvimento/teste apenas;
- AWS: staging e produção;
- migrations no Git são fonte do schema;
- teste no Supabase não substitui AWS staging;
- mudança manual remota não é implementação até ser reproduzida por código e teste;
- credenciais ficam em secret manager e nunca em documentação.

## Dados e HubSpot

Toda coleta ou uso de dado do usuário deve declarar:

- fonte superior;
- finalidade;
- classificação;
- acesso;
- retenção;
- evento canônico;
- representação HubSpot;
- frequência de sincronização;
- reconciliação;
- teste.

A matriz HubSpot decide como representar a categoria, não se ela será descartada. Exceções precisam de justificativa e aprovação.

## Segurança

Nunca versionar:

- chaves, tokens ou senhas;
- dados pessoais reais;
- payloads de produção;
- arquivos `.env`;
- segredos de Supabase, HubSpot ou AWS;
- valores sensíveis presentes nas fontes.

Segredos expostos devem ser rotacionados e o histórico deve ser verificado.

## Ordem de revisão

1. aderência à hierarquia e à fonte do requisito;
2. segurança, privacidade e integridade;
3. correção funcional;
4. cobertura de dados/eventos/HubSpot;
5. migrations e contratos;
6. manutenibilidade e dependências;
7. testes e evidência real versus sintética;
8. documentação e nomenclatura;
9. ausência de artefatos ou trabalho desnecessário.
