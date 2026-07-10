#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Missing DATABASE_URL" >&2
  exit 2
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DDL="$ROOT/docs/data/database/database-target-v0.1.sql"
REPORT="${DDL_SMOKE_REPORT_PATH:-supabase-ddl-smoke-report.txt}"

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required" >&2
  exit 2
fi

{
  echo "=== database preflight ==="
  psql "$DATABASE_URL" -X -f "$ROOT/scripts/e12/supabase-db-preflight.sql"
  echo
  echo "=== transactional DDL smoke test ==="
  psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 <<SQL
begin;
\i $DDL
select count(*) as target_table_count
from information_schema.tables
where table_schema in (
  'iam','core','catalog','orchestration','diagnostics','assessment',
  'engagement','intervention','eventing','integration','intelligence',
  'governance','reporting'
);
rollback;
SQL
  echo "DDL parsed and executed successfully; transaction rolled back."
} 2>&1 | tee "$REPORT"
