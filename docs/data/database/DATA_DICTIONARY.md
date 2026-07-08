# Dicionário de dados — modelo-alvo v0.1

**Versão:** 0.1  
**Status:** baseline lógica e física preliminar para E10  

## Convenções

- Chaves internas são UUIDs e não reutilizam IDs externos.
- Timestamps são `timestamptz` em UTC.
- Versões publicadas são imutáveis.
- Eventos, ledgers, consentimentos e auditoria são append-only.
- Campos `jsonb` carregam configurações versionadas ou snapshots; não substituem relações essenciais.
- Tabelas marcadas como `projection` podem ser apagadas e reconstruídas a partir das fontes.
- Valores externos são referenciados por mapeamentos; nunca se tornam chaves primárias internas.

## Schemas

- **`iam`:** Contas autenticáveis, organizações operadoras, papéis, capacidades e vínculos internos.
- **`core`:** Empreendedores, negócios beneficiários, vínculos e arquivos protegidos.
- **`catalog`:** Programas, definições e versões publicáveis de jornadas, cursos, atividades e competências.
- **`orchestration`:** Regras, trilhas, inscrições, instâncias, passos e projeções de execução.
- **`diagnostics`:** Instrumentos, respostas, resultados, segmentos operacionais e arquétipos futuros.
- **`assessment`:** Avaliações, tentativas, práticas, evidências e revisões.
- **`engagement`:** Pontos, selos, sequências e certificados.
- **`intervention`:** Definições, regras, instâncias e entregas de intervenções.
- **`eventing`:** Schemas de eventos, log canônico, outbox, inbox, entregas e dead letters.
- **`integration`:** Conexões, mapeamentos, webhooks, sincronizações, conflitos e reconciliação.
- **`intelligence`:** Features comportamentais, execuções, scores experimentais, explicações e validações.
- **`governance`:** Consentimentos, solicitações de privacidade, retenção, linhagem, aprovações e auditoria.
- **`reporting`:** Views e projeções de leitura; não contém fatos primários.

**Total:** 121 tabelas lógicas/físicas preliminares.

## Tabelas

### `iam`

#### `iam.user_accounts`

Conta autenticável desacoplada da pessoa de negócio.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `auth_provider text`; `auth_subject text`; `email_normalized text`; `status text`; `last_authenticated_at timestamptz nullable`; `created_at timestamptz`; `updated_at timestamptz`.
- **Unicidade:** `auth_provider, auth_subject`; `email_normalized`.

#### `iam.organizations`

Estímulo, parceiros, produtores de conteúdo e outras organizações operadoras.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `organization_type text`; `slug text`; `legal_name text`; `display_name text`; `status text`; `metadata jsonb`; `created_at timestamptz`; `updated_at timestamptz`.
- **Unicidade:** `slug`.

#### `iam.organization_memberships`

Vínculo de uma conta com uma organização e seu período de validade.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `organization_id uuid`; `user_account_id uuid`; `status text`; `valid_from timestamptz`; `valid_until timestamptz nullable`; `created_at timestamptz`.
- **FKs:** `organization_id -> iam.organizations.id`; `user_account_id -> iam.user_accounts.id`.
- **Unicidade:** `organization_id, user_account_id, valid_from`.

#### `iam.role_definitions`

Papéis como agrupadores de capacidades.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `organization_id uuid`; `code text`; `name text`; `description text`; `status text`.
- **FKs:** `organization_id -> iam.organizations.id`.
- **Unicidade:** `organization_id, code`.

#### `iam.permission_definitions`

Capacidades atômicas autorizáveis.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `code text`; `resource_type text`; `action text`; `description text`.
- **Unicidade:** `code`.

#### `iam.role_permissions`

Capacidades incluídas em um papel.

- **PK:** `role_id, permission_id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `role_id uuid`; `permission_id uuid`.
- **FKs:** `role_id -> iam.role_definitions.id`; `permission_id -> iam.permission_definitions.id`.

#### `iam.membership_roles`

Papéis atribuídos a um vínculo organizacional.

- **PK:** `membership_id, role_id, valid_from`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `membership_id uuid`; `role_id uuid`; `scope jsonb`; `valid_from timestamptz`; `valid_until timestamptz nullable`.
- **FKs:** `membership_id -> iam.organization_memberships.id`; `role_id -> iam.role_definitions.id`.

### `core`

#### `core.entrepreneurs`

Pessoa participante das iniciativas, independente da conta de acesso.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `user_account_id uuid nullable`; `preferred_name text nullable`; `legal_name text nullable`; `email_normalized text nullable`; `phone_e164 text nullable`; `status text`; `profile_data jsonb`; `created_at timestamptz`; `updated_at timestamptz`.
- **FKs:** `user_account_id -> iam.user_accounts.id`.
- **Unicidade:** `user_account_id`.

#### `core.businesses`

Unidade econômica beneficiária, formal ou informal conforme o programa.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `legal_name text nullable`; `trade_name text nullable`; `registration_type text nullable`; `registration_number_hash text nullable`; `status text`; `country_code char(2)`; `profile_data jsonb`; `created_at timestamptz`; `updated_at timestamptz`.
- **Unicidade:** `registration_type, registration_number_hash`.

#### `core.business_memberships`

Relação temporal entre empreendedor e negócio.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `entrepreneur_id uuid`; `business_id uuid`; `relationship_type text`; `is_primary boolean`; `verification_status text`; `valid_from date`; `valid_until date nullable`; `evidence_reference text nullable`; `created_at timestamptz`.
- **FKs:** `entrepreneur_id -> core.entrepreneurs.id`; `business_id -> core.businesses.id`.
- **Unicidade:** `entrepreneur_id, business_id, relationship_type, valid_from`.

#### `core.file_objects`

Metadados de arquivos protegidos; o binário permanece em object storage.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `owner_organization_id uuid`; `storage_provider text`; `bucket text`; `object_key text`; `content_type text`; `size_bytes bigint`; `sha256 text`; `security_status text`; `retention_class text`; `created_at timestamptz`; `deleted_at timestamptz nullable`.
- **FKs:** `owner_organization_id -> iam.organizations.id`.
- **Unicidade:** `storage_provider, bucket, object_key`; `sha256, size_bytes`.

### `catalog`

#### `catalog.programs`

Estrutura institucional que agrupa jornadas.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `owner_organization_id uuid`; `code text`; `name text`; `description text nullable`; `status text`; `valid_from date nullable`; `valid_until date nullable`; `created_at timestamptz`; `updated_at timestamptz`.
- **FKs:** `owner_organization_id -> iam.organizations.id`.
- **Unicidade:** `owner_organization_id, code`.

#### `catalog.journey_definitions`

Identidade estável de uma jornada ao longo das versões.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `program_id uuid`; `owner_organization_id uuid`; `code text`; `slug text`; `name text`; `purpose text nullable`; `status text`; `created_at timestamptz`; `updated_at timestamptz`.
- **FKs:** `program_id -> catalog.programs.id`; `owner_organization_id -> iam.organizations.id`.
- **Unicidade:** `owner_organization_id, code`; `owner_organization_id, slug`.

#### `catalog.journey_versions`

Snapshot imutável após publicação.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `journey_definition_id uuid`; `version_number integer`; `status text`; `title text`; `description text nullable`; `configuration jsonb`; `schema_version text`; `published_at timestamptz nullable`; `retired_at timestamptz nullable`; `content_hash text`; `created_by uuid`; `created_at timestamptz`.
- **FKs:** `journey_definition_id -> catalog.journey_definitions.id`; `created_by -> iam.user_accounts.id`.
- **Unicidade:** `journey_definition_id, version_number`; `journey_definition_id, content_hash`.

#### `catalog.course_definitions`

Identidade estável de curso reutilizável.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `owner_organization_id uuid`; `code text`; `slug text`; `name text`; `status text`; `created_at timestamptz`; `updated_at timestamptz`.
- **FKs:** `owner_organization_id -> iam.organizations.id`.
- **Unicidade:** `owner_organization_id, code`; `owner_organization_id, slug`.

#### `catalog.course_versions`

Snapshot de curso publicado.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `course_definition_id uuid`; `version_number integer`; `status text`; `title text`; `description text nullable`; `estimated_minutes integer`; `published_at timestamptz nullable`; `content_hash text`; `created_by uuid`; `created_at timestamptz`.
- **FKs:** `course_definition_id -> catalog.course_definitions.id`; `created_by -> iam.user_accounts.id`.
- **Unicidade:** `course_definition_id, version_number`; `course_definition_id, content_hash`.

#### `catalog.modules`

Agrupamento editorial dentro de uma versão de curso.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `course_version_id uuid`; `code text`; `title text`; `description text nullable`; `position integer`; `estimated_minutes integer`; `metadata jsonb`.
- **FKs:** `course_version_id -> catalog.course_versions.id`.
- **Unicidade:** `course_version_id, code`; `course_version_id, position`.

#### `catalog.activity_definitions`

Identidade estável de atividade reutilizável.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `owner_organization_id uuid`; `code text`; `activity_type text`; `name text`; `status text`; `created_at timestamptz`; `updated_at timestamptz`.
- **FKs:** `owner_organization_id -> iam.organizations.id`.
- **Unicidade:** `owner_organization_id, code`.

#### `catalog.activity_versions`

Snapshot executável de atividade.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `activity_definition_id uuid`; `version_number integer`; `status text`; `title text`; `description text nullable`; `activity_type text`; `configuration jsonb`; `estimated_minutes integer`; `published_at timestamptz nullable`; `content_hash text`; `created_by uuid`; `created_at timestamptz`.
- **FKs:** `activity_definition_id -> catalog.activity_definitions.id`; `created_by -> iam.user_accounts.id`.
- **Unicidade:** `activity_definition_id, version_number`; `activity_definition_id, content_hash`.

#### `catalog.module_activities`

Ordena atividades em módulos sem duplicá-las.

- **PK:** `module_id, activity_version_id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `module_id uuid`; `activity_version_id uuid`; `position integer`; `is_required boolean`.
- **FKs:** `module_id -> catalog.modules.id`; `activity_version_id -> catalog.activity_versions.id`.
- **Unicidade:** `module_id, position`.

#### `catalog.content_assets`

Ativos vinculados a versões de atividade.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `activity_version_id uuid`; `file_object_id uuid nullable`; `asset_type text`; `title text`; `external_url text nullable`; `language_code text`; `accessibility_metadata jsonb`; `position integer`; `is_required boolean`; `created_at timestamptz`.
- **FKs:** `activity_version_id -> catalog.activity_versions.id`; `file_object_id -> core.file_objects.id`.
- **Unicidade:** `activity_version_id, position`.

#### `catalog.competencies`

Competências reutilizáveis e versionáveis por código.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `owner_organization_id uuid`; `code text`; `name text`; `description text nullable`; `status text`.
- **FKs:** `owner_organization_id -> iam.organizations.id`.
- **Unicidade:** `owner_organization_id, code`.

#### `catalog.journey_competencies`

Competências alvo de uma versão de jornada.

- **PK:** `journey_version_id, competency_id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `journey_version_id uuid`; `competency_id uuid`; `target_level numeric`; `weight numeric`.
- **FKs:** `journey_version_id -> catalog.journey_versions.id`; `competency_id -> catalog.competencies.id`.

#### `catalog.activity_competencies`

Competências praticadas ou avaliadas por uma atividade.

- **PK:** `activity_version_id, competency_id, evidence_type`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `activity_version_id uuid`; `competency_id uuid`; `evidence_type text`; `weight numeric`.
- **FKs:** `activity_version_id -> catalog.activity_versions.id`; `competency_id -> catalog.competencies.id`.

#### `catalog.content_contributors`

Autores, professores, mentores ou parceiros associados a um conteúdo.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `activity_version_id uuid nullable`; `course_version_id uuid nullable`; `organization_id uuid nullable`; `user_account_id uuid nullable`; `contribution_role text`; `display_name text nullable`.
- **FKs:** `activity_version_id -> catalog.activity_versions.id`; `course_version_id -> catalog.course_versions.id`; `organization_id -> iam.organizations.id`; `user_account_id -> iam.user_accounts.id`.

### `orchestration`

#### `orchestration.rule_definitions`

Identidade estável de regra executável.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `owner_organization_id uuid`; `code text`; `rule_type text`; `name text`; `status text`.
- **FKs:** `owner_organization_id -> iam.organizations.id`.
- **Unicidade:** `owner_organization_id, code`.

#### `orchestration.rule_versions`

Expressão estruturada e validada de uma regra.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `rule_definition_id uuid`; `version_number integer`; `status text`; `language text`; `expression jsonb`; `input_schema jsonb`; `output_schema jsonb`; `published_at timestamptz nullable`; `content_hash text`; `created_at timestamptz`.
- **FKs:** `rule_definition_id -> orchestration.rule_definitions.id`.
- **Unicidade:** `rule_definition_id, version_number`; `rule_definition_id, content_hash`.

#### `orchestration.path_templates`

Trilha possível em uma versão de jornada.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `journey_version_id uuid`; `code text`; `name text`; `description text nullable`; `is_default boolean`; `status text`.
- **FKs:** `journey_version_id -> catalog.journey_versions.id`.
- **Unicidade:** `journey_version_id, code`.

#### `orchestration.path_steps`

Nó de execução que referencia atividade versionada.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `path_template_id uuid`; `code text`; `activity_version_id uuid`; `position_hint integer`; `is_required boolean`; `availability_rule_version_id uuid nullable`; `completion_rule_version_id uuid nullable`; `due_offset interval nullable`; `metadata jsonb`.
- **FKs:** `path_template_id -> orchestration.path_templates.id`; `activity_version_id -> catalog.activity_versions.id`; `availability_rule_version_id -> orchestration.rule_versions.id`; `completion_rule_version_id -> orchestration.rule_versions.id`.
- **Unicidade:** `path_template_id, code`.

#### `orchestration.path_transitions`

Arestas condicionais entre passos.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `path_template_id uuid`; `from_step_id uuid nullable`; `to_step_id uuid nullable`; `condition_rule_version_id uuid nullable`; `priority integer`; `transition_type text`.
- **FKs:** `path_template_id -> orchestration.path_templates.id`; `from_step_id -> orchestration.path_steps.id`; `to_step_id -> orchestration.path_steps.id`; `condition_rule_version_id -> orchestration.rule_versions.id`.
- **Unicidade:** `path_template_id, from_step_id, to_step_id, priority`.

#### `orchestration.assignment_policies`

Política versionada usada para atribuir trilha.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `journey_version_id uuid`; `rule_version_id uuid`; `priority integer`; `status text`; `valid_from timestamptz nullable`; `valid_until timestamptz nullable`.
- **FKs:** `journey_version_id -> catalog.journey_versions.id`; `rule_version_id -> orchestration.rule_versions.id`.

#### `orchestration.cohorts`

Grupo operacional de participantes.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `program_id uuid`; `journey_version_id uuid nullable`; `code text`; `name text`; `status text`; `starts_at timestamptz nullable`; `ends_at timestamptz nullable`; `metadata jsonb`.
- **FKs:** `program_id -> catalog.programs.id`; `journey_version_id -> catalog.journey_versions.id`.
- **Unicidade:** `program_id, code`.

#### `orchestration.enrollments`

Atribuição formal de pessoa/negócio a uma versão de jornada.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `entrepreneur_id uuid`; `business_id uuid nullable`; `journey_version_id uuid`; `cohort_id uuid nullable`; `source text`; `status text`; `assigned_at timestamptz`; `accepted_at timestamptz nullable`; `expires_at timestamptz nullable`; `aggregate_version bigint`; `created_at timestamptz`.
- **FKs:** `entrepreneur_id -> core.entrepreneurs.id`; `business_id -> core.businesses.id`; `journey_version_id -> catalog.journey_versions.id`; `cohort_id -> orchestration.cohorts.id`.
- **Unicidade:** `entrepreneur_id, business_id, journey_version_id, cohort_id`.

#### `orchestration.journey_instances`

Execução longitudinal de uma inscrição.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `enrollment_id uuid`; `status text`; `started_at timestamptz nullable`; `paused_at timestamptz nullable`; `base_completed_at timestamptz nullable`; `fully_completed_at timestamptz nullable`; `ended_at timestamptz nullable`; `aggregate_version bigint`; `created_at timestamptz`; `updated_at timestamptz`.
- **FKs:** `enrollment_id -> orchestration.enrollments.id`.
- **Unicidade:** `enrollment_id`.

#### `orchestration.path_assignments`

Trilha efetivamente atribuída e explicação da decisão.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `journey_instance_id uuid`; `path_template_id uuid`; `assignment_policy_id uuid nullable`; `status text`; `reason jsonb`; `confidence numeric nullable`; `valid_from timestamptz`; `valid_until timestamptz nullable`; `created_at timestamptz`.
- **FKs:** `journey_instance_id -> orchestration.journey_instances.id`; `path_template_id -> orchestration.path_templates.id`; `assignment_policy_id -> orchestration.assignment_policies.id`.

#### `orchestration.step_instances`

Estado operacional de um passo para uma participação.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `path_assignment_id uuid`; `path_step_id uuid`; `activity_version_id uuid`; `status text`; `available_at timestamptz nullable`; `started_at timestamptz nullable`; `completed_at timestamptz nullable`; `attempt_count integer`; `aggregate_version bigint`; `created_at timestamptz`; `updated_at timestamptz`.
- **FKs:** `path_assignment_id -> orchestration.path_assignments.id`; `path_step_id -> orchestration.path_steps.id`; `activity_version_id -> catalog.activity_versions.id`.
- **Unicidade:** `path_assignment_id, path_step_id`.

#### `orchestration.activity_sessions`

Sessões operacionais de consumo de atividade.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `step_instance_id uuid`; `entrepreneur_id uuid`; `started_at timestamptz`; `last_seen_at timestamptz nullable`; `ended_at timestamptz nullable`; `device_class text nullable`; `channel text nullable`; `accepted_observation_count integer`.
- **FKs:** `step_instance_id -> orchestration.step_instances.id`; `entrepreneur_id -> core.entrepreneurs.id`.

#### `orchestration.progress_projections`

Projeção reconstruível para leitura rápida.

- **PK:** `journey_instance_id`
- **Fonte:** `projection`
- **Append-only:** `false`
- **Colunas principais:** `journey_instance_id uuid`; `completed_required_steps integer`; `total_required_steps integer`; `completion_ratio numeric`; `current_step_id uuid nullable`; `last_activity_at timestamptz nullable`; `projection_version bigint`; `updated_at timestamptz`.
- **FKs:** `journey_instance_id -> orchestration.journey_instances.id`; `current_step_id -> orchestration.path_steps.id`.

#### `orchestration.personalization_decisions`

Decisão explicável de roteamento ou adaptação.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `entrepreneur_id uuid`; `journey_instance_id uuid nullable`; `decision_type text`; `rule_version_id uuid nullable`; `input_snapshot jsonb`; `output jsonb`; `confidence numeric nullable`; `status text`; `decided_at timestamptz`; `expires_at timestamptz nullable`.
- **FKs:** `entrepreneur_id -> core.entrepreneurs.id`; `journey_instance_id -> orchestration.journey_instances.id`; `rule_version_id -> orchestration.rule_versions.id`.

### `diagnostics`

#### `diagnostics.diagnostic_definitions`

Identidade estável de instrumento diagnóstico.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `owner_organization_id uuid`; `code text`; `name text`; `purpose text`; `status text`.
- **FKs:** `owner_organization_id -> iam.organizations.id`.
- **Unicidade:** `owner_organization_id, code`.

#### `diagnostics.diagnostic_versions`

Versão imutável do instrumento após publicação.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `diagnostic_definition_id uuid`; `version_number integer`; `status text`; `configuration jsonb`; `published_at timestamptz`; `content_hash text`; `created_at timestamptz`.
- **FKs:** `diagnostic_definition_id -> diagnostics.diagnostic_definitions.id`.
- **Unicidade:** `diagnostic_definition_id, version_number`; `diagnostic_definition_id, content_hash`.

#### `diagnostics.dimensions`

Dimensões contínuas exploratórias de uma versão.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `diagnostic_version_id uuid`; `code text`; `name text`; `description text nullable`; `minimum_answer_ratio numeric`; `position integer`.
- **FKs:** `diagnostic_version_id -> diagnostics.diagnostic_versions.id`.
- **Unicidade:** `diagnostic_version_id, code`; `diagnostic_version_id, position`.

#### `diagnostics.items`

Perguntas ou itens do diagnóstico.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `diagnostic_version_id uuid`; `dimension_id uuid nullable`; `code text`; `item_type text`; `prompt text`; `configuration jsonb`; `position integer`; `is_required boolean`.
- **FKs:** `diagnostic_version_id -> diagnostics.diagnostic_versions.id`; `dimension_id -> diagnostics.dimensions.id`.
- **Unicidade:** `diagnostic_version_id, code`; `diagnostic_version_id, position`.

#### `diagnostics.item_options`

Opções válidas para itens fechados.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `item_id uuid`; `code text`; `label text`; `value jsonb`; `position integer`.
- **FKs:** `item_id -> diagnostics.items.id`.
- **Unicidade:** `item_id, code`; `item_id, position`.

#### `diagnostics.sessions`

Execução de um diagnóstico por participante.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `diagnostic_version_id uuid`; `entrepreneur_id uuid`; `business_id uuid nullable`; `journey_instance_id uuid nullable`; `status text`; `started_at timestamptz`; `completed_at timestamptz nullable`; `abandoned_at timestamptz nullable`; `aggregate_version bigint`; `created_at timestamptz`.
- **FKs:** `diagnostic_version_id -> diagnostics.diagnostic_versions.id`; `entrepreneur_id -> core.entrepreneurs.id`; `business_id -> core.businesses.id`; `journey_instance_id -> orchestration.journey_instances.id`.

#### `diagnostics.responses`

Histórico append-only de respostas e alterações.

- **PK:** `id`
- **Fonte:** `behavioral_fact`
- **Append-only:** `true`
- **Colunas principais:** `id uuid`; `session_id uuid`; `item_id uuid`; `revision integer`; `response_value jsonb`; `response_time_ms integer nullable`; `recorded_at timestamptz`; `supersedes_response_id uuid nullable`; `source_event_id uuid`.
- **FKs:** `session_id -> diagnostics.sessions.id`; `item_id -> diagnostics.items.id`; `supersedes_response_id -> diagnostics.responses.id`; `source_event_id -> eventing.events.event_id`.
- **Unicidade:** `session_id, item_id, revision`.

#### `diagnostics.results`

Resultado operacional versionado do diagnóstico.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `session_id uuid`; `calculation_version text`; `status text`; `operational_readiness jsonb`; `data_quality jsonb`; `recommended_start jsonb`; `calculated_at timestamptz`; `source_event_high_watermark uuid nullable`.
- **FKs:** `session_id -> diagnostics.sessions.id`.
- **Unicidade:** `session_id, calculation_version`.

#### `diagnostics.dimension_results`

Escore contínuo e qualidade por dimensão.

- **PK:** `result_id, dimension_id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `result_id uuid`; `dimension_id uuid`; `score numeric nullable`; `answered_ratio numeric`; `evidence_status text`; `details jsonb`.
- **FKs:** `result_id -> diagnostics.results.id`; `dimension_id -> diagnostics.dimensions.id`.

#### `diagnostics.segment_definitions`

Identidade estável de segmento operacional temporário.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `owner_organization_id uuid`; `code text`; `name text`; `description text nullable`; `status text`.
- **FKs:** `owner_organization_id -> iam.organizations.id`.
- **Unicidade:** `owner_organization_id, code`.

#### `diagnostics.segment_versions`

Regra e semântica versionadas de segmento.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `segment_definition_id uuid`; `version_number integer`; `rule_version_id uuid nullable`; `status text`; `validity_interval interval nullable`; `published_at timestamptz nullable`.
- **FKs:** `segment_definition_id -> diagnostics.segment_definitions.id`; `rule_version_id -> orchestration.rule_versions.id`.
- **Unicidade:** `segment_definition_id, version_number`.

#### `diagnostics.segment_assignments`

Atribuição temporária, explicável e revogável.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `segment_version_id uuid`; `entrepreneur_id uuid`; `journey_instance_id uuid nullable`; `source_type text`; `source_reference jsonb`; `confidence numeric nullable`; `assigned_at timestamptz`; `valid_until timestamptz nullable`; `revoked_at timestamptz nullable`.
- **FKs:** `segment_version_id -> diagnostics.segment_versions.id`; `entrepreneur_id -> core.entrepreneurs.id`; `journey_instance_id -> orchestration.journey_instances.id`.

#### `diagnostics.archetype_definitions`

Estrutura futura; desabilitada até validação.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `owner_organization_id uuid`; `code text`; `name text`; `description text nullable`; `status text`.
- **FKs:** `owner_organization_id -> iam.organizations.id`.
- **Unicidade:** `owner_organization_id, code`.

#### `diagnostics.archetype_versions`

Modelo probabilístico futuro e versionado.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `archetype_definition_id uuid`; `version_number integer`; `model_reference text nullable`; `status text`; `validation_status text`; `published_at timestamptz nullable`.
- **FKs:** `archetype_definition_id -> diagnostics.archetype_definitions.id`.
- **Unicidade:** `archetype_definition_id, version_number`.

#### `diagnostics.archetype_assignments`

Resultado probabilístico futuro, inclusive incerto.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `entrepreneur_id uuid`; `journey_instance_id uuid nullable`; `model_version_reference text`; `primary_archetype_version_id uuid nullable`; `probability numeric nullable`; `secondary_archetype_version_id uuid nullable`; `secondary_probability numeric nullable`; `classification_status text`; `assigned_at timestamptz`.
- **FKs:** `entrepreneur_id -> core.entrepreneurs.id`; `journey_instance_id -> orchestration.journey_instances.id`; `primary_archetype_version_id -> diagnostics.archetype_versions.id`; `secondary_archetype_version_id -> diagnostics.archetype_versions.id`.

### `assessment`

#### `assessment.assessment_specs`

Configuração específica para atividade do tipo avaliação.

- **PK:** `activity_version_id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `activity_version_id uuid`; `grading_mode text`; `passing_score numeric nullable`; `max_attempts integer nullable`; `time_limit_seconds integer nullable`; `randomization_policy jsonb`; `feedback_policy jsonb`.
- **FKs:** `activity_version_id -> catalog.activity_versions.id`.

#### `assessment.questions`

Questões pertencentes a uma versão publicada de atividade.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `activity_version_id uuid`; `code text`; `question_type text`; `prompt text`; `points numeric`; `position integer`; `configuration jsonb`.
- **FKs:** `activity_version_id -> catalog.activity_versions.id`.
- **Unicidade:** `activity_version_id, code`; `activity_version_id, position`.

#### `assessment.answer_options`

Opções de questões fechadas.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `question_id uuid`; `code text`; `label text`; `value jsonb`; `is_correct boolean nullable`; `position integer`.
- **FKs:** `question_id -> assessment.questions.id`.
- **Unicidade:** `question_id, code`; `question_id, position`.

#### `assessment.attempts`

Tentativa de avaliação vinculada ao passo e à versão.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `step_instance_id uuid`; `activity_version_id uuid`; `entrepreneur_id uuid`; `attempt_number integer`; `status text`; `started_at timestamptz`; `submitted_at timestamptz nullable`; `scored_at timestamptz nullable`; `aggregate_version bigint`.
- **FKs:** `step_instance_id -> orchestration.step_instances.id`; `activity_version_id -> catalog.activity_versions.id`; `entrepreneur_id -> core.entrepreneurs.id`.
- **Unicidade:** `step_instance_id, attempt_number`.

#### `assessment.responses`

Respostas por tentativa e questão.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `attempt_id uuid`; `question_id uuid`; `response_value jsonb`; `responded_at timestamptz`; `source_event_id uuid`.
- **FKs:** `attempt_id -> assessment.attempts.id`; `question_id -> assessment.questions.id`; `source_event_id -> eventing.events.event_id`.
- **Unicidade:** `attempt_id, question_id`.

#### `assessment.results`

Resultado reproduzível de uma tentativa.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `attempt_id uuid`; `scoring_version text`; `raw_score numeric`; `normalized_score numeric`; `passed boolean`; `details jsonb`; `calculated_at timestamptz`.
- **FKs:** `attempt_id -> assessment.attempts.id`.
- **Unicidade:** `attempt_id, scoring_version`.

#### `assessment.practice_specs`

Configuração específica para atividade prática.

- **PK:** `activity_version_id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `activity_version_id uuid`; `submission_mode text`; `allowed_evidence_types text[]`; `max_submissions integer nullable`; `review_required boolean`; `rubric_version_id uuid nullable`; `terms_version text nullable`.
- **FKs:** `activity_version_id -> catalog.activity_versions.id`.

#### `assessment.rubric_definitions`

Identidade estável de rubrica.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `owner_organization_id uuid`; `code text`; `name text`; `status text`.
- **FKs:** `owner_organization_id -> iam.organizations.id`.
- **Unicidade:** `owner_organization_id, code`.

#### `assessment.rubric_versions`

Snapshot imutável da rubrica.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `rubric_definition_id uuid`; `version_number integer`; `status text`; `published_at timestamptz nullable`; `content_hash text`.
- **FKs:** `rubric_definition_id -> assessment.rubric_definitions.id`.
- **Unicidade:** `rubric_definition_id, version_number`.

#### `assessment.rubric_criteria`

Critérios e escalas da rubrica.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `rubric_version_id uuid`; `code text`; `name text`; `description text`; `max_score numeric`; `weight numeric`; `position integer`; `levels jsonb`.
- **FKs:** `rubric_version_id -> assessment.rubric_versions.id`.
- **Unicidade:** `rubric_version_id, code`; `rubric_version_id, position`.

#### `assessment.submissions`

Entrega prática, sem armazenar binário diretamente.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `step_instance_id uuid`; `activity_version_id uuid`; `entrepreneur_id uuid`; `submission_number integer`; `status text`; `text_content text nullable`; `external_link text nullable`; `submitted_at timestamptz`; `accepted_at timestamptz nullable`; `aggregate_version bigint`; `allow_public_use boolean`.
- **FKs:** `step_instance_id -> orchestration.step_instances.id`; `activity_version_id -> catalog.activity_versions.id`; `entrepreneur_id -> core.entrepreneurs.id`.
- **Unicidade:** `step_instance_id, submission_number`.

#### `assessment.submission_evidence`

Arquivos ou evidências associados a entrega.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `submission_id uuid`; `file_object_id uuid`; `evidence_type text`; `position integer`; `metadata jsonb`.
- **FKs:** `submission_id -> assessment.submissions.id`; `file_object_id -> core.file_objects.id`.
- **Unicidade:** `submission_id, position`.

#### `assessment.reviews`

Revisão humana ou automática explicitamente identificada.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `submission_id uuid`; `reviewer_user_account_id uuid nullable`; `review_type text`; `rubric_version_id uuid nullable`; `status text`; `feedback text nullable`; `reviewed_at timestamptz`; `source_event_id uuid`.
- **FKs:** `submission_id -> assessment.submissions.id`; `reviewer_user_account_id -> iam.user_accounts.id`; `rubric_version_id -> assessment.rubric_versions.id`; `source_event_id -> eventing.events.event_id`.

#### `assessment.review_scores`

Pontuação por critério de rubrica.

- **PK:** `review_id, rubric_criterion_id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `review_id uuid`; `rubric_criterion_id uuid`; `score numeric`; `comment text nullable`.
- **FKs:** `review_id -> assessment.reviews.id`; `rubric_criterion_id -> assessment.rubric_criteria.id`.

### `engagement`

#### `engagement.point_rule_definitions`

Identidade estável de regra de pontos.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `owner_organization_id uuid`; `code text`; `name text`; `status text`.
- **FKs:** `owner_organization_id -> iam.organizations.id`.
- **Unicidade:** `owner_organization_id, code`.

#### `engagement.point_rule_versions`

Quantidade, recorrência e elegibilidade versionadas.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `point_rule_definition_id uuid`; `version_number integer`; `status text`; `amount integer`; `eligibility_rule_version_id uuid`; `recurrence_policy jsonb`; `published_at timestamptz`.
- **FKs:** `point_rule_definition_id -> engagement.point_rule_definitions.id`; `eligibility_rule_version_id -> orchestration.rule_versions.id`.
- **Unicidade:** `point_rule_definition_id, version_number`.

#### `engagement.point_ledger`

Lançamentos imutáveis positivos ou negativos.

- **PK:** `id`
- **Fonte:** `ledger`
- **Append-only:** `true`
- **Colunas principais:** `id uuid`; `entrepreneur_id uuid`; `journey_instance_id uuid nullable`; `point_rule_version_id uuid`; `amount integer`; `source_event_id uuid`; `idempotency_key text`; `reason text`; `reverses_entry_id uuid nullable`; `occurred_at timestamptz`; `created_at timestamptz`.
- **FKs:** `entrepreneur_id -> core.entrepreneurs.id`; `journey_instance_id -> orchestration.journey_instances.id`; `point_rule_version_id -> engagement.point_rule_versions.id`; `source_event_id -> eventing.events.event_id`; `reverses_entry_id -> engagement.point_ledger.id`.
- **Unicidade:** `idempotency_key`.

#### `engagement.point_balance_projections`

Saldo reconstruível por escopo.

- **PK:** `id`
- **Fonte:** `projection`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `entrepreneur_id uuid`; `journey_instance_id uuid nullable`; `balance integer`; `last_ledger_entry_id uuid`; `projection_version bigint`; `updated_at timestamptz`.
- **FKs:** `entrepreneur_id -> core.entrepreneurs.id`; `journey_instance_id -> orchestration.journey_instances.id`; `last_ledger_entry_id -> engagement.point_ledger.id`.
- **Unicidade:** `entrepreneur_id, journey_instance_id (NULLS NOT DISTINCT)`.

#### `engagement.badge_definitions`

Identidade estável de selo.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `owner_organization_id uuid`; `code text`; `name text`; `status text`.
- **FKs:** `owner_organization_id -> iam.organizations.id`.
- **Unicidade:** `owner_organization_id, code`.

#### `engagement.badge_versions`

Critérios e apresentação versionados.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `badge_definition_id uuid`; `version_number integer`; `status text`; `title text`; `description text`; `criteria_rule_version_id uuid`; `asset_file_object_id uuid nullable`; `published_at timestamptz nullable`.
- **FKs:** `badge_definition_id -> engagement.badge_definitions.id`; `criteria_rule_version_id -> orchestration.rule_versions.id`; `asset_file_object_id -> core.file_objects.id`.
- **Unicidade:** `badge_definition_id, version_number`.

#### `engagement.badge_awards`

Emissão idempotente de selo.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `entrepreneur_id uuid`; `journey_instance_id uuid nullable`; `badge_version_id uuid`; `source_event_id uuid`; `evidence_snapshot jsonb`; `awarded_at timestamptz`; `revoked_at timestamptz nullable`; `revocation_reason text nullable`.
- **FKs:** `entrepreneur_id -> core.entrepreneurs.id`; `journey_instance_id -> orchestration.journey_instances.id`; `badge_version_id -> engagement.badge_versions.id`; `source_event_id -> eventing.events.event_id`.
- **Unicidade:** `entrepreneur_id, journey_instance_id, badge_version_id`.

#### `engagement.certificate_definitions`

Identidade estável de certificado.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `owner_organization_id uuid`; `code text`; `name text`; `status text`.
- **FKs:** `owner_organization_id -> iam.organizations.id`.
- **Unicidade:** `owner_organization_id, code`.

#### `engagement.certificate_versions`

Requisitos, template e validade versionados.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `certificate_definition_id uuid`; `version_number integer`; `status text`; `journey_version_id uuid`; `requirements_rule_version_id uuid`; `template_file_object_id uuid nullable`; `validity_policy jsonb`; `published_at timestamptz nullable`.
- **FKs:** `certificate_definition_id -> engagement.certificate_definitions.id`; `journey_version_id -> catalog.journey_versions.id`; `requirements_rule_version_id -> orchestration.rule_versions.id`; `template_file_object_id -> core.file_objects.id`.
- **Unicidade:** `certificate_definition_id, version_number`.

#### `engagement.certificate_issuances`

Credencial verificável emitida e revogável.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `entrepreneur_id uuid`; `journey_instance_id uuid`; `certificate_version_id uuid`; `verification_code text`; `display_name_snapshot text`; `requirement_snapshot jsonb`; `source_event_id uuid`; `status text`; `issued_at timestamptz`; `expires_at timestamptz nullable`; `revoked_at timestamptz nullable`; `revocation_reason text nullable`; `document_file_object_id uuid nullable`.
- **FKs:** `entrepreneur_id -> core.entrepreneurs.id`; `journey_instance_id -> orchestration.journey_instances.id`; `certificate_version_id -> engagement.certificate_versions.id`; `source_event_id -> eventing.events.event_id`; `document_file_object_id -> core.file_objects.id`.
- **Unicidade:** `verification_code`; `journey_instance_id, certificate_version_id`.

#### `engagement.streak_projections`

Sequências derivadas para interface, nunca fato primário.

- **PK:** `id`
- **Fonte:** `projection`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `entrepreneur_id uuid`; `journey_instance_id uuid nullable`; `streak_type text`; `current_count integer`; `longest_count integer`; `last_qualifying_date date nullable`; `projection_version bigint`; `updated_at timestamptz`.
- **FKs:** `entrepreneur_id -> core.entrepreneurs.id`; `journey_instance_id -> orchestration.journey_instances.id`.
- **Unicidade:** `entrepreneur_id, journey_instance_id, streak_type (NULLS NOT DISTINCT)`.

### `intervention`

#### `intervention.definitions`

Identidade estável de intervenção.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `owner_organization_id uuid`; `code text`; `name text`; `purpose text`; `status text`.
- **FKs:** `owner_organization_id -> iam.organizations.id`.
- **Unicidade:** `owner_organization_id, code`.

#### `intervention.versions`

Conteúdo, canal, cooldown e regras versionados.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `intervention_definition_id uuid`; `version_number integer`; `status text`; `eligibility_rule_version_id uuid`; `channel_policy jsonb`; `content_template jsonb`; `cooldown interval nullable`; `priority integer`; `published_at timestamptz nullable`.
- **FKs:** `intervention_definition_id -> intervention.definitions.id`; `eligibility_rule_version_id -> orchestration.rule_versions.id`.
- **Unicidade:** `intervention_definition_id, version_number`.

#### `intervention.instances`

Intervenção criada para uma pessoa em contexto específico.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `intervention_version_id uuid`; `entrepreneur_id uuid`; `journey_instance_id uuid nullable`; `trigger_event_id uuid nullable`; `status text`; `eligible_at timestamptz`; `scheduled_at timestamptz nullable`; `sent_at timestamptz nullable`; `completed_at timestamptz nullable`; `suppression_reason text nullable`; `aggregate_version bigint`.
- **FKs:** `intervention_version_id -> intervention.versions.id`; `entrepreneur_id -> core.entrepreneurs.id`; `journey_instance_id -> orchestration.journey_instances.id`; `trigger_event_id -> eventing.events.event_id`.

#### `intervention.delivery_attempts`

Tentativas de entrega e confirmação de provedor.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `intervention_instance_id uuid`; `channel text`; `provider text`; `attempt_number integer`; `status text`; `external_message_id text nullable`; `requested_at timestamptz`; `delivered_at timestamptz nullable`; `opened_at timestamptz nullable`; `failure_code text nullable`; `failure_details jsonb`.
- **FKs:** `intervention_instance_id -> intervention.instances.id`.
- **Unicidade:** `intervention_instance_id, channel, attempt_number`.

#### `intervention.responses`

Resposta explícita ou ação atribuível à intervenção.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `intervention_instance_id uuid`; `response_type text`; `response_value jsonb`; `source_event_id uuid`; `responded_at timestamptz`.
- **FKs:** `intervention_instance_id -> intervention.instances.id`; `source_event_id -> eventing.events.event_id`.

### `eventing`

#### `eventing.event_schemas`

Registro de schemas JSON por tipo e versão.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `event_name text`; `event_version integer`; `schema_uri text`; `schema_document jsonb`; `schema_hash text`; `status text`; `published_at timestamptz`.
- **Unicidade:** `event_name, event_version`; `schema_hash`.

#### `eventing.events`

Log canônico imutável de fatos e observações aceitas.

- **PK:** `event_id`
- **Fonte:** `canonical_event`
- **Append-only:** `true`
- **Colunas principais:** `event_id uuid`; `event_name text`; `event_version integer`; `occurred_at timestamptz`; `received_at timestamptz`; `producer text`; `subject_type text`; `subject_id uuid nullable`; `actor_type text`; `actor_id uuid nullable`; `organization_id uuid nullable`; `journey_instance_id uuid nullable`; `aggregate_type text nullable`; `aggregate_id uuid nullable`; `aggregate_version bigint nullable`; `partition_key text`; `correlation_id uuid`; `causation_id uuid nullable`; `traceparent text nullable`; `evidence_nature text`; `privacy_class text`; `payload jsonb`; `payload_hash text`; `schema_id uuid`; `created_at timestamptz`.
- **FKs:** `schema_id -> eventing.event_schemas.id`; `organization_id -> iam.organizations.id`; `journey_instance_id -> orchestration.journey_instances.id`.
- **Unicidade:** `aggregate_type, aggregate_id, aggregate_version (partial)`; `producer, payload_hash, occurred_at (optional dedup)`.

#### `eventing.outbox`

Entrega assíncrona criada atomicamente com o fato.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `event_id uuid`; `route_key text`; `status text`; `available_at timestamptz`; `claimed_at timestamptz nullable`; `claimed_by text nullable`; `attempt_count integer`; `last_error_code text nullable`; `completed_at timestamptz nullable`; `created_at timestamptz`.
- **FKs:** `event_id -> eventing.events.event_id`.
- **Unicidade:** `event_id, route_key`.

#### `eventing.consumer_definitions`

Consumidores lógicos e suas políticas.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `code text`; `name text`; `status text`; `max_attempts integer`; `retry_policy jsonb`; `dead_letter_policy jsonb`.
- **Unicidade:** `code`.

#### `eventing.consumer_inbox`

Deduplicação e estado por consumidor/evento.

- **PK:** `consumer_id, event_id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `consumer_id uuid`; `event_id uuid`; `status text`; `received_at timestamptz`; `processing_started_at timestamptz nullable`; `processed_at timestamptz nullable`; `attempt_count integer`; `last_error_code text nullable`.
- **FKs:** `consumer_id -> eventing.consumer_definitions.id`; `event_id -> eventing.events.event_id`.

#### `eventing.delivery_attempts`

Histórico append-only de tentativas de distribuição.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `true`
- **Colunas principais:** `id uuid`; `outbox_id uuid`; `consumer_id uuid`; `attempt_number integer`; `status text`; `started_at timestamptz`; `finished_at timestamptz nullable`; `error_code text nullable`; `error_details jsonb`.
- **FKs:** `outbox_id -> eventing.outbox.id`; `consumer_id -> eventing.consumer_definitions.id`.
- **Unicidade:** `outbox_id, consumer_id, attempt_number`.

#### `eventing.dead_letters`

Eventos/entregas isolados para investigação e replay.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `event_id uuid`; `consumer_id uuid nullable`; `source_type text`; `reason_code text`; `reason_details jsonb`; `status text`; `created_at timestamptz`; `resolved_at timestamptz nullable`; `resolution text nullable`.
- **FKs:** `event_id -> eventing.events.event_id`; `consumer_id -> eventing.consumer_definitions.id`.

#### `eventing.projection_checkpoints`

Checkpoint de projeções reconstruíveis.

- **PK:** `projection_code, partition_key`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `projection_code text`; `partition_key text`; `last_event_id uuid nullable`; `last_received_at timestamptz nullable`; `projection_version bigint`; `updated_at timestamptz`.
- **FKs:** `last_event_id -> eventing.events.event_id`.

### `integration`

#### `integration.connections`

Configuração não secreta de conectores; segredos ficam em secret manager.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `organization_id uuid`; `provider text`; `environment text`; `status text`; `secret_reference text`; `configuration jsonb`; `created_at timestamptz`; `updated_at timestamptz`.
- **FKs:** `organization_id -> iam.organizations.id`.
- **Unicidade:** `organization_id, provider, environment`.

#### `integration.external_object_mappings`

Mapeia entidades internas a IDs externos.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `connection_id uuid`; `internal_entity_type text`; `internal_entity_id uuid`; `external_object_type text`; `external_object_id text`; `status text`; `first_synced_at timestamptz`; `last_synced_at timestamptz`; `metadata jsonb`.
- **FKs:** `connection_id -> integration.connections.id`.
- **Unicidade:** `connection_id, external_object_type, external_object_id`; `connection_id, internal_entity_type, internal_entity_id, external_object_type`.

#### `integration.mapping_definitions`

Identidade estável de contrato de mapeamento.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `connection_id uuid`; `code text`; `direction text`; `internal_entity_type text`; `external_object_type text`; `status text`.
- **FKs:** `connection_id -> integration.connections.id`.
- **Unicidade:** `connection_id, code`.

#### `integration.mapping_versions`

Campos e transformações versionados.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `mapping_definition_id uuid`; `version_number integer`; `status text`; `field_mappings jsonb`; `validation_schema jsonb`; `published_at timestamptz`; `content_hash text`.
- **FKs:** `mapping_definition_id -> integration.mapping_definitions.id`.
- **Unicidade:** `mapping_definition_id, version_number`.

#### `integration.sync_jobs`

Unidade idempotente de envio ou leitura externa.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `connection_id uuid`; `mapping_version_id uuid`; `source_event_id uuid nullable`; `operation text`; `internal_entity_type text`; `internal_entity_id uuid`; `idempotency_key text`; `status text`; `scheduled_at timestamptz`; `started_at timestamptz nullable`; `completed_at timestamptz nullable`; `external_object_id text nullable`; `attempt_count integer`; `last_error_code text nullable`.
- **FKs:** `connection_id -> integration.connections.id`; `mapping_version_id -> integration.mapping_versions.id`; `source_event_id -> eventing.events.event_id`.
- **Unicidade:** `idempotency_key`.

#### `integration.sync_attempts`

Histórico de tentativas e resposta sanitizada.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `true`
- **Colunas principais:** `id uuid`; `sync_job_id uuid`; `attempt_number integer`; `status text`; `request_hash text`; `response_status integer nullable`; `response_reference text nullable`; `started_at timestamptz`; `finished_at timestamptz nullable`; `error_code text nullable`; `error_details jsonb`.
- **FKs:** `sync_job_id -> integration.sync_jobs.id`.
- **Unicidade:** `sync_job_id, attempt_number`.

#### `integration.conflicts`

Divergências que exigem política ou revisão.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `connection_id uuid`; `internal_entity_type text`; `internal_entity_id uuid`; `external_object_type text`; `external_object_id text nullable`; `field_name text nullable`; `internal_value_hash text nullable`; `external_value_hash text nullable`; `status text`; `detected_at timestamptz`; `resolved_at timestamptz nullable`; `resolution text nullable`.
- **FKs:** `connection_id -> integration.connections.id`.

#### `integration.reconciliation_runs`

Execução de reconciliação por conexão e escopo.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `connection_id uuid`; `scope jsonb`; `status text`; `started_at timestamptz`; `completed_at timestamptz nullable`; `summary jsonb`.
- **FKs:** `connection_id -> integration.connections.id`.

#### `integration.reconciliation_items`

Resultado por objeto reconciliado.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `run_id uuid`; `internal_entity_type text`; `internal_entity_id uuid nullable`; `external_object_type text`; `external_object_id text nullable`; `status text`; `difference_summary jsonb`; `action_taken text nullable`.
- **FKs:** `run_id -> integration.reconciliation_runs.id`.

#### `integration.webhook_receipts`

Recebimento bruto isolado por hash/referência, sem promover payload inteiro.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `connection_id uuid`; `provider_event_id text nullable`; `received_at timestamptz`; `signature_status text`; `replay_status text`; `payload_hash text`; `payload_object_reference text nullable`; `status text`; `normalized_event_id uuid nullable`; `rejection_reason text nullable`.
- **FKs:** `connection_id -> integration.connections.id`; `normalized_event_id -> eventing.events.event_id`.
- **Unicidade:** `connection_id, provider_event_id`; `connection_id, payload_hash`.

### `intelligence`

#### `intelligence.feature_definitions`

Identidade estável de uma característica comportamental.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `owner_organization_id uuid`; `code text`; `name text`; `description text`; `value_type text`; `status text`; `allowed_uses text[]`; `prohibited_uses text[]`.
- **FKs:** `owner_organization_id -> iam.organizations.id`.
- **Unicidade:** `owner_organization_id, code`.

#### `intelligence.feature_versions`

Fórmula, janela, fontes e tratamento de ausência versionados.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `feature_definition_id uuid`; `version_number integer`; `status text`; `computation_type text`; `expression jsonb`; `window_definition jsonb`; `missing_policy jsonb`; `quality_policy jsonb`; `published_at timestamptz`; `content_hash text`.
- **FKs:** `feature_definition_id -> intelligence.feature_definitions.id`.
- **Unicidade:** `feature_definition_id, version_number`; `feature_definition_id, content_hash`.

#### `intelligence.feature_dependencies`

Eventos ou features que alimentam uma versão.

- **PK:** `feature_version_id, dependency_type, dependency_reference`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `feature_version_id uuid`; `dependency_type text`; `dependency_reference text`; `required boolean`; `weight numeric nullable`.
- **FKs:** `feature_version_id -> intelligence.feature_versions.id`.

#### `intelligence.feature_computation_runs`

Execução reproduzível de cálculo.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `feature_version_id uuid`; `run_type text`; `status text`; `window_start timestamptz nullable`; `window_end timestamptz nullable`; `input_high_watermark timestamptz nullable`; `code_reference text`; `started_at timestamptz`; `completed_at timestamptz nullable`; `summary jsonb`.
- **FKs:** `feature_version_id -> intelligence.feature_versions.id`.

#### `intelligence.feature_values`

Valor derivado por sujeito, contexto e janela.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `feature_version_id uuid`; `run_id uuid`; `subject_type text`; `subject_id uuid`; `journey_instance_id uuid nullable`; `window_start timestamptz nullable`; `window_end timestamptz nullable`; `as_of timestamptz`; `numeric_value numeric nullable`; `text_value text nullable`; `json_value jsonb nullable`; `quality_status text`; `evidence_count integer`; `lineage_hash text`; `created_at timestamptz`.
- **FKs:** `feature_version_id -> intelligence.feature_versions.id`; `run_id -> intelligence.feature_computation_runs.id`; `journey_instance_id -> orchestration.journey_instances.id`.
- **Unicidade:** `feature_version_id, subject_type, subject_id, journey_instance_id, window_start, window_end, as_of`.

#### `intelligence.score_definitions`

Identidade estável de score experimental.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `owner_organization_id uuid`; `code text`; `name text`; `purpose text`; `status text`; `allowed_uses text[]`; `prohibited_uses text[]`.
- **FKs:** `owner_organization_id -> iam.organizations.id`.
- **Unicidade:** `owner_organization_id, code`.

#### `intelligence.score_versions`

Modelo, inputs, calibração e limites versionados.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `score_definition_id uuid`; `version_number integer`; `status text`; `model_type text`; `model_reference text`; `input_schema jsonb`; `output_schema jsonb`; `decision_thresholds jsonb nullable`; `validation_status text`; `published_at timestamptz nullable`; `content_hash text`.
- **FKs:** `score_definition_id -> intelligence.score_definitions.id`.
- **Unicidade:** `score_definition_id, version_number`; `score_definition_id, content_hash`.

#### `intelligence.score_runs`

Execução de score em lote ou individual.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `score_version_id uuid`; `status text`; `run_type text`; `code_reference text`; `input_high_watermark timestamptz nullable`; `started_at timestamptz`; `completed_at timestamptz nullable`; `summary jsonb`.
- **FKs:** `score_version_id -> intelligence.score_versions.id`.

#### `intelligence.score_results`

Resultado derivado sem autoridade de crédito.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `score_version_id uuid`; `run_id uuid`; `subject_type text`; `subject_id uuid`; `journey_instance_id uuid nullable`; `score_value numeric nullable`; `score_band text nullable`; `uncertainty numeric nullable`; `input_snapshot_hash text`; `status text`; `calculated_at timestamptz`.
- **FKs:** `score_version_id -> intelligence.score_versions.id`; `run_id -> intelligence.score_runs.id`; `journey_instance_id -> orchestration.journey_instances.id`.
- **Unicidade:** `score_version_id, subject_type, subject_id, journey_instance_id, calculated_at`.

#### `intelligence.score_contributions`

Explicação por feature/entrada, sem expor PII.

- **PK:** `score_result_id, feature_version_id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `score_result_id uuid`; `feature_version_id uuid`; `feature_value_id uuid nullable`; `contribution numeric nullable`; `rank integer nullable`; `explanation jsonb`.
- **FKs:** `score_result_id -> intelligence.score_results.id`; `feature_version_id -> intelligence.feature_versions.id`; `feature_value_id -> intelligence.feature_values.id`.

#### `intelligence.validation_runs`

Validação temporal, técnica, de utilidade e equidade.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `target_type text`; `target_version_id uuid`; `validation_type text`; `dataset_reference text`; `status text`; `methodology jsonb`; `started_at timestamptz`; `completed_at timestamptz nullable`; `approved_for_use boolean`; `limitations jsonb`.

#### `intelligence.validation_metrics`

Métricas de uma validação por segmento/janela.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `validation_run_id uuid`; `metric_code text`; `segment_reference text nullable`; `metric_value numeric nullable`; `metric_json jsonb nullable`; `confidence_interval jsonb nullable`.
- **FKs:** `validation_run_id -> intelligence.validation_runs.id`.

### `governance`

#### `governance.purposes`

Finalidades documentadas de tratamento.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `code text`; `name text`; `description text`; `status text`; `legal_basis_reference text nullable`.
- **Unicidade:** `code`.

#### `governance.consent_records`

Registro append-only de concessão, recusa ou revogação.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `true`
- **Colunas principais:** `id uuid`; `entrepreneur_id uuid`; `purpose_id uuid`; `policy_version text`; `status text`; `captured_at timestamptz`; `channel text`; `evidence_reference text`; `supersedes_consent_id uuid nullable`.
- **FKs:** `entrepreneur_id -> core.entrepreneurs.id`; `purpose_id -> governance.purposes.id`; `supersedes_consent_id -> governance.consent_records.id`.

#### `governance.privacy_requests`

Solicitações de acesso, correção, oposição, exclusão ou revisão.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `entrepreneur_id uuid nullable`; `request_type text`; `status text`; `requested_at timestamptz`; `due_at timestamptz nullable`; `completed_at timestamptz nullable`; `request_reference text`; `resolution_summary text nullable`.
- **FKs:** `entrepreneur_id -> core.entrepreneurs.id`.

#### `governance.retention_policies`

Regras de retenção por classe e store.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `code text`; `data_class text`; `store_reference text`; `retention_interval interval nullable`; `deletion_action text`; `legal_hold_supported boolean`; `status text`; `effective_from date`.
- **Unicidade:** `code`.

#### `governance.data_lineage_edges`

Relações de linhagem entre dados, eventos, features, scores e destinos.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `from_type text`; `from_reference text`; `to_type text`; `to_reference text`; `transformation_reference text nullable`; `created_at timestamptz`.
- **Unicidade:** `from_type, from_reference, to_type, to_reference, transformation_reference`.

#### `governance.model_approvals`

Aprovação e limites de uso para diagnóstico, feature ou score.

- **PK:** `id`
- **Fonte:** `operational`
- **Append-only:** `false`
- **Colunas principais:** `id uuid`; `target_type text`; `target_version_id uuid`; `approval_scope text`; `status text`; `conditions jsonb`; `approved_by uuid nullable`; `approved_at timestamptz nullable`; `expires_at timestamptz nullable`.
- **FKs:** `approved_by -> iam.user_accounts.id`.

#### `governance.audit_log`

Ações privilegiadas e mudanças administrativas imutáveis.

- **PK:** `id`
- **Fonte:** `audit`
- **Append-only:** `true`
- **Colunas principais:** `id uuid`; `occurred_at timestamptz`; `actor_user_account_id uuid nullable`; `organization_id uuid nullable`; `action text`; `resource_type text`; `resource_id uuid nullable`; `request_id uuid nullable`; `before_hash text nullable`; `after_hash text nullable`; `details jsonb`; `privacy_class text`.
- **FKs:** `actor_user_account_id -> iam.user_accounts.id`; `organization_id -> iam.organizations.id`.
