# Histórico executável de migrations

**Revisado em:** 2026-07-30  
**Estado:** histórico canônico versionado; replay avaliado por SHA

## Decisão

`supabase/migrations/` é a única sequência executável para reconstruir o PostgreSQL da aplicação. O Supabase remoto não é fonte de criação do banco e não pode fornecer pré-condições ocultas ao replay.

O histórico possui duas categorias:

1. **faixas recuperadas:** migrations originalmente aplicadas no ambiente de teste e congeladas por manifests em `supabase/canonical-migrations/`;
2. **migrations ativas:** mudanças posteriores, ordenadas por timestamp e validadas por `validate-active-migrations.mjs`.

Contagens, versões finais e fingerprints ficam nos manifests e artefatos do CI, não neste documento.

## Fontes canônicas

```text
supabase/migrations/
supabase/canonical-migrations/
scripts/database/migration-history/
scripts/database/equivalence/
```

Os manifests recuperados fixam ordem, nome, tamanho e hash das faixas históricas. As migrations ativas preservam uma fronteira explícita e crescente.

## Histórico não equivale a runtime ativo

Migrations antigas podem conter estruturas de experimentos ou subsistemas posteriormente desativados. A presença de tabela, função, extensão ou configuração no histórico não comprova que:

- exista consumidor no código atual;
- haja scheduler ou worker ativo;
- a Edge Function correspondente esteja versionada;
- a capacidade esteja habilitada no ambiente;
- o componente esteja aprovado para produção.

O estado ativo é definido conjuntamente por consumidores, gateway, configuração, testes e documentação vigente. Componentes removidos permanecem inacessíveis ou inativos até uma migration de limpeza segura, quando aplicável.

## Regras de alteração

- migration pertencente a candidato aprovado por replay canônico nunca é editada;
- correções normais usam migration aditiva e idempotente;
- migrations estruturais não dependem de contas, dados editoriais ou estado remoto;
- fixtures comportamentais são criadas depois do replay e revertidas ou descartadas com o banco efêmero;
- mudanças de Dashboard remoto sem migration correspondente são drift não aprovado;
- segredos, endpoints e decisões físicas de infraestrutura não entram em migrations;
- extensões ou roles exigidas devem ser declaradas e verificadas pelo ambiente alvo aprovado.

### Exceção antes do primeiro replay aprovado

Uma migration recém-integrada que nunca passou pelo replay canônico pode ser corrigida somente para restaurar a reconstrução desde zero. Ambientes onde a versão defeituosa já foi aplicada recebem uma migration aditiva de reconciliação. Todo o Gate A deve ser repetido.

## Replay

O replay:

1. inicia em PostgreSQL vazio compatível;
2. executa migrations em ordem, com falha fechada;
3. registra diagnóstico da migration que falhou;
4. valida inventário e equivalência do schema;
5. valida contratos públicos;
6. executa E2E e suítes de domínio com fixtures sintéticas.

Comandos canônicos:

```bash
npm run validate:migration-history
npm run replay:database-clean
npm run validate:schema-equivalence
npm run validate:public-rpc-contracts
npm run test:database
```

## Equivalência

A assinatura canônica cobre, conforme o validador versionado:

- schemas, relações e RLS;
- colunas e tipos;
- constraints e índices;
- triggers e policies;
- rotinas e grants;
- enums e demais tipos relevantes.

Alterar a baseline somente para aceitar uma divergência é proibido. Toda diferença deve ser explicada por migration revisada e comportamento esperado.

## Portabilidade

O modelo lógico PostgreSQL, migrations, roles, grants, RLS, eventos e outbox devem permanecer portáveis para o banco escolhido pela futura arquitetura AWS. Nenhuma tecnologia, serviço ou mecanismo de conexão é presumido antes de ADR.

O staging futuro deve repetir:

- replay completo;
- extensões e roles;
- equivalência;
- contratos e E2E;
- concorrência e isolamento;
- backup, restore e estratégia de migration.

## Evidência

O resultado do replay pertence ao workflow do SHA avaliado. Documentos permanentes não mantêm manualmente número de migrations, último timestamp, bytes, hashes ou estado `passed`.
