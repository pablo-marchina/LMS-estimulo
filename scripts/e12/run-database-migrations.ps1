$ErrorActionPreference = 'Stop'

if (-not $env:DATABASE_URL) {
  throw 'Defina DATABASE_URL somente na sessão atual ou no cofre do CI. Não salve no repositório.'
}

$Root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$MigrationDir = Join-Path $Root 'supabase\migrations'
$Report = Join-Path $PSScriptRoot 'database-migration-report.local.txt'

if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
  throw 'psql não está disponível no PATH.'
}

"Migration execution started: $(Get-Date -Format o)" | Set-Content $Report
Get-ChildItem $MigrationDir -Filter '*.sql' | Sort-Object Name | ForEach-Object {
  "Applying $($_.Name)" | Tee-Object -FilePath $Report -Append
  & psql $env:DATABASE_URL -X -v ON_ERROR_STOP=1 -f $_.FullName 2>&1 | Tee-Object -FilePath $Report -Append
  if ($LASTEXITCODE -ne 0) { throw "Migration failed: $($_.Name)" }
}

& psql $env:DATABASE_URL -X -v ON_ERROR_STOP=1 -f (Join-Path $PSScriptRoot 'verify-live-database.sql') 2>&1 | Tee-Object -FilePath $Report -Append
if ($LASTEXITCODE -ne 0) { throw 'Live database verification failed.' }

Write-Host "Relatório criado em $Report"
