# Catálogo canônico de eventos v0.1

**Status:** contrato semântico inicial para produção; payloads específicos serão promovidos a schemas executáveis durante a implementação.

**Total de tipos:** 118

## 1. Como ler

- **Classe:** domínio, comportamental, híbrida comportamental–domínio, integração ou auditoria.
- **Evidência:** natureza da confirmação.
- **Feature:** elegibilidade técnica para pesquisas futuras; nunca autorização de uso em crédito.
- O catálogo máquina-legível está em `event-catalog-v0.1.yaml`.

## identity

| Alias | Classe | Agregado | Evidência | Privacidade | Feature | Produtor |
|---|---|---|---|---|---|---|
| `identity.invitation.created` | domain | `invitation` | server_transactional | pseudonymous | ineligible | `identity` |
| `identity.invitation.sent` | integration | `invitation` | external_confirmed | pseudonymous | ineligible | `notification_connector` |
| `identity.invitation.delivered` | integration | `invitation` | external_confirmed | pseudonymous | conditional | `notification_connector` |
| `identity.invitation.opened` | behavioral | `invitation` | external_observed | pseudonymous | weak_only | `notification_connector` |
| `identity.account.registered` | domain | `user_account` | server_transactional | pseudonymous | ineligible | `identity` |
| `identity.email.verified` | domain | `user_account` | server_transactional | pseudonymous | ineligible | `identity` |
| `identity.account.activated` | domain | `user_account` | server_transactional | pseudonymous | ineligible | `identity` |
| `identity.account.suspended` | audit | `user_account` | server_transactional | restricted | ineligible | `identity` |
| `identity.authentication.succeeded` | audit | `authentication` | server_acknowledged | restricted | ineligible | `identity` |
| `identity.authentication.failed` | audit | `authentication` | server_acknowledged | restricted | ineligible | `identity` |

## governance

| Alias | Classe | Agregado | Evidência | Privacidade | Feature | Produtor |
|---|---|---|---|---|---|---|
| `governance.consent.granted` | domain | `consent` | server_transactional | restricted | ineligible | `governance` |
| `governance.consent.withdrawn` | domain | `consent` | server_transactional | restricted | ineligible | `governance` |

## catalog

| Alias | Classe | Agregado | Evidência | Privacidade | Feature | Produtor |
|---|---|---|---|---|---|---|
| `catalog.journey_version.published` | domain | `journey_version` | server_transactional | internal | ineligible | `catalog` |
| `catalog.journey_version.retired` | domain | `journey_version` | server_transactional | internal | ineligible | `catalog` |
| `catalog.course_version.published` | domain | `course_version` | server_transactional | internal | ineligible | `catalog` |
| `catalog.course_version.retired` | domain | `course_version` | server_transactional | internal | ineligible | `catalog` |
| `catalog.activity_version.published` | domain | `activity_version` | server_transactional | internal | ineligible | `catalog` |
| `catalog.activity_version.retired` | domain | `activity_version` | server_transactional | internal | ineligible | `catalog` |
| `catalog.diagnostic_version.published` | domain | `diagnostic_version` | server_transactional | internal | ineligible | `catalog` |
| `catalog.diagnostic_version.retired` | domain | `diagnostic_version` | server_transactional | internal | ineligible | `catalog` |
| `catalog.assessment_version.published` | domain | `assessment_version` | server_transactional | internal | ineligible | `catalog` |
| `catalog.assessment_version.retired` | domain | `assessment_version` | server_transactional | internal | ineligible | `catalog` |
| `catalog.intervention_version.published` | domain | `intervention_version` | server_transactional | internal | ineligible | `catalog` |
| `catalog.intervention_version.retired` | domain | `intervention_version` | server_transactional | internal | ineligible | `catalog` |

## journey

| Alias | Classe | Agregado | Evidência | Privacidade | Feature | Produtor |
|---|---|---|---|---|---|---|
| `journey.enrollment.created` | domain | `enrollment` | server_transactional | pseudonymous | ineligible | `journey_orchestration` |
| `journey.enrollment.activated` | domain | `enrollment` | server_transactional | pseudonymous | ineligible | `journey_orchestration` |
| `journey.enrollment.cancelled` | domain | `enrollment` | server_transactional | pseudonymous | ineligible | `journey_orchestration` |
| `journey.enrollment.expired` | domain | `enrollment` | server_transactional | pseudonymous | ineligible | `journey_orchestration` |
| `journey.instance.available` | domain | `journey_instance` | server_transactional | pseudonymous | ineligible | `journey_orchestration` |
| `journey.instance.started` | behavioral_domain | `journey_instance` | server_transactional | pseudonymous | eligible | `journey_orchestration` |
| `journey.instance.paused` | domain | `journey_instance` | server_transactional | pseudonymous | ineligible | `journey_orchestration` |
| `journey.instance.resumed` | behavioral_domain | `journey_instance` | server_transactional | pseudonymous | eligible | `journey_orchestration` |
| `journey.milestone.achieved` | domain | `journey_instance` | server_transactional | pseudonymous | derived_only | `journey_orchestration` |
| `journey.instance.completed` | domain | `journey_instance` | server_transactional | pseudonymous | derived_only | `journey_orchestration` |
| `journey.path.assigned` | domain | `path_assignment` | server_transactional | pseudonymous | ineligible | `journey_orchestration` |
| `journey.path.reassigned` | domain | `path_assignment` | server_transactional | pseudonymous | ineligible | `journey_orchestration` |
| `journey.path.started` | behavioral_domain | `path_assignment` | server_transactional | pseudonymous | eligible | `journey_orchestration` |
| `journey.path.completed` | domain | `path_assignment` | server_transactional | pseudonymous | derived_only | `journey_orchestration` |
| `journey.step.available` | domain | `activity_instance` | server_transactional | pseudonymous | ineligible | `journey_orchestration` |
| `journey.step.blocked` | domain | `activity_instance` | server_transactional | pseudonymous | ineligible | `journey_orchestration` |
| `journey.step.unblocked` | domain | `activity_instance` | server_transactional | pseudonymous | ineligible | `journey_orchestration` |
| `journey.step.skipped` | behavioral_domain | `activity_instance` | server_transactional | pseudonymous | conditional | `journey_orchestration` |

## diagnostic

| Alias | Classe | Agregado | Evidência | Privacidade | Feature | Produtor |
|---|---|---|---|---|---|---|
| `diagnostic.session.started` | behavioral_domain | `diagnostic_session` | server_transactional | pseudonymous | eligible | `diagnostics` |
| `diagnostic.response.recorded` | behavioral | `diagnostic_session` | server_acknowledged | restricted | conditional | `diagnostics` |
| `diagnostic.response.changed` | behavioral | `diagnostic_session` | server_acknowledged | restricted | conditional | `diagnostics` |
| `diagnostic.session.abandoned` | behavioral_domain | `diagnostic_session` | server_transactional | pseudonymous | eligible | `diagnostics` |
| `diagnostic.session.resumed` | behavioral_domain | `diagnostic_session` | server_transactional | pseudonymous | eligible | `diagnostics` |
| `diagnostic.session.completed` | behavioral_domain | `diagnostic_session` | server_transactional | pseudonymous | eligible | `diagnostics` |
| `diagnostic.result.generated` | domain | `diagnostic_result` | server_transactional | restricted | derived_only | `diagnostics` |

## personalization

| Alias | Classe | Agregado | Evidência | Privacidade | Feature | Produtor |
|---|---|---|---|---|---|---|
| `personalization.recommendation.generated` | domain | `recommendation` | server_transactional | pseudonymous | ineligible | `personalization_engine` |
| `personalization.recommendation.presented` | behavioral | `recommendation` | server_acknowledged | pseudonymous | weak_only | `application_backend` |
| `personalization.recommendation.accepted` | behavioral_domain | `recommendation` | server_transactional | pseudonymous | eligible | `application_backend` |
| `personalization.recommendation.overridden` | behavioral_domain | `recommendation` | server_transactional | pseudonymous | eligible | `application_backend` |
| `personalization.segment.assigned` | domain | `segment_assignment` | server_transactional | pseudonymous | ineligible | `personalization_engine` |
| `personalization.segment.removed` | domain | `segment_assignment` | server_transactional | pseudonymous | ineligible | `personalization_engine` |
| `personalization.uncertainty.recorded` | domain | `recommendation` | server_transactional | restricted | ineligible | `personalization_engine` |

## learning

| Alias | Classe | Agregado | Evidência | Privacidade | Feature | Produtor |
|---|---|---|---|---|---|---|
| `learning.activity.started` | behavioral_domain | `activity_instance` | server_transactional | pseudonymous | eligible | `learning_delivery` |
| `learning.activity.paused` | behavioral | `activity_instance` | server_acknowledged | pseudonymous | conditional | `application_backend` |
| `learning.activity.resumed` | behavioral_domain | `activity_instance` | server_transactional | pseudonymous | eligible | `learning_delivery` |
| `learning.activity.progressed` | behavioral | `activity_instance` | server_acknowledged | pseudonymous | conditional | `application_backend` |
| `learning.activity.completed` | behavioral_domain | `activity_instance` | server_transactional | pseudonymous | eligible | `learning_delivery` |
| `learning.activity.revisited` | behavioral | `activity_instance` | server_acknowledged | pseudonymous | conditional | `application_backend` |
| `learning.asset.opened` | behavioral | `content_asset` | server_acknowledged | pseudonymous | weak_only | `application_backend` |
| `learning.asset.downloaded` | behavioral_domain | `content_asset` | server_transactional | pseudonymous | conditional | `application_backend` |
| `learning.external_resource.opened` | behavioral | `external_resource` | server_acknowledged | pseudonymous | weak_only | `application_backend` |

## assessment

| Alias | Classe | Agregado | Evidência | Privacidade | Feature | Produtor |
|---|---|---|---|---|---|---|
| `assessment.attempt.started` | behavioral_domain | `assessment_attempt` | server_transactional | pseudonymous | eligible | `assessment` |
| `assessment.answer.recorded` | behavioral | `assessment_attempt` | server_acknowledged | restricted | conditional | `assessment` |
| `assessment.attempt.submitted` | behavioral_domain | `assessment_attempt` | server_transactional | pseudonymous | eligible | `assessment` |
| `assessment.attempt.scored` | domain | `assessment_attempt` | server_transactional | restricted | derived_only | `scoring_engine` |
| `assessment.attempt.passed` | domain | `assessment_attempt` | server_transactional | pseudonymous | derived_only | `scoring_engine` |
| `assessment.attempt.failed` | domain | `assessment_attempt` | server_transactional | pseudonymous | derived_only | `scoring_engine` |
| `assessment.attempt.invalidated` | audit | `assessment_attempt` | server_transactional | restricted | ineligible | `assessment` |
| `assessment.feedback.available` | domain | `assessment_attempt` | server_transactional | pseudonymous | ineligible | `assessment` |
| `assessment.feedback.viewed` | behavioral | `assessment_attempt` | server_acknowledged | pseudonymous | conditional | `application_backend` |
| `assessment.retry.available` | domain | `assessment_attempt` | server_transactional | pseudonymous | ineligible | `assessment` |

## practice

| Alias | Classe | Agregado | Evidência | Privacidade | Feature | Produtor |
|---|---|---|---|---|---|---|
| `practice.activity.started` | behavioral_domain | `practice_instance` | server_transactional | pseudonymous | eligible | `practice` |
| `practice.submission.draft_saved` | behavioral_domain | `practice_submission` | server_transactional | restricted | conditional | `practice` |
| `practice.evidence.attached` | behavioral_domain | `practice_submission` | server_transactional | restricted | conditional | `practice` |
| `practice.evidence.removed` | behavioral_domain | `practice_submission` | server_transactional | restricted | ineligible | `practice` |
| `practice.submission.submitted` | behavioral_domain | `practice_submission` | server_transactional | restricted | eligible | `practice` |
| `practice.review.started` | audit | `practice_review` | server_transactional | restricted | ineligible | `practice` |
| `practice.revision.requested` | domain | `practice_submission` | server_transactional | restricted | conditional | `practice` |
| `practice.submission.resubmitted` | behavioral_domain | `practice_submission` | server_transactional | restricted | eligible | `practice` |
| `practice.submission.accepted` | domain | `practice_submission` | server_transactional | restricted | eligible | `practice` |
| `practice.submission.rejected` | domain | `practice_submission` | server_transactional | restricted | ineligible | `practice` |
| `practice.application.self_reported` | behavioral | `application_evidence` | self_reported | restricted | conditional | `practice` |
| `practice.application.verified` | domain | `application_evidence` | reviewer_validated | restricted | eligible | `practice` |
| `practice.use_permission.granted` | domain | `content_permission` | server_transactional | restricted | ineligible | `governance` |
| `practice.use_permission.withdrawn` | domain | `content_permission` | server_transactional | restricted | ineligible | `governance` |

## engagement

| Alias | Classe | Agregado | Evidência | Privacidade | Feature | Produtor |
|---|---|---|---|---|---|---|
| `engagement.points.awarded` | domain | `point_ledger_entry` | server_transactional | pseudonymous | ineligible | `gamification_engine` |
| `engagement.points.reversed` | domain | `point_ledger_entry` | server_transactional | pseudonymous | ineligible | `gamification_engine` |
| `engagement.badge.awarded` | domain | `badge_award` | server_transactional | pseudonymous | ineligible | `gamification_engine` |
| `engagement.badge.revoked` | domain | `badge_award` | server_transactional | pseudonymous | ineligible | `gamification_engine` |

## credential

| Alias | Classe | Agregado | Evidência | Privacidade | Feature | Produtor |
|---|---|---|---|---|---|---|
| `credential.certificate.issued` | domain | `certificate` | server_transactional | pseudonymous | ineligible | `credential_engine` |
| `credential.certificate.revoked` | domain | `certificate` | server_transactional | pseudonymous | ineligible | `credential_engine` |
| `credential.certificate.downloaded` | behavioral | `certificate` | server_acknowledged | pseudonymous | weak_only | `application_backend` |

## intervention

| Alias | Classe | Agregado | Evidência | Privacidade | Feature | Produtor |
|---|---|---|---|---|---|---|
| `intervention.eligibility.detected` | domain | `intervention_candidate` | server_transactional | pseudonymous | ineligible | `intervention_orchestrator` |
| `intervention.instance.created` | domain | `intervention_instance` | server_transactional | pseudonymous | ineligible | `intervention_orchestrator` |
| `intervention.instance.suppressed` | domain | `intervention_instance` | server_transactional | pseudonymous | ineligible | `intervention_orchestrator` |
| `intervention.message.sent` | integration | `intervention_instance` | external_confirmed | pseudonymous | ineligible | `notification_connector` |
| `intervention.message.delivered` | integration | `intervention_instance` | external_confirmed | pseudonymous | conditional | `notification_connector` |
| `intervention.message.opened` | behavioral | `intervention_instance` | external_observed | pseudonymous | weak_only | `notification_connector` |
| `intervention.action.taken` | behavioral_domain | `intervention_instance` | server_transactional | pseudonymous | conditional | `application_backend` |
| `intervention.instance.dismissed` | behavioral_domain | `intervention_instance` | server_transactional | pseudonymous | conditional | `application_backend` |
| `intervention.delivery.failed` | integration | `intervention_instance` | external_confirmed | internal | ineligible | `notification_connector` |
| `intervention.instance.cancelled` | domain | `intervention_instance` | server_transactional | pseudonymous | ineligible | `intervention_orchestrator` |

## support

| Alias | Classe | Agregado | Evidência | Privacidade | Feature | Produtor |
|---|---|---|---|---|---|---|
| `support.requested` | behavioral_domain | `support_request` | server_transactional | restricted | eligible | `application_backend` |
| `support.request.fulfilled` | domain | `support_request` | server_transactional | restricted | ineligible | `support_operations` |

## integration

| Alias | Classe | Agregado | Evidência | Privacidade | Feature | Produtor |
|---|---|---|---|---|---|---|
| `integration.sync.requested` | integration | `sync_operation` | server_transactional | internal | ineligible | `integration_orchestrator` |
| `integration.sync.succeeded` | integration | `sync_operation` | external_confirmed | internal | ineligible | `integration_worker` |
| `integration.sync.failed` | integration | `sync_operation` | external_confirmed | internal | ineligible | `integration_worker` |
| `integration.conflict.detected` | integration | `sync_operation` | server_transactional | restricted | ineligible | `integration_worker` |
| `integration.conflict.reconciled` | integration | `sync_operation` | server_transactional | restricted | ineligible | `integration_worker` |
| `integration.webhook.received` | integration | `webhook_delivery` | external_observed | internal | ineligible | `webhook_gateway` |
| `integration.webhook.validated` | integration | `webhook_delivery` | server_acknowledged | internal | ineligible | `webhook_gateway` |
| `integration.webhook.rejected` | audit | `webhook_delivery` | server_acknowledged | restricted | ineligible | `webhook_gateway` |
| `integration.webhook.processed` | integration | `webhook_delivery` | server_transactional | internal | ineligible | `integration_worker` |

## external

| Alias | Classe | Agregado | Evidência | Privacidade | Feature | Produtor |
|---|---|---|---|---|---|---|
| `external.credit.stage.changed` | integration | `credit_operation` | external_confirmed | restricted | conditional | `credit_connector` |

## 2. Contratos pendentes por dependência externa

- `external.credit.stage.changed`: reservado, bloqueado até receber estados, identificadores e fonte oficial da operação de crédito.
- Campos finais de HubSpot serão detalhados no E11 após o inventário do sandbox.

## 3. Regra de implementação

Nenhum tipo deste catálogo entra em produção apenas por estar listado. Cada evento implementado deve ter schema, exemplo, teste de produtor, teste de consumidor, retenção aprovada e runbook de falha.
