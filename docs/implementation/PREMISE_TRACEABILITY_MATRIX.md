# Matriz de rastreabilidade das premissas atuais

**Versão:** 1.0  
**Data:** 2026-07-09  
**Status:** Baseline inicial

## Regra de uso

Cada linha deve ser atualizada no mesmo pull request que altera a capacidade correspondente. Uma premissa somente pode ser marcada como atendida quando houver artefato de código/schema, teste e evidência de runtime.

| ID | Premissa/requisito | Estado observado | Lacuna principal | Artefato alvo | Prova obrigatória | Gate |
|---|---|---|---|---|---|---|
| P-001 | `Estimulo_all` é a referência máxima | Parcial | documentos antigos contêm premissas conflitantes | ADR-002, Premises and Scope, Decision Log | revisão documental automatizada/manual | `contradictory_active_premises=0` |
| P-002 | Repositório oficial único | Confirmado | referências históricas a outro repositório ainda podem existir | inventário de referências obsoletas | busca completa e remoção/depreciação | `obsolete_repo_runtime_refs=0` |
| P-003 | Supabase somente em desenvolvimento/teste | Arquitetura definida | impedir linguagem/configuração que sugira produção | ADR-001/002, env matrix, CI | ambientes e secrets separados | `supabase_production_claims=0` |
| P-004 | AWS em staging/produção | Planejado | IaC e ambiente staging ainda não comprovados | AWS IaC + runbooks | E2E e restore em staging | `aws_staging_e2e_passed=true` |
| P-005 | Monólito modular sustentável | Parcial | mapear fronteiras reais do código atual | module dependency map | testes de arquitetura | `forbidden_module_dependencies=0` |
| P-006 | Padrões somente quando justificados | Não formalizado | falta registro de problema/alternativas por pattern | ADRs e revisão de arquitetura | checklist de PR | `unjustified_patterns=0` |
| P-007 | Código, testes e docs sincronizados | Parcial | documentos E14 divergiram do runtime | CI documental e política de PR | validação de claims | `documentation_claims_without_evidence=0` |
| P-008 | Toda ação relevante do usuário vira dado | Parcial | não existe registro integral de ações ativas | UI Interaction Registry | cobertura rota/componente → evento | `active_actions_without_registry=0` |
| P-009 | Eventos preservam sequência e contexto | Parcial | validar todos os comandos novos | catálogo/schema/outbox | testes de atomicidade e ordenação | `events_without_context_contract=0` |
| P-010 | Dados possuem finalidade e retenção | Parcial | novas ações ainda sem decisão de governança | registry + ROPA + retention mapping | validação de schema e governança | `events_without_purpose_or_retention=0` |
| P-011 | HubSpot é o centro da visão integrada do usuário | Não concluído | inventário e adapter reais pendentes | HubSpot User 360 projection matrix | escrita, readback e reconciliação | `user_fields_without_projection_decision=0` |
| P-012 | PostgreSQL é fonte transacional/histórica | Atendido na fundação | validar novos módulos | migrations + outbox | replay limpo e testes | `multiple_transactional_sources=0` |
| P-013 | HubSpot não é event store técnico | Definido | garantir minimização no mapping | projection policy | payload review | `technical_payloads_synced_to_hubspot=0` |
| P-014 | Formulário configurável | Parcial/indefinido | auditar schema e UI existentes | form definition/version module | draft, publish, clone, immutable version | `published_form_mutations=0` |
| P-015 | Exatamente quatro arquétipos ativos na operação inicial | Não atendido | vertical atual usa caminho genérico | archetype definitions | configuração de quatro registros ativos | `active_archetypes=4` |
| P-016 | Arquétipos não hardcoded | Não comprovado | criar porta e dados configuráveis | assignment strategy + schema | teste com nomes/regras alterados sem deploy | `hardcoded_archetype_definitions=0` |
| P-017 | Resultado recalculável e histórico preservado | Não atendido | faltam revision/recalculation history | assignment history | E2E de nova submissão | `historical_assignment_overwrites=0` |
| P-018 | Override manual auditável | Não atendido | falta caso de uso/autorização | override command/audit | E2E positivo e negativos | `override_without_reason=0` |
| P-019 | Conteúdo de terceiros suportado | Não comprovado | falta adapter real e metadados | external content provider adapter | conteúdo real autorizado no E2E | `provider_specific_logic_in_domain=0` |
| P-020 | Direitos e tracking do conteúdo explícitos | Não comprovado | falta modelo operacional | content metadata schema | validação de direitos/capabilities | `external_content_without_rights_metadata=0` |
| P-021 | Frontend sem regra de negócio | Parcial | auditar rotas incorporadas | BFF/application services | testes de arquitetura e E2E | `business_rules_in_ui=0` |
| P-022 | HubSpot assíncrono e resiliente | Não concluído | adapter, retry, DLQ, reconciliação pendentes | integration jobs/workers | falha, replay e readback | `sync_without_idempotency_or_recovery=0` |
| P-023 | Portabilidade Supabase → AWS | Arquitetura definida | contratos AWS ainda não executados | provider contract suite | mesmos casos de uso nos dois adapters | `adapter_contract_parity_passed=true` |
| P-024 | AWS staging obrigatório | Definido | ambiente não provisionado | IaC pipeline | deploy staging + E2E | `direct_test_to_production_promotion=false` |
| P-025 | Score não decide crédito sem gates | Protegido na baseline | preservar nos novos fluxos | governance gate | testes de bloqueio | `credit_decision_without_governance=0` |

## Próxima atualização obrigatória

A próxima revisão desta matriz ocorrerá após a auditoria E14-R1. Cada linha deverá receber referências concretas para migrations, módulos, endpoints, eventos, telas, testes e evidências.