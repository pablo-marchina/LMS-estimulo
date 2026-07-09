# Execução do E12 no Supabase — handoff seguro

## Pré-requisitos locais

- Node.js 20+;
- `psql`;
- Supabase CLI via `npx`, Scoop ou binário oficial;
- Docker Desktop para `supabase start` e `supabase db reset` locais.

## 1. Validação sem banco

```powershell
python .\scripts\e12\verify-migration-set.py
node --test .\scripts\e12\contracts\provider-contracts.test.mjs
node --test .\scripts\e12\adapters\supabase-identity-provider.test.mjs
```

## 2. Supabase local

```powershell
npx supabase start
npx supabase db reset
npx supabase test db
```

## 3. Projeto compartilhado

Configure `DATABASE_URL` apenas na sessão ou no CI e execute:

```powershell
$env:DATABASE_URL='<connection string do painel Connect>'
.\scripts\e12\run-database-migrations.ps1
Remove-Item Env:DATABASE_URL
```

O script cria `database-migration-report.local.txt`, que não contém a connection string.

## 4. Prova Auth → identidade → RLS

Use uma conta descartável de teste, nunca uma conta real de empreendedor. Obtenha o access token localmente, execute o adapter e faça a transação com `user_account_id` resolvido. Não envie o token pelo chat.

## 5. Proibições

- não aplicar SQL manualmente pelo Dashboard remoto;
- não usar `service_role` no frontend;
- não versionar `.env`, token, senha ou relatório que contenha PII;
- não executar migrations de produção antes de staging AWS e backup/restauração aprovados.
