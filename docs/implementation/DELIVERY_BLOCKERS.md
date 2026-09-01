# Bloqueadores da entrega

**Revisado em:** 2026-09-01  
**Estado:** Gate A depende dos workflows do SHA; produção AWS continua bloqueada pelo Gate B

## Gate A — software

O candidato só é aprovado quando `Repository governance`, `Dependency reproducibility`, `Reproducibility`, `Database gates` e `Web CI` estão verdes no mesmo SHA.

Critérios permanentes incluem replay integral, equivalência, contratos públicos, contenção de legado, aplicação/testes, typecheck/build, secret scanning e documentação coerente.

## Pendências de ambiente Supabase/Vercel

Essas pendências não devem ser mascaradas por alteração de código:

- migrations/Edge Functions precisam estar aplicadas no projeto Estímulo correto antes de smoke remoto;
- o template customizado de confirmação só está operacional quando `sync:supabase-confirmation-email` conclui PATCH + GET de verificação no projeto correto;
- captura visual de PR precisa de GitHub Deployment bem-sucedido com `environment_url` para o SHA exato; sem preview publicado, o workflow não possui alvo confiável.

Nenhum desses ambientes é produção institucional.

## Gate B — bloqueadores ativos

- arquitetura AWS definitiva e staging equivalente;
- adapters/runtime de produção;
- E2E navegador → dependências definitivas;
- isolamento multiusuário/multiorganização;
- ramp/spike/soak e saturação;
- processamento assíncrono/retry/dead-letter/reconciliação;
- threat model e proteção distribuída contra abuso;
- custódia/rotação de chaves;
- observabilidade/on-call;
- backup, restore e rollback exercitados;
- aprovações de segurança, privacidade, conteúdo e acessibilidade.

## Regras

- Supabase/Vercel não são produção institucional;
- nenhum deploy diferente do SHA aprovado substitui evidência;
- baseline/schema não é alterado para esconder divergência;
- integração externa permanece desligada por padrão até consumidor/destino aprovados;
- diagnóstico/score educacional não decide crédito.

Consulte [`../operations/FINAL_RELEASE_RUNBOOK.md`](../operations/FINAL_RELEASE_RUNBOOK.md).