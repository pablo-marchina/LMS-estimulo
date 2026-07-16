# Guia de contribuição

Este repositório é a fonte oficial do código da Plataforma Estímulo. A especificação do produto segue [SOURCE_AUTHORITY_HIERARCHY.md](docs/product/SOURCE_AUTHORITY_HIERARCHY.md), e o escopo atual do HubSpot segue [DEC-070](docs/decisions/HUBSPOT_SCOPE_DECISION.md).

## Hierarquia obrigatória

```text
1. premissas-desenvolvimento.md
2. demais documentos do pacote para domínios não técnicos
3. decisões posteriores explicitamente aprovadas
4. issues do GitHub
5. ADRs, documentação técnica, código e testes
```

Decisão técnica não reduz requisito superior sem aprovação explícita.

## Princípios

1. Não realizar commits diretos em `main`.
2. Cada PR trata uma preocupação coesa.
3. Código, migrations, contratos, testes, issues e documentação da mesma capacidade mudam juntos.
4. Nenhuma capacidade é concluída sem evidência proporcional.
5. Supabase é desenvolvimento/teste; AWS é staging/produção.
6. Dependências de infraestrutura permanecem atrás de adapters.
7. Não criar serviço paralelo sem auditar a lacuna.
8. Ações relevantes do usuário geram eventos estruturados.
9. Novos dados e eventos recebem classificação conforme DEC-070.
10. Lacunas de fonte não são preenchidas por heurística silenciosa.
11. Outputs gerados ficam em artifacts ou arquivos ignorados.
12. Segredos nunca entram no Git.

## Branch, issue e PR

### Branch

```text
<tipo>/<escopo>-<descricao-curta>
```

Tipos:

```text
feat fix docs refactor test ci chore security hotfix
```

Usar kebab-case, escopo claro e excluir branch após merge.

### Issue

Uma issue deve registrar:

- problema e fonte;
- comportamento esperado;
- critérios de aceite;
- dados e eventos afetados;
- classificação e destino HubSpot;
- segurança e privacidade;
- dependências;
- evidência de fechamento.

### Pull request

Um PR deve:

- possuir mudança concreta;
- usar título Conventional Commits;
- citar a fonte afetada;
- explicar problema, decisão e impacto;
- declarar efeitos em banco, eventos, dados, HubSpot e ambientes;
- incluir testes e documentação;
- diferenciar prova real de sintética;
- não afirmar conclusão além da evidência.

Preferir squash merge.

## Commits

```text
<tipo>(<escopo>): <descricao imperativa>
```

Exemplos:

```text
feat(diagnostics): add versioned assignment
fix(eventing): prevent duplicate delivery
docs(product): align source authority
ci(web): enforce production build
```

## Nomenclatura

### TypeScript e React

- arquivos e módulos: kebab-case;
- componentes exportados: PascalCase;
- hooks: `use-<nome>.ts`;
- testes: mesmo nome do alvo com sufixo de teste;
- nomes reservados do Next.js seguem o framework.

### Documentação

- documentos canônicos: `UPPER_SNAKE_CASE.md`;
- ADRs: `ADR-NNN-TITULO-EM-KEBAB-MAIUSCULO.md`;
- contratos legíveis por máquina: kebab-case com versão real;
- não usar pseudo-versões como `final2`;
- não versionar outputs de teste ou scans;
- mudança de requisito identifica fonte e aprovação.

### Migrations

```text
YYYYMMDDHHMMSS_mNN[_sufixo]_<descricao_em_snake_case>.sql
```

- migration aplicada nunca é editada;
- correção cria nova migration;
- DDL é PostgreSQL-portável salvo adapter documentado;
- nenhuma migration sem delta de schema;
- replay, RLS, índices e recuperação são obrigatórios.

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

Exceção: entrada canônica, contrato versionado ou fixture ativa.

## Qualidade mínima

```text
instalação reproduzível
higiene do repositório
lint
verificação de tipos
testes
build de produção
validação de migrations e eventos
varredura de segredos
documentação sincronizada
```

O lockfile npm deve permanecer sem drift após `npm ci`.

## Banco e ambientes

- Supabase: desenvolvimento/teste;
- AWS: staging e produção;
- migrations no Git: fonte do schema;
- Supabase não substitui AWS staging;
- mudança manual remota exige reprodução em código e teste;
- credenciais ficam em secret manager.

## Dados e HubSpot

Toda coleta ou uso de dado declara:

- fonte e finalidade;
- classificação e sensibilidade;
- acesso e retenção;
- evento canônico;
- classificação HubSpot;
- frequência, reconciliação e teste.

Classificações:

```text
linking_identifier
engagement_signal
calculation_input_or_result
not_synced
```

Somente as três primeiras podem gerar sincronização, com finalidade aprovada.

Ficam fora por padrão:

- estado transacional detalhado;
- conteúdo e configuração editorial;
- payloads brutos sem utilidade;
- binários e URLs assinadas;
- logs, traces, filas, retries, tokens e segredos.

Variáveis de cálculo precisam de origem, versão, definição e governança. Sinais educacionais não decidem crédito sem validação institucional.

## Segurança

Nunca versionar:

- chaves, tokens ou senhas;
- dados pessoais reais;
- payloads de produção;
- arquivos `.env`;
- valores sensíveis das fontes.

Segredos expostos devem ser rotacionados e o histórico verificado.

## Ordem de revisão

1. aderência à hierarquia e à fonte;
2. segurança, privacidade e integridade;
3. correção funcional;
4. eventos e classificação HubSpot;
5. migrations e contratos;
6. manutenibilidade;
7. testes e evidência real versus sintética;
8. documentação;
9. ausência de artefatos desnecessários.
