# ADR-002 — Rebaseline pelas premissas atuais

**Status:** Aceita, com refinamentos posteriores  
**Data:** 2026-07-09  
**Escopo:** E14 e releases posteriores

> **Nota de atualização — 2026-09-01:** este ADR registra as premissas aceitas em 09/07. Decisões posteriores do [`DECISION_LOG.md`](DECISION_LOG.md) refinam pontos de implementação: a integração externa usa outbox neutra e HubSpot não é dependência síncrona (`DEC-070`); o ciclo de vida de jornadas usa uma entidade operacional única `draft ↔ published` (`DEC-076`); e a entrada administrativa usa Google + identidade interna + membership/RBAC, sem domínio de e-mail como ticket isolado (`DEC-077`). Onde houver conflito, prevalecem as decisões posteriores e o runtime executável.

## Contexto

O objetivo da Plataforma Estímulo não é apenas disponibilizar conteúdo: interações relevantes e autorizadas devem gerar evidência estruturada para operação, personalização e pesquisa, mantendo separação entre fatos, inferências e qualquer uso futuro em crédito.

## Premissas que permanecem vigentes

1. o repositório oficial é `pablo-marchina/LMS-estimulo`;
2. Supabase/Vercel são ambientes de desenvolvimento, teste, preview e validação controlada;
3. staging e produção institucionais dependem da arquitetura AWS aprovada;
4. manutenção, clareza arquitetural, documentação atual e práticas de GitHub são requisitos de aceite;
5. ações relevantes só são instrumentadas quando possuem finalidade e contrato;
6. PostgreSQL é a fonte operacional/histórica e integrações externas são assíncronas e desacopladas;
7. o diagnóstico principal é configurável e opera quatro arquétipos sem hardcode metodológico;
8. formulário, regras e resultado do diagnóstico permanecem versionados e auditáveis;
9. a plataforma opera conteúdo próprio e de terceiros por adapters.

## Ambientes e portabilidade

- migrations PostgreSQL versionadas no Git são a fonte única do schema;
- domínio e casos de uso não importam SDKs de provedores como regra arquitetural;
- o provider AWS permanece *fail-closed* enquanto a arquitetura não estiver decidida;
- nenhuma evidência Supabase/Vercel é promoção automática para produção institucional.

## Arquitetura para manutenção

- monólito modular com contextos delimitados;
- dependências explícitas e testadas;
- migrations, contratos, testes e documentação da mesma mudança viajam no mesmo PR;
- não existem duas fontes ativas de verdade para a mesma regra;
- dívida legada pode ser contida por contratos e substituições semânticas auditadas.

## Captura e governança de dados

- evento observado permanece separado de feature, inferência e score;
- evento, mudança de estado e outbox são atômicos quando pertencem ao mesmo comando;
- logs técnicos não são tratados como comportamento do usuário;
- captura sem finalidade, classificação ou retenção aprovada é proibida.

## Integrações externas

A arquitetura vigente não acopla produtores a HubSpot ou qualquer outro destino. A saída passa por eventos/outbox com idempotência, retry e reconciliação. Se HubSpot for habilitado futuramente, `DEC-070` limita as categorias de dados exportáveis e exige minimização. Escritas de negócio nunca dependem da disponibilidade síncrona do destino.

## Diagnóstico e quatro arquétipos

- definições, perguntas, opções, dimensões, perfis e thresholds são dados configuráveis;
- drafts são editáveis e versões publicadas do **diagnóstico** preservam o instrumento utilizado;
- resultados anteriores e entradas usadas permanecem auditáveis;
- a metodologia oficial não pode ser completada por heurística silenciosa;
- uso em crédito permanece proibido sem gates específicos.

## Conteúdo próprio e externo

Conteúdo possui modelo unificado e metadata de propriedade, provider, URL/objeto, direitos, acessibilidade, tracking e fallback. Novos providers entram pela borda da aplicação.

## Qualidade e documentação

- CI valida instalação determinística, arquitetura, testes, build, migrations, contratos e segredos;
- um documento só declara uma capacidade concluída quando houver prova executável correspondente;
- documentação contraditória deve ser atualizada ou marcada como histórica/superada.

## Refinamentos posteriores relevantes

- `DEC-076`: jornada não usa versionamento editorial navegável; o runtime preserva um registro operacional único e compatibilidade física legada.
- `DEC-077`: administração não depende de `@estimulo.org` como decisão única de acesso.
- `DEC-078`: superfície legada congelada pode receber correção semântica aprovada sem crescimento do inventário.

Consulte [`DECISION_LOG.md`](DECISION_LOG.md) para a lista ativa completa.