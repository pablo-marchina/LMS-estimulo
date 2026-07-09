# E12 — Resultado do smoke test das APIs Supabase

**Data:** 2026-07-08  
**Projeto:** `cfpfeavjlgheqqiaqtzv`  
**Status:** bloqueado pelo ambiente de execução, não pelo projeto

## Testes preparados

- `GET /auth/v1/health`
- `GET /rest/v1/`
- `GET /storage/v1/status`

A chave pública foi fornecida e utilizada somente como variável de ambiente. Ela não foi persistida em arquivos, relatórios ou código.

## Resultado observado

Os três testes retornaram erro de transporte `fetch failed`. A inspeção subsequente mostrou que o ambiente atual não consegue resolver o host DNS do projeto Supabase (`Could not resolve host`). Portanto, este resultado **não permite concluir** que Auth, REST ou Storage estejam indisponíveis.

## Conclusão

- O script está funcional e recebe URL/chave por ambiente.
- A validação remota precisa ser executada em uma máquina ou CI com acesso normal à internet.
- Nenhuma alteração foi realizada no projeto Supabase.
- O resultado não bloqueia o desenho dos adapters, migrations e provas locais.

## Próxima execução

Usar o script PowerShell `scripts/e12/run-supabase-api-smoke.ps1` em uma máquina autorizada. A chave deve ser fornecida por variável de ambiente e nunca gravada no repositório.
