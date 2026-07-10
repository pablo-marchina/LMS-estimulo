# E14 runtime source recovery

Ferramentas para recuperar no Git o histórico de migrations já aplicado ao Supabase de desenvolvimento/teste. Elas não aplicam DDL, não modificam o histórico remoto e não promovem Supabase a produção.

## Ambiente autorizado

```text
project_ref = cfpfeavjlgheqqiaqtzv
environment = development_test_only
production = AWS
```

## Segurança

- exportação em transação read-only;
- credencial dedicada somente leitura;
- segredo somente em variável de ambiente ou GitHub Actions secret;
- exports brutos com sufixo `.local.jsonl`;
- exports brutos removidos antes do upload do artifact;
- SHA-256 por migration e para o conjunto ordenado;
- nenhum commit ou push automático;
- nenhum acesso a dados de participantes.

Secret esperado no GitHub:

```text
E14_SUPABASE_DB_URL_READ_ONLY
```

A role deve conseguir apenas conectar, ler `supabase_migrations.schema_migrations`, executar `extensions.digest` e usar transações read-only.

## Workflow manual

```text
.github/workflows/e14-runtime-history-export.yml
```

Depois que o workflow estiver na `main`:

1. abrir **Actions**;
2. selecionar **E14 runtime history export**;
3. executar manualmente;
4. informar `cfpfeavjlgheqqiaqtzv` no campo de confirmação;
5. revisar o artifact antes de criar qualquer PR de materialização.

## Exportação local M13

### PowerShell

```powershell
$env:PGOPTIONS = "-c default_transaction_read_only=on"
$ExportFile = ".artifacts/e14/m13-migration-history.local.jsonl"
New-Item -ItemType Directory -Force (Split-Path $ExportFile) | Out-Null

psql $env:E14_SUPABASE_DB_URL_READ_ONLY `
  -X -q -A -t `
  -v ON_ERROR_STOP=1 `
  -v from_version=20260709051056 `
  -v to_version=20260709060330 `
  -f scripts/e14/runtime-source-recovery/export-migration-history.sql |
  Set-Content -Path $ExportFile -Encoding utf8
```

### Bash

```bash
export PGOPTIONS='-c default_transaction_read_only=on'
mkdir -p .artifacts/e14

psql "$E14_SUPABASE_DB_URL_READ_ONLY" \
  -X -q -A -t \
  -v ON_ERROR_STOP=1 \
  -v from_version=20260709051056 \
  -v to_version=20260709060330 \
  -f scripts/e14/runtime-source-recovery/export-migration-history.sql \
  > .artifacts/e14/m13-migration-history.local.jsonl
```

## Invariantes M13

```text
migration_count = 165
statement_count = 165
total_remote_sql_bytes = 123636
first_version = 20260709051056
last_version = 20260709060330
combined_remote_fingerprint_sha256 = 6df68289eb6de6a47f84f6bb8dae0761c75f148132dd99341e739e8f4a62f144
```

Qualquer diferença interrompe o processo.

## Materialização

```bash
node scripts/e14/runtime-source-recovery/materialize-migration-history.mjs \
  --input .artifacts/e14/m13-migration-history.local.jsonl \
  --migrations-dir .artifacts/e14/recovered/supabase/migrations \
  --canonical-file .artifacts/e14/recovered/supabase/canonical-migrations/20260709051056_m13_e14_runtime_canonical.sql \
  --manifest .artifacts/e14/recovered/supabase/canonical-migrations/M13_RUNTIME_MANIFEST.json \
  --from-version 20260709051056 \
  --to-version 20260709060330
```

A ferramenta não sobrescreve conteúdo divergente.

## Validação

```bash
node scripts/e14/runtime-source-recovery/validate-recovered-history.mjs \
  --manifest .artifacts/e14/recovered/supabase/canonical-migrations/M13_RUNTIME_MANIFEST.json \
  --migrations-dir .artifacts/e14/recovered/supabase/migrations \
  --canonical-file .artifacts/e14/recovered/supabase/canonical-migrations/20260709051056_m13_e14_runtime_canonical.sql
```

Testes sintéticos:

```bash
npm run test:e14-runtime-recovery
```

## M14/M14b

Intervalo remoto:

```text
20260709183504_m14_step5_application_read_surfaces
20260709184749_m14b_step5_operator_workspace
```

Os identificadores remotos devem substituir os timestamps locais somente depois da comparação de conteúdo. O histórico remoto nunca é alterado para coincidir com o Git.

## Gates posteriores

```text
remote_versions_missing_locally = 0
local_versions_not_expected_remotely = 0
clean_replay_passed = true
schema_equivalence_passed = true
public_rpc_contracts_passed = true
backend_e2e_replayed = true
```

A materialização só deve gerar PR depois que o artifact real existir e tiver sido revisado. Não abrir PR apenas com placeholders, inventários ou hashes sem os arquivos recuperados.
