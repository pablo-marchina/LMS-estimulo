# Guia de contribuição

Este repositório é a fonte oficial do código da Plataforma Estímulo. O `Estimulo_all` e as decisões explícitas posteriores fornecidas pela Estímulo têm precedência sobre código, schemas, mockups e documentos conflitantes.

## Princípios

1. Não realizar commits diretos em `main`.
2. Cada pull request deve tratar uma preocupação coesa.
3. Código, migrations, contratos, testes e documentação da mesma capacidade devem mudar juntos.
4. Nenhuma capacidade pode ser declarada concluída sem evidência executável.
5. Supabase é apenas desenvolvimento/teste; AWS é staging/produção.
6. Nenhuma regra de domínio pode depender diretamente de SDKs de Supabase ou AWS.
7. Não criar tabelas, adapters ou serviços paralelos antes de auditar e justificar a lacuna.
8. Dados e eventos novos exigem finalidade, classificação, retenção e decisão de projeção no HubSpot.

## Branches

Formato obrigatório:

```text
<tipo>/<escopo>-<descrição-curta>
```

Tipos permitidos:

- `feat`: nova capacidade funcional;
- `fix`: correção de defeito;
- `docs`: documentação sem mudança de runtime;
- `refactor`: mudança estrutural sem alterar comportamento esperado;
- `test`: testes e provas;
- `ci`: automação de integração e entrega;
- `chore`: manutenção de repositório ou dependências;
- `security`: hardening ou correção de segurança;
- `hotfix`: correção produtiva urgente.

Regras:

- usar apenas letras minúsculas, números e hífens;
- usar kebab-case;
- incluir o workstream quando aplicável: `e14`, `web`, `database`, `hubspot`, `aws`;
- não incluir nome de pessoa, data solta ou termos genéricos como `changes`, `update` ou `test-branch`;
- remover o branch depois do merge.

Exemplos:

```text
feat/e14-archetype-assignment
fix/web-auth-session-expiry
docs/e14-rebaseline-current-premises
refactor/integration-provider-ports
ci/database-migration-replay
security/hubspot-webhook-signature
```

## Commits e títulos de pull request

Usar Conventional Commits:

```text
<tipo>(<escopo>): <descrição imperativa>
```

O escopo é recomendado e deve ser curto. Tipos aceitos em commits e PRs:

```text
feat fix docs refactor test ci chore security perf build
```

Exemplos:

```text
feat(diagnostics): add versioned archetype assignment
fix(eventing): prevent duplicate outbox delivery
docs(e14): record schema delta evidence
ci(web): enforce typecheck and production build
```

Evitar:

- `update files`;
- `changes`;
- `fix stuff`;
- mensagens que descrevem o processo em vez do resultado;
- vários assuntos sem relação no mesmo commit.

## Nomenclatura de arquivos

### Código TypeScript e React

- arquivos de módulos, utilitários e componentes: kebab-case;
- componentes exportados: PascalCase;
- hooks: `use-<nome>.ts`;
- testes: mesmo nome do alvo com `.test.ts`, `.test.tsx` ou `.spec.ts`;
- arquivos reservados pelo Next.js mantêm os nomes exigidos pelo framework: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `route.ts`;
- segmentos dinâmicos seguem o identificador do domínio, como `[stepInstanceId]`.

Exemplos:

```text
archetype-assignment-service.ts
external-content-card.tsx
use-journey-progress.ts
archetype-assignment-service.test.ts
```

### Documentação

Em `docs/**`:

- documentos humanos canônicos: `UPPER_SNAKE_CASE.md`;
- ADRs: `ADR-NNN-TITULO-EM-KEBAB-MAIUSCULO.md`;
- artefatos máquina-legíveis e evidências geradas podem usar kebab-case com versão explícita;
- não usar espaços, acentos ou nomes como `final`, `final2`, `novo` e `copia`;
- uma versão no nome somente é permitida quando o artefato realmente possui contrato versionado.

Exemplos:

```text
SCHEMA_DELTA_E14.md
HUBSPOT_USER_360_PROJECTION.md
ADR-003-HUBSPOT-USER-360.md
e14-schema-validation-v0.2.json
```

### Migrations

Formato:

```text
YYYYMMDDHHMMSS_mNN[_sufixo]_<descrição_em_snake_case>.sql
```

Exemplos:

```text
20260710120000_m15_archetype_assignment_history.sql
20260710121500_m15b_external_content_metadata.sql
```

Regras:

- migrations aplicadas nunca são editadas;
- correções criam uma nova migration;
- DDL e migrations devem ser PostgreSQL-portáveis, salvo adapter explicitamente documentado;
- nenhuma migration é criada antes do delta de schema justificar a mudança;
- toda migration deve possuir replay em banco limpo, teste regressivo, RLS, índices e rollback operacional documentado quando aplicável.

## Pull requests

Um PR deve:

- usar título no formato Conventional Commits;
- explicar problema, decisão e impacto;
- declarar mudanças em banco, eventos, dados pessoais, HubSpot e ambientes;
- incluir evidência de testes e runtime;
- atualizar documentação relacionada;
- permanecer draft enquanto gates conhecidos estiverem abertos;
- não misturar rebaseline de produto, mudança de infraestrutura e implementação funcional sem necessidade atômica.

Preferir squash merge para manter um commit canônico por PR. Exceções exigem justificativa no PR.

## Qualidade mínima

Antes de solicitar revisão:

```text
instalação reproduzível
lint
verificação de tipos
testes unitários e de contrato
build de produção
validação de migrations
validação de schemas de eventos
varredura de segredos
documentação sincronizada
```

O repositório ainda precisa adotar um lockfile npm canônico. Enquanto esse bloqueio estiver aberto, nenhuma instalação deve ser descrita como totalmente determinística.

## Banco e ambientes

- Supabase project ref `cfpfeavjlgheqqiaqtzv`: somente desenvolvimento/teste;
- staging e produção: AWS;
- migrations no Git são a fonte do schema;
- testes no Supabase não substituem o gate do AWS staging;
- alterações remotas manuais devem ser evitadas e, quando inevitáveis para diagnóstico, não contam como implementação até serem reproduzidas por migration e teste.

## Segurança e dados

Nunca versionar:

- chaves, tokens ou senhas;
- dados pessoais reais usados em teste;
- payloads de produção;
- arquivos `.env`;
- segredos do Supabase, HubSpot ou AWS.

Usar dados sintéticos e referências de segredo. Toda nova coleta de usuário precisa declarar finalidade, retenção, acesso e projeção no HubSpot.

## Revisão

A revisão deve verificar, nesta ordem:

1. aderência ao `Estimulo_all` e às premissas atuais;
2. segurança, LGPD e integridade;
3. correção funcional;
4. compatibilidade de migrations e eventos;
5. manutenibilidade e dependências;
6. testes e evidências;
7. documentação e nomenclatura.
