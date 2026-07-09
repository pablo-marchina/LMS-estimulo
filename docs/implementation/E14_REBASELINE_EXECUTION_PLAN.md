# E14 — Plano de execução rebaselineado

**Versão:** 1.0  
**Data:** 2026-07-09  
**Status:** Em execução  
**Referência máxima:** `Estimulo_all` + ADR-002

## 1. Estado de partida confirmado

O repositório oficial já contém:

- backend real da vertical técnica E14 executado no Supabase de desenvolvimento/teste;
- migrations canônicas e histórico remoto reconciliado;
- aplicação Next.js em `apps/web`;
- seis rotas iniciais;
- bridge de identidade e camada de aplicação de servidor;
- build e typecheck aprovados no CI da fundação atual;
- eventos, outbox, idempotência, concorrência e pontos comprovados na vertical técnica.

Esse estado é uma fundação, não a conclusão do produto. Permanecem incompatibilidades com as premissas atuais:

- caminho genérico no lugar dos quatro arquétipos configuráveis;
- formulário e atribuição ainda não atendem ao ciclo completo de versão, recalculação e override;
- integração HubSpot real não está concluída;
- não existe registro completo de todas as ações ativas da interface;
- conteúdo externo ainda não é parte comprovada da vertical;
- E2E no navegador com sessão real e acessibilidade permanece pendente;
- AWS staging e produção ainda não foram provisionados e validados.

## 2. Objetivo da fase

Entregar uma vertical funcional e auditável em que:

```text
operador configura quatro arquétipos
→ cria e publica uma versão de formulário
→ cadastra conteúdo próprio ou externo
→ publica uma jornada versionada
→ participante autentica
→ responde e envia o formulário
→ motor atribui um dos quatro arquétipos
→ resultado e justificativa são preservados
→ estado relevante é projetado no HubSpot
→ participante recebe trilha compatível
→ consome conteúdo e realiza atividade/quick check
→ ações geram eventos estruturados
→ progresso e pontos são persistidos
→ operador consulta histórico, override e sincronização
```

A vertical será comprovada no Supabase de teste. Ela somente será candidata a deploy oficial depois da prova equivalente no AWS staging.

## 3. Sequência obrigatória

### E14-R0 — Rebaseline de decisões e documentação

**Objetivo:** eliminar premissas contraditórias antes de mudar o schema ou o código.

Entregas:

- ADR-002;
- atualização de premissas e escopo;
- atualização do Decision Log;
- matriz de rastreabilidade das novas premissas;
- inventário de documentos superados;
- plano de execução atual.

Gate:

```text
contradictory_active_premises = 0
supabase_production_claims = 0
aws_staging_production_target_explicit = true
four_archetypes_target_explicit = true
hubspot_user360_rule_explicit = true
external_content_requirement_explicit = true
```

### E14-R1 — Auditoria de lacunas do runtime e schema

**Objetivo:** reaproveitar o que já existe e impedir duplicação de tabelas ou regras.

Auditar M00–M14b, RPCs, `apps/web`, eventos e documentos nas áreas:

1. formulário e versionamento;
2. questões, opções e regras;
3. submissões, revisões e retomada;
4. quatro arquétipos e versões;
5. atribuições, histórico, justificativa, confiança e override;
6. conteúdo externo e direitos;
7. interação, eventos e outbox;
8. HubSpot mapping, jobs, retry, DLQ, reconciliação e readback;
9. portabilidade Supabase → AWS;
10. telas e ações ativas.

Cada estrutura será classificada como:

- `REUSE_AS_IS`;
- `EXTEND_EXISTING`;
- `MIGRATE_DATA`;
- `DEPRECATE`;
- `REMOVE`;
- `NEW_STRUCTURE_REQUIRED`.

Entregas:

- `SCHEMA_DELTA_E14.md`;
- `RUNTIME_GAP_E14.md`;
- `LEGACY_DEPRECATION_REGISTER.md`;
- migration M15 apenas se a auditoria comprovar necessidade.

Gate:

```text
new_tables_without_gap_evidence = 0
runtime_sources_of_truth_per_capability = 1
legacy_runtime_instructions = 0
supabase_specific_domain_dependencies = 0
aws_specific_domain_dependencies = 0
```

### E14-R2 — Formulário e quatro arquétipos configuráveis

**Objetivo:** substituir o caminho genérico pela regra de negócio real sem hardcode.

Backend:

- definição e versão do formulário;
- questões, opções e ordenação versionadas;
- drafts editáveis e publicação imutável;
- submissão incremental, retomada e idempotência;
- revisão de respostas com nova revision;
- quatro arquétipos ativos configurados como dados;
- interface `ArchetypeAssignmentStrategy`;
- resultado com versão, regra aplicada, evidências e justificativa;
- recalculação explícita;
- override autorizado com motivo e auditoria;
- eventos e outbox atômicos.

Frontend administrativo:

- criar/clonar/editar/publicar formulário;
- configurar quatro arquétipos;
- configurar regra de atribuição;
- consultar versões e histórico;
- recalcular e realizar override conforme permissão.

Frontend participante:

- iniciar, salvar, retomar e enviar formulário;
- receber resultado e mensagem configurada;
- revisar respostas quando permitido.

Gate:

```text
active_archetypes = 4
hardcoded_archetype_names = 0
published_form_mutations = 0
assignment_without_form_version = 0
assignment_without_rule_version = 0
override_without_reason = 0
historical_assignment_overwrites = 0
```

### E14-R3 — Conteúdo próprio e externo

**Objetivo:** operar conteúdo de terceiros por um contrato comum.

Implementar:

- modelo unificado de conteúdo;
- `ownership_type` e metadados de direitos;
- adapter de um provedor real;
- URL canônica, embed e fallback;
- disponibilidade e health check;
- capacidades de tracking declaradas;
- política de conclusão compatível com o provedor;
- eventos de abertura, início, progresso observável e conclusão comprovável.

A primeira implementação deve escolher apenas um entre YouTube, Vimeo ou Generic Web Embed, conforme o primeiro conteúdo autorizado real.

Gate:

```text
external_content_without_provider_contract = 0
external_content_without_rights_metadata = 0
completion_inferred_beyond_provider_capability = 0
provider_specific_logic_in_domain = 0
```

### E14-R4 — Registro integral das ações ativas

**Objetivo:** garantir que toda ação relevante disponível no produto gere dado governável.

Criar o `UI_INTERACTION_REGISTRY` com:

- ação;
- ator;
- rota/componente;
- comando ou observação;
- evento canônico;
- finalidade;
- classificação;
- retenção;
- campos obrigatórios;
- projeção HubSpot;
- testes.

Eventos mínimos da vertical:

- `diagnostic.form_started`;
- `diagnostic.answer_saved`;
- `diagnostic.answer_revised`;
- `diagnostic.submitted`;
- `diagnostic.archetype_assigned`;
- `diagnostic.archetype_recalculated`;
- `diagnostic.archetype_overridden`;
- `content.opened`;
- `content.started`;
- `content.progress_observed` quando suportado;
- `content.completed` quando comprovável;
- `assessment.started`;
- `assessment.answer_saved`;
- `assessment.submitted`;
- `activity.completed`;
- `progress.changed`;
- `gamification.points_awarded`;
- eventos de falha/replay de integração sem dados excessivos.

Gate CI:

```text
active_user_actions_without_registry = 0
registered_actions_without_event_contract = 0
events_without_purpose = 0
events_without_retention_class = 0
events_without_schema_validation = 0
```

### E14-R5 — HubSpot User 360 real

**Objetivo:** tornar o CRM a visão integrada do usuário sem transformá-lo no banco transacional.

Pré-requisitos:

- sandbox HubSpot;
- private app e scopes;
- inventário de objetos, propriedades, pipelines e workflows;
- política de deduplicação;
- identificação do proprietário operacional;
- limites de API e licença.

Implementar:

- matriz de projeção para todos os dados de usuário;
- mapping versionado;
- adapter HubSpot;
- worker assíncrono;
- idempotência;
- retry com backoff;
- DLQ;
- reconciliação;
- readback e comparação;
- painel de status e erros;
- replay autorizado.

Projeção inicial esperada:

| Dado | Representação HubSpot |
|---|---|
| Identidade do empreendedor | Contact |
| Negócio beneficiário | Company + associação |
| Matrícula/jornada atual | propriedade ou custom object |
| Formulário concluído | custom event |
| Versão do formulário | propriedade do evento |
| Arquétipo atual | propriedade atual do Contact |
| Histórico de atribuição/recalculo/override | custom events |
| Progresso atual | propriedade ou custom object |
| Conteúdo concluído | custom event |
| Última ação relevante | propriedade agregada |
| Status de sincronização | painel interno e referência técnica controlada |

Gate:

```text
user_domain_fields_without_projection_decision = 0
synchronous_business_dependency_on_hubspot = 0
hubspot_jobs_without_idempotency = 0
failed_jobs_without_retry_or_dlq = 0
successful_sync_without_readback = 0
```

### E14-R6 — Experiência completa e acessibilidade

**Objetivo:** ligar os casos de uso reais às interfaces sem lógica de negócio no navegador.

Regras:

- navegador → Next.js server/BFF → aplicação → domínio → portas/adapters;
- nenhuma service role ou segredo no cliente;
- frontend não calcula arquétipo, pontos ou conclusão;
- estados loading, vazio, erro, não autorizado, conflito, replay e sucesso;
- navegação completa por teclado;
- foco e mensagens anunciadas;
- status não comunicado somente por cor;
- responsividade sem perda funcional.

Gate:

```text
browser_direct_database_writes = 0
browser_direct_hubspot_writes = 0
business_rules_in_ui = 0
critical_routes_without_accessibility_proof = 0
```

### E14-R7 — E2E controlado no Supabase de teste

Executar sem edições manuais no banco:

1. operador configura quatro arquétipos;
2. operador publica formulário e jornada;
3. operador registra conteúdo externo real autorizado;
4. participante autentica com conta técnica;
5. participante responde e envia;
6. sistema atribui arquétipo;
7. participante recebe trilha;
8. participante consome conteúdo e completa quick check;
9. eventos, outbox, progresso e pontos são persistidos;
10. HubSpot sandbox recebe projeções e readback confirma;
11. participante revisa respostas e gera nova atribuição;
12. operador executa override autorizado;
13. histórico anterior permanece íntegro;
14. replay não duplica efeitos.

Repetir fluxos concorrentes e de falha.

Gate:

```text
manual_database_edits_in_e2e = 0
duplicate_effects_after_replay = 0
lost_assignment_history = 0
hubspot_reconciliation_mismatches = 0
critical_accessibility_failures = 0
```

### E14-R8 — AWS staging e prontidão de produção

**Objetivo:** provar a mesma release no ambiente oficial de deploy antes da produção.

Implementar por infraestrutura como código:

- rede e sub-redes;
- RDS/Aurora PostgreSQL;
- Cognito;
- S3;
- SQS e DLQ;
- Lambda/ECS conforme workers;
- ECR;
- Secrets Manager/SSM;
- KMS;
- CloudWatch/X-Ray/OpenTelemetry;
- WAF/CDN/load balancer conforme arquitetura final;
- backup, restore e disaster recovery;
- alarmes, SLOs e runbooks.

Provas obrigatórias:

- replay das mesmas migrations em PostgreSQL limpo;
- testes de contrato dos adapters Supabase e AWS;
- autenticação Cognito → identidade interna;
- autorização e isolamento equivalentes;
- upload/storage equivalente;
- fila, retry e DLQ equivalentes;
- HubSpot sandbox ou ambiente autorizado;
- restore real;
- teste de carga e custo;
- E2E completo da vertical.

Gate:

```text
supabase_promoted_to_production = false
aws_infrastructure_manual_drift = 0
aws_staging_e2e_passed = true
restore_proof_passed = true
adapter_contract_parity_passed = true
production_readiness_gate_ready = true
```

## 4. Ordem imediata de trabalho

1. concluir E14-R0;
2. auditar schema/runtime e produzir o delta E14-R1;
3. não criar M15 antes do delta aprovado;
4. implementar formulário e arquétipos E14-R2;
5. implementar um provedor externo E14-R3;
6. completar o registro de interações E14-R4;
7. implementar HubSpot real E14-R5;
8. fechar frontend e acessibilidade E14-R6;
9. executar E2E no Supabase de teste E14-R7;
10. provisionar e provar AWS staging E14-R8;
11. somente então avaliar promoção para produção.

## 5. Itens explicitamente adiados

- uso decisório de score para crédito;
- múltiplos provedores externos sem demanda real;
- ativação de todos os 118 eventos apenas por completude de catálogo;
- microserviços;
- produção no Supabase;
- migração automática de participantes entre versões;
- cópia de logs técnicos para HubSpot;
- decisões de AWS não sustentadas por carga, segurança ou custo medidos.

## 6. Regra de conclusão

Uma etapa somente será marcada como concluída quando código, banco, testes, documentação e evidência de runtime concordarem. Documento, migration aplicada manualmente ou tela isolada não constituem conclusão por si só.