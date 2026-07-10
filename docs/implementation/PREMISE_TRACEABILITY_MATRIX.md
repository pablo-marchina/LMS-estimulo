# Matriz de rastreabilidade das premissas atuais

**Versão:** 2.0  
**Data:** 2026-07-10  
**Status:** ativo

## Regra de uso

Cada linha deve ser atualizada no mesmo pull request que altera a capacidade correspondente. Uma premissa somente pode ser marcada como atendida quando houver código ou schema, teste e evidência de runtime compatíveis.

| ID | Premissa/requisito | Estado observado | Lacuna principal | Artefato alvo | Prova obrigatória | Gate |
|---|---|---|---|---|---|---|
| P-001 | decisões explícitas atuais prevalecem | Atendido | impedir reintrodução de documentos superados | ADRs, índice e governança | revisão automatizada/manual | `contradictory_active_premises=0` |
| P-002 | repositório oficial único | Confirmado | eliminar referências operacionais obsoletas | governança do repositório | busca e validação | `obsolete_repo_runtime_refs=0` |
| P-003 | Supabase somente em desenvolvimento/teste | Arquitetura definida | impedir configuração de produção | estratégia de ambientes | separação de ambientes e secrets | `supabase_production_claims=0` |
| P-004 | AWS em staging e produção | Planejado | IaC e staging ainda não comprovados | AWS IaC e runbooks | E2E e restore em staging | `aws_staging_e2e_passed=true` |
| P-005 | monólito modular sustentável | Parcial | provar fronteiras reais do código | mapa de dependências | testes de arquitetura | `forbidden_module_dependencies=0` |
| P-006 | padrões somente quando justificados | Parcial | manter rationale por decisão relevante | ADRs e revisão de arquitetura | checklist de PR | `unjustified_patterns=0` |
| P-007 | código, testes e docs sincronizados | Parcial | claims ainda precisam de validação contínua | CI documental | validação de claims | `documentation_claims_without_evidence=0` |
| P-008 | ações relevantes viram dados governáveis | Parcial | falta registro integral das ações ativas | registro de interações | cobertura rota/componente → evento | `active_actions_without_registry=0` |
| P-009 | eventos preservam sequência e contexto | Parcial | ampliar validação para novos comandos | catálogo, schemas e outbox | atomicidade e ordenação | `events_without_context_contract=0` |
| P-010 | dados possuem finalidade e retenção | Parcial | completar mapeamento de uso | registro de uso e ROPA | validação de governança | `events_without_purpose_or_retention=0` |
| P-011 | HubSpot é a autoridade dos dados de negócio coletados e utilizados | Parcial | inventário e adapter reais pendentes | modelo físico e adapter HubSpot | write, readback e reconciliação | `business_reads_without_hubspot_origin=0` |
| P-012 | PostgreSQL é plano técnico, não autoridade paralela | Parcial | classificar estruturas existentes | delta de schema e cutover | testes de origem e reconciliação | `postgresql_independent_business_authority=0` |
| P-013 | HubSpot não é event store técnico | Definido | garantir minimização do mapping | política de projeção | revisão de payloads | `technical_payloads_synced_to_hubspot=0` |
| P-014 | formulário configurável e versionado | Contrato lógico concluído | interface e adapter real pendentes | motor configurável | draft, publish e imutabilidade | `published_form_mutations=0` |
| P-015 | configuração inicial pode possuir quatro arquétipos | Contrato lógico concluído | dados oficiais ainda não aprovados | configuração versionada | quatro registros iniciais aprovados | `initial_archetype_configuration_approved=true` |
| P-016 | quantidade e nomes de arquétipos não são hardcoded | Atendido no motor lógico | provar integração completa | motor e adapter | teste com alteração sem deploy | `hardcoded_archetype_definitions=0` |
| P-017 | resultado recalculável e histórico preservado | Atendido no motor lógico | adapter real e E2E pendentes | histórico de atribuições | E2E de recálculo | `historical_assignment_overwrites=0` |
| P-018 | override manual auditável | Atendido no motor lógico | integração real pendente | comando de override | E2E positivo e negativo | `override_without_reason=0` |
| P-019 | conteúdo de terceiros suportado | Não comprovado | falta contrato e adapter | content provider adapter | conteúdo autorizado no E2E | `provider_specific_logic_in_domain=0` |
| P-020 | direitos e tracking do conteúdo explícitos | Não comprovado | falta modelo operacional | metadados de conteúdo | validação de direitos e capacidades | `external_content_without_rights_metadata=0` |
| P-021 | frontend sem regra de negócio | Parcial | integrar motor via BFF e provar browser E2E | server actions e serviços | arquitetura e E2E | `business_rules_in_ui=0` |
| P-022 | integração HubSpot resiliente | Parcial | adapter real, webhooks e reconciliação pendentes | jobs e workers | falha, retry e readback | `sync_without_idempotency_or_recovery=0` |
| P-023 | portabilidade Supabase → AWS | Arquitetura definida | contratos AWS ainda não executados | suite de contratos | mesmos casos de uso nos adapters | `adapter_contract_parity_passed=true` |
| P-024 | AWS staging obrigatório | Definido | ambiente não provisionado | pipeline IaC | deploy staging e E2E | `direct_test_to_production_promotion=false` |
| P-025 | score não decide crédito sem gates | Protegido | preservar guardrail | governança | testes de bloqueio | `credit_decision_without_governance=0` |

## Próxima atualização obrigatória

A matriz deve receber referências concretas a módulos, endpoints, eventos, telas, testes e evidências à medida que cada capacidade for alterada. A ordem operacional não é versionada neste repositório.
