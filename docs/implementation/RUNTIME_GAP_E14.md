# E14-R1 — Lacuna de fonte de verdade do runtime

**Versão:** 0.3  
**Data:** 2026-07-10  
**Status:** P0 — fonte, replay e equivalência estrutural concluídos; contratos e backend E2E pendentes  
**Ambiente inspecionado:** Supabase de desenvolvimento/teste `cfpfeavjlgheqqiaqtzv`

## 1. Histórico remoto recuperado

A exportação read-only de `supabase_migrations.schema_migrations` foi materializada no Git com versões, nomes, bytes e SHA-256 remotos exatos.

| Grupo | Quantidade | Intervalo | SQL remoto | Fingerprint ordenado |
|---|---:|---|---:|---|
| M00–M12 | 76 | `20260708220357`–`20260709030140` | 411.340 bytes | `663173105a16924db650127f437900de0ad3422b2f7bf50a5e804f19d1a570a3` |
| Runtime M13 | 165 | `20260709051056`–`20260709060330` | 123.636 bytes | `6df68289eb6de6a47f84f6bb8dae0761c75f148132dd99341e739e8f4a62f144` |
| Aplicação M14/M14b | 2 | `20260709183504`–`20260709184749` | 12.045 bytes | `8b3cb9b361f2bbff69d784ef92767de14795f761c1159321e8b163ccde96fde0` |
| **Total executável** | **243** | `20260708220357`–`20260709184749` | **547.021 bytes** | três fingerprints validados separadamente |

Fontes canônicas:

- `supabase/canonical-migrations/M00_M12_RUNTIME_MANIFEST.json`;
- `supabase/canonical-migrations/20260708220357_m00_m12_runtime_canonical.sql`;
- `supabase/canonical-migrations/M13_RUNTIME_MANIFEST.json`;
- `supabase/canonical-migrations/20260709051056_m13_e14_runtime_canonical.sql`;
- `supabase/canonical-migrations/M14_RUNTIME_MANIFEST.json`;
- `supabase/canonical-migrations/20260709183504_m14_application_canonical.sql`;
- 243 arquivos timestampados em `supabase/migrations`.

Os agregados antigos de treze arquivos M00–M12 foram removidos porque não representavam os timestamps nem toda a sequência efetivamente aplicada. Os nove transportes posteriores no intervalo `20260709165813`–`20260709174710` continuam excluídos porque não compõem o runtime final.

## 2. Replay limpo

O workflow `.github/workflows/e14-clean-replay.yml` usa `supabase/postgres:17.6.1.136`, alinhado ao PostgreSQL 17.6 do ambiente remoto.

O executor:

1. rejeita banco que já contenha schemas da aplicação;
2. provisiona somente o catálogo de provedor `supabase_migrations.schema_migrations`, necessário para compilar helpers temporários de exportação;
3. valida os três manifests e seus fingerprints;
4. aplica as 243 migrations na ordem remota;
5. executa cada migration em uma transação própria, preservando tabelas temporárias `ON COMMIT DROP` usadas por migrations de prova e limpeza;
6. falha no primeiro erro SQL e publica diagnóstico somente em caso de falha.

Resultado comprovado pelo CI:

```text
postgres_major = 17
migration_files = 243
transaction_mode = one_transaction_per_migration
clean_replay_passed = true
```

O bootstrap do catálogo do provedor não altera schemas da aplicação e não é uma migration Estímulo. Roles `app_readonly`, `app_runtime` e `app_worker` são criadas pelo próprio histórico remoto recuperado.

## 3. Equivalência estrutural

Após o replay, o CI executa inventário determinístico e compara contagem e SHA-256 com um baseline read-only do Supabase de teste.

Categorias comparadas:

- schemas;
- relações e estado de RLS;
- colunas e defaults;
- constraints;
- índices;
- triggers não internos;
- policies;
- rotinas privadas e RPCs públicos `e14_*`;
- enums e domains.

Resultado:

```text
schemas = equivalent
relations = equivalent
columns = equivalent
constraints = equivalent
indexes = equivalent
triggers = equivalent
policies = equivalent
routines = equivalent
types = equivalent
schema_equivalence_passed = true
```

Objetos internos do provedor são excluídos do hash da aplicação. O catálogo mínimo do Supabase existe apenas para reproduzir migrations que criam e removem RPCs temporários de exportação.

## 4. Integridade permanente

Cada migration recuperada contém cabeçalho de proveniência com versão, nome e hash remoto. Os manifests registram:

- contagem de migrations;
- total de bytes do SQL remoto;
- hash remoto de cada versão;
- hash do arquivo materializado;
- fingerprint do conjunto ordenado;
- hash do SQL canônico consolidado.

Comandos permanentes:

```bash
npm run validate:e14-runtime-history
npm run replay:e14-clean
npm run validate:e14-schema-equivalence
npm run test:e14-clean-replay
```

O CI executa a validação de histórico em todo pull request e o replay completo quando migrations, manifests, scripts de equivalência ou o próprio workflow mudam.

## 5. Gates concluídos e pendentes

```text
remote_versions_missing_locally = 0
local_versions_not_expected_remotely = 0
clean_replay_passed = true
schema_equivalence_passed = true
public_rpc_contracts_passed = false
backend_e2e_replayed = false
```

A equivalência estrutural não substitui testes comportamentais. Antes de nova migration funcional, ainda é obrigatório:

1. congelar assinaturas, grants, códigos de erro e invariantes dos RPCs públicos;
2. executar testes de contrato positivos e negativos;
3. reproduzir o backend E2E da vertical;
4. comprovar RLS, idempotência, concorrência, eventos e outbox.

## 6. Dívida técnica preservada

O runtime recuperado contém helpers privados `app_private.e14_*` com nomes opacos e aliases extensos. A recuperação preserva o comportamento comprovado e não autoriza ampliar esse padrão.

Depois dos contratos e do backend E2E:

1. manter os RPCs públicos estáveis;
2. mapear dependências com `pg_depend`;
3. introduzir helpers internos com nomes semânticos e ownership claro;
4. migrar um caso de uso por vez;
5. testar equivalência de resultado, evento e outbox;
6. remover aliases somente quando não houver chamadas.

## 7. Sequência obrigatória

```text
E14-R1a: recuperar M00–M14 no Git = concluído
→ E14-R1b: provar replay e equivalência estrutural = concluído
→ E14-R1c: mapear e congelar contratos públicos = próximo passo
→ E14-R1d: reproduzir backend E2E e checks negativos
→ refatoração incremental de helpers opacos
→ delta final de schema para arquétipos e conteúdo externo
→ nova migration funcional
```

A numeração da próxima migration funcional somente será definida depois dos contratos e do E2E. Supabase permanece restrito a desenvolvimento/teste; staging e produção permanecem na AWS.
