$ErrorActionPreference = 'Stop'

if (-not $env:SUPABASE_PUBLISHABLE_KEY) {
  throw 'Defina SUPABASE_PUBLISHABLE_KEY apenas na sessão atual do PowerShell.'
}

$env:SUPABASE_URL = 'https://cfpfeavjlgheqqiaqtzv.supabase.co'
$env:SMOKE_REPORT_PATH = Join-Path $PSScriptRoot 'supabase-api-smoke-report.local.json'

node (Join-Path $PSScriptRoot 'supabase-api-smoke.mjs')

Write-Host "Relatório criado em $env:SMOKE_REPORT_PATH"
