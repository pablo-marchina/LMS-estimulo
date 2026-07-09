# E14 — Registro de bloqueadores atuais

**Versão:** 0.1  
**Data:** 2026-07-09  
**Status:** Ativo

## Regras

- `P0`: bloqueia qualquer mudança que amplie o runtime ou o schema afetado;
- `P1`: não bloqueia análise/documentação, mas deve ser resolvido antes do gate de release;
- cada bloqueador técnico deve possuir issue, responsável, evidência e critério de encerramento;
- encerramento exige prova executável, não apenas alteração documental.

## Bloqueadores

| ID | Severidade | Área | Descrição | Rastreamento | Bloqueia | Critério de encerramento |
|---|---|---|---|---|---|---|
| E14-B001 | P0 | Database/runtime | 165 migrations M13 aplicadas no Supabase de teste não estão integralmente no Git; M14/M14b possuem timestamps divergentes | #38 | novas migrations funcionais, arquétipos, conteúdo externo e comandos novos | replay limpo, equivalência de schema e contratos públicos aprovados |
| E14-B002 | P0 | Maintainability | helpers privados E14 possuem nomenclatura opaca e cadeia extensa de aliases | #38 | ampliação desse padrão | contratos públicos congelados e plano incremental de substituição aprovado |
| E14-B003 | P1 | Build/CI | workspace não possui lockfile canônico e CI usa resolução não congelada | #39 | alegação de build totalmente reproduzível e gate de release | `package-lock.json`, `npm ci` e instalação limpa Windows/Linux aprovados |
| E14-B004 | P1 | Browser E2E | sessão real, fluxo integral pelo navegador e acessibilidade ainda não foram comprovados | PRs E14 anteriores | conclusão da vertical atual | E2E com contas técnicas e auditoria de acessibilidade aprovados |
| E14-B005 | P1 | Product inputs | nomes/regras oficiais dos quatro arquétipos, conteúdo externo autorizado e inventário HubSpot ainda não estão materializados no runtime | matriz E14 | implementação final dessas capacidades | artefatos de entrada versionados e aprovados |

## Dependências

```text
E14-B001
  → restaura Git como fonte de verdade
  → permite delta final de schema
  → permite nova migration funcional

E14-B002
  → impede expansão da dívida técnica
  → será tratado incrementalmente após E14-B001

E14-B003
  → torna CI e build reproduzíveis
  → necessário antes do AWS staging

E14-B004 + E14-B005
  → necessários para fechar a vertical funcional
```

## Estado atual

```text
p0_open = 2
p1_open = 3
new_functional_migration_authorized = false
supabase_production_authorized = false
aws_staging_gate_required = true
```
