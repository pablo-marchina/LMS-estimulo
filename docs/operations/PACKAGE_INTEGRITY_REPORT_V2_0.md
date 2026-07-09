# Relatório de integridade — pacote v2.0

**Data:** 2026-07-08  
**Escopo:** M00–M12, Edge Functions, E13 segurança/privacidade/operação, documentação e gate de produção.

## Resultado

| Verificação | Resultado |
|---|---:|
| Testes Node | **24/24 aprovados** |
| Provas transacionais E13 | **8/8 aprovadas e revertidas** |
| Migrations canônicas | **13/13 — M00 a M12** |
| Verificador de migrations | **aprovado** |
| Edge Functions transpile | **2/2** |
| Markdown files | 128 |
| Links locais | **173 válidos** |
| Links quebrados | **0** |
| Credenciais detectadas | **0** |
| Security Advisor | **0 alertas** |
| FKs sem índice | **0** |
| Tabelas sem RLS | **0** |
| Tabelas RLS sem policy | **0** |
| Tabelas diretamente legíveis por cliente | **0** |
| Source queue / DLQ | **0 / 0** |

## Banco remoto

- 156 tabelas da aplicação;
- 272 foreign keys;
- 189 check constraints;
- 510 índices incluindo PK/unique;
- 63 triggers;
- 624 policies;
- 156 tabelas com RLS;
- 11 bases legais no catálogo, sem atribuição automática;
- 8 classificações;
- 7 finalidades e 7 atividades, todas em draft;
- 18 ativos, 26 vínculos de necessidade, 4 partes e 16 vínculos;
- 24 controles de produção: 2 passed e 22 blocking/in progress;
- `production_ready=false`.

## Provas E13

Foram comprovados: redaction recursiva; hash depois da redaction; workflow de solicitação; consentimento append-only; bloqueio por legal hold; incident timeline; rejeição da ativação de crédito; gate de produção fechado. Todas as linhas de prova foram revertidas.

## Limitações deliberadas

O pacote não afirma conformidade jurídica nem prontidão produtiva. Controlador, encarregado, bases legais, retenção, fornecedores, transferências, AWS, HubSpot, scanner real, RIPD e governança de crédito continuam pendentes.

## Evidências

- `docs/security/e13-live-validation.json`;
- `docs/security/e13-transaction-tests.json`;
- `docs/security/e13-v2.0-test-output.txt`;
- `docs/security/e13-v2.0-migration-validation.json`;
- `docs/security/e13-v2.0-edge-function-transpile.json`;
- `docs/operations/e13-v2.0-integrity-scan.json`;
- `docs/architecture/e13-remote-migration-history-v2.0.json`.

O pacote não contém valores do Vault, service-role key, publishable key, credenciais AWS, private keys, JWTs ou connection strings com senha.
