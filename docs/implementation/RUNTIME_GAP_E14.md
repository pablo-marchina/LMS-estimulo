# E14-R1 — Lacuna de fonte de verdade do runtime

**Versão:** 0.2  
**Data:** 2026-07-09  
**Status:** P0 — fonte recuperada; replay e equivalência pendentes  
**Ambiente inspecionado:** Supabase de desenvolvimento/teste `cfpfeavjlgheqqiaqtzv`

## 1. Estado atual

A exportação read-only de `supabase_migrations.schema_migrations` foi materializada no Git com versões, nomes, bytes e SHA-256 remotos exatos.

| Grupo | Quantidade | Intervalo | SQL remoto | Fingerprint ordenado |
|---|---:|---|---:|---|
| Runtime M13 | 165 | `20260709051056`–`20260709060330` | 123.636 bytes | `6df68289eb6de6a47f84f6bb8dae0761c75f148132dd99341e739e8f4a62f144` |
| Aplicação M14/M14b | 2 | `20260709183504`–`20260709184749` | 12.045 bytes | `8b3cb9b361f2bbff69d784ef92767de14795f761c1159321e8b163ccde96fde0` |

Fontes canônicas:

- `supabase/canonical-migrations/M13_RUNTIME_MANIFEST.json`;
- `supabase/canonical-migrations/20260709051056_m13_e14_runtime_canonical.sql`;
- `supabase/canonical-migrations/M14_RUNTIME_MANIFEST.json`;
- `supabase/canonical-migrations/20260709183504_m14_application_canonical.sql`;
- 167 arquivos timestampados em `supabase/migrations`.

Os nove transportes/exportações temporários no intervalo `20260709165813`–`20260709174710` não fazem parte do runtime canônico recuperado.

## 2. Reconciliação M14

O banco registra:

```text
20260709183504_m14_step5_application_read_surfaces
20260709184749_m14b_step5_operator_workspace
```

Os arquivos locais divergentes:

```text
20260709183000_m14_step5_application_read_surfaces.sql
20260709184500_m14b_step5_operator_workspace.sql
```

foram substituídos pelos identificadores remotos exatos. O histórico remoto não foi alterado.

## 3. Integridade e validação permanente

Cada migration recuperada contém cabeçalho de proveniência com versão, nome e hash remoto. Os manifests registram:

- contagem de migrations;
- total de bytes do SQL remoto;
- hash remoto de cada versão;
- hash do arquivo materializado;
- fingerprint do conjunto ordenado;
- hash do SQL canônico consolidado.

O comando permanente é:

```bash
npm run validate:e14-runtime-history
```

O CI executa essa validação em todo pull request, além dos testes do materializador e do validador.

## 4. O que foi concluído

```text
read_only_export_completed = true
m13_remote_versions = 165
m13_sql_bytes = 123636
m13_source_in_git = true
m14_remote_versions = 2
m14_sql_bytes = 12045
m14_version_identifiers_match = true
remote_versions_missing_locally = 0
```

A materialização restaura o Git como fonte do SQL aplicado, mas ainda não prova que o repositório inteiro pode ser executado do zero nem que o schema resultante é equivalente ao ambiente remoto.

## 5. Bloqueio restante

Antes de qualquer nova migration funcional, é obrigatório executar em PostgreSQL limpo:

1. todas as migrations locais em ordem;
2. inventário de tabelas, colunas, constraints, índices, triggers, policies e funções;
3. comparação automática com o Supabase de teste;
4. testes de contrato dos RPCs públicos;
5. E2E backend da vertical;
6. checks negativos de RLS, idempotência e concorrência;
7. export de evidência sem segredos.

Gate:

```text
remote_versions_missing_locally = 0
local_versions_not_expected_remotely = 0
clean_replay_passed = true
schema_equivalence_passed = true
public_rpc_contracts_passed = true
backend_e2e_replayed = true
```

## 6. Dívida técnica preservada

O runtime recuperado contém helpers privados `app_private.e14_*` com nomes opacos e aliases extensos. A recuperação deve preservar o comportamento comprovado; ela não autoriza ampliar esse padrão.

Depois da equivalência:

1. manter os RPCs públicos estáveis;
2. mapear dependências com `pg_depend`;
3. introduzir helpers internos com nomes semânticos e ownership claro;
4. migrar um caso de uso por vez;
5. testar equivalência de resultado, evento e outbox;
6. remover aliases somente quando não houver chamadas.

## 7. Sequência obrigatória

```text
E14-R1a: recuperar migrations M13/M14 no Git = concluído
→ E14-R1b: provar replay e equivalência = próximo passo
→ E14-R1c: mapear e congelar contratos públicos
→ refatoração incremental de helpers opacos
→ delta final de schema para arquétipos e conteúdo externo
→ nova migration funcional
```

A numeração da próxima migration funcional somente será definida depois da reconciliação completa. Supabase permanece restrito a desenvolvimento/teste; staging e produção permanecem na AWS.
