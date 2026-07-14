# Registro de bloqueadores e plano de ação

**Versão:** 4.0  
**Data:** 2026-07-14  
**Status:** ativo

## Regras

- `P0` bloqueia a vertical oficial ou a entrada de usuários reais;
- `P1` bloqueia a produção controlada;
- `P2` bloqueia o aceite final, mas pode ser concluído após o início da produção controlada;
- uma dívida técnica contida não é bloqueador sem risco ou dependência concreta;
- encerramento exige evidência executável proporcional ao requisito;
- migrations aplicadas não são editadas;
- fixtures e configurações sintéticas podem provar capacidade técnica, mas não encerram requisitos oficiais;
- trabalho independente deve prosseguir em paralelo enquanto artefatos externos estão pendentes.

## Estado consolidado

Já estão concluídos e não devem ser reconstruídos:

- replay e equivalência das 245 migrations;
- contratos públicos de RPC, RLS, idempotência, concorrência, eventos e outbox;
- backend E2E da fundação;
- aplicação Next.js e rotas iniciais;
- motor configurável de formulário, arquétipo e ativação;
- persistência transacional do resultado configurável;
- projeções HubSpot pela outbox;
- baseline documental do diagnóstico em 12 perguntas, 5 dimensões e 4 arquétipos;
- CI, build e instalação reproduzível em Linux e Windows;
- contenção do legado.

Esses itens são fundação técnica. Eles não provam que o produto oficial esteja pronto.

## Bloqueadores ativos

| ID | Severidade | Área | Lacuna necessária | Critério de encerramento |
|---|---|---|---|---|
| `DIAGNOSTIC-OFFICIAL-CONFIGURATION` | P0 | Produto/Diagnóstico | IR-008 ainda não contém texto/opções homologados, scoring, cortes, empate, textos finais, casos oficiais e ativações | configuração draft reproduzível somente a partir dos artefatos aprovados, equivalência com casos oficiais, publicação controlada e diagnóstico E2E |
| `OPENAI-JOURNEY-PUBLICATION` | P0 | Conteúdo/Produto | IR-005 ainda não fecha ativos, avaliações, práticas, durações, progressão, pontos, selos, certificados, acessibilidade e direitos | versão draft completa, validada editorialmente, publicada em desenvolvimento/teste e executável sem conteúdo fictício |
| `FRONTEND-OFFICIAL-VERTICAL` | P0 | Frontend | as seis rotas iniciais não formam a experiência oficial completa do participante e da operação | diagnóstico, resultado, dashboard, jornada, aula, progresso e administração mínima funcionando com dados reais do runtime e todos os estados críticos |
| `LMS-MUST-HAVES` | P0 | Produto/Frontend | comentários, uploads, provas, selos e certificados não funcionam de ponta a ponta | issues #61, #64 e #65 concluídas com persistência, autorização, eventos, operação e testes; adapters de storage/scan integrados ou removidos |
| `IDENTITY-SITE-INTEGRATION` | P0 | Identidade/Site | login real, identidade única e entrada pelo site Estímulo não foram comprovados | IR-009 atendido, sessão real, permissões, vínculo de identidade e navegação site→LMS testados |
| `HUBSPOT-PHYSICAL-INTEGRATION` | P1 | Integração | conta, objetos, propriedades, associações e adapter real não foram inventariados ou testados | IR-002 atendido, matriz de projeção aprovada, adapter real, retry, reconciliação e E2E no sandbox |
| `BROWSER-ACCESSIBILITY` | P1 | Experiência | fluxo oficial em navegador, mobile e acessibilidade não foi comprovado | E2E dos fluxos críticos em desktop/mobile e auditoria de acessibilidade sem bloqueadores |
| `AWS-STAGING` | P1 | Infraestrutura | staging AWS ainda não foi implantado e validado | deploy, domínio/TLS, secrets, logs, backup, restore e rollback comprovados |
| `PARTNER-CONTENT` | P2 | Conteúdo | conteúdo autorizado de parceiros ainda não pode ser embedado ou redirecionado com tracking | issue #62 concluída com metadados de direitos, disponibilidade, tracking e fallback |
| `REWARDS-REDEMPTION` | P2 | Gamificação | ledger e saldo existem, mas catálogo e resgate mínimo ainda não estão operacionais | catálogo simples, solicitação, aprovação manual, histórico e status de resgate funcionando |
| `AUTHORIZED-CREDIT-CONTEXT` | P2 | Personalização | o momento autorizado da jornada de crédito ainda não alimenta personalização | estados permitidos e identificadores aprovados, leitura integrada e personalização sem efeito decisório de crédito |

## Subgates do diagnóstico oficial

```text
official_question_count = 12
official_dimension_count = 5
official_archetype_count = 4
maturity_is_separate_axis = true
prototype_q13_is_official = false
prototype_scoring_is_official = false
exact_question_wording_approved = false
exact_options_approved = false
scoring_method_received = false
tie_rule_approved = false
reference_cases_received = false
result_copy_approved = false
activation_matrix_approved = false
```

A contagem, as dimensões e os nomes não precisam ser rediscutidos sem nova decisão formal. O bloqueio está nos artefatos exatos e na metodologia ausente.

## Subgates da Jornada OpenAI

```text
journey_structure_reconciled = true
final_assets_received = false
assessment_bank_approved = false
practice_rules_approved = false
progression_rules_approved = false
points_and_credentials_approved = false
accessibility_assets_received = false
usage_rights_confirmed = false
published_runtime_version = false
```

A estrutura pode ser implementada genericamente. A publicação oficial depende dos ativos e regras finais.

## Trabalho que deve prosseguir agora

Enquanto IR-008, IR-005, IR-009 e IR-002 são obtidos, a implementação não deve ficar parada. Podem ser concluídas, sem inventar conteúdo oficial:

1. comentários por aula — issue #61;
2. upload de prática e integração dos adapters existentes — issue #64;
3. infraestrutura versionada de avaliações, selos e certificados — issue #65;
4. frontend do participante para jornada, aula, progresso e estados de erro/vazio/carregamento;
5. administração mínima das capacidades acima;
6. testes E2E com fixtures explicitamente técnicas e nunca apresentadas como conteúdo oficial.

Essas capacidades devem ser genéricas e reutilizar o runtime existente. Perguntas, scoring, textos e ativos oficiais entram somente quando aprovados.

## Plano de ação vigente

### Fase 0 — Fundação e limpeza — concluída

- remover excessos do caminho crítico;
- recuperar e validar migrations;
- estabilizar runtime, CI e frontend inicial;
- implementar motor configurável, persistência e outbox;
- reconciliar a baseline documental do diagnóstico.

### Fase 1 — Capacidades independentes e entradas oficiais — atual

Executar em paralelo:

**Frente A — obter entradas:**

- IR-008: diagnóstico e arquétipos;
- IR-005: conteúdo final da Jornada OpenAI;
- IR-009: site, login e identidade;
- IR-002: inventário HubSpot.

**Frente B — implementar capacidades independentes:**

- comentários;
- uploads e scan;
- avaliações versionadas;
- selos e certificados;
- frontend participante;
- administração mínima;
- eventos e testes dessas ações.

**Gate F1:** capacidades LMS funcionam em desenvolvimento/teste com fixtures técnicas, sem alegação de produto oficial.

### Fase 2 — Vertical oficial em desenvolvimento/teste

Após receber IR-008 e IR-005:

1. carregar diagnóstico e Jornada OpenAI como drafts versionados;
2. executar casos oficiais de referência;
3. corrigir divergências sem heurísticas próprias;
4. publicar versões controladas em desenvolvimento/teste;
5. conectar diagnóstico, personalização, jornada, aulas, avaliações e credenciais ao frontend;
6. executar E2E da vertical oficial.

**Gate F2:** um participante completa diagnóstico→resultado→jornada→aula→avaliação→progresso→credencial usando configuração oficial.

### Fase 3 — Integrações reais

1. integrar site, sessão e identidade;
2. implementar adapter HubSpot real e reconciliação;
3. projetar diagnóstico, progresso e conclusão;
4. integrar contexto de crédito somente quando autorizado;
5. executar E2E das integrações em sandbox.

**Gate F3:** usuário real entra pelo site, usa o LMS e possui estado relevante reconciliado no HubSpot.

### Fase 4 — Qualidade e AWS staging

1. concluir browser E2E;
2. corrigir mobile e acessibilidade dos fluxos críticos;
3. implantar AWS staging;
4. validar segurança necessária, logs, backup, restore e rollback;
5. executar o fluxo oficial completo em staging.

**Gate F4:** staging aprovado para uma coorte pequena.

### Fase 5 — Produção controlada

1. implantar produção;
2. liberar uma coorte pequena;
3. acompanhar erros, uploads, certificados, eventos e sincronizações;
4. corrigir bloqueadores observados;
5. ampliar somente após estabilidade.

**Gate F5:** coorte executa o fluxo oficial sem bloqueador P0/P1.

### Fase 6 — Aceite final

1. concluir conteúdo de parceiros;
2. concluir catálogo e resgate mínimo de recompensas;
3. concluir contexto autorizado de crédito;
4. auditar produto, runtime e documentação contra as referências;
5. encerrar somente sem bloqueador P0/P1/P2 não aceito formalmente.

## Dívida técnica não bloqueante

### RPCs e helpers legados

```text
legacy_function_count = 114
legacy_private_helper_count = 106
legacy_public_rpc_count = 8
legacy_surface_inventoried = true
legacy_growth_blocked = true
public_contracts_preserved = true
backend_e2e_passed = true
```

Não será executada substituição em massa. Um componente legado entra no caminho crítico somente quando bloquear requisito obrigatório, AWS, segurança, integridade ou manutenção da área alterada.

### Nomenclatura

Nomenclatura semântica é recomendação de manutenção, não gate funcional. Identificadores históricos permanecem quando necessários para replay e compatibilidade.

## Gates técnicos encerrados

```text
recovered_migration_count = 245
clean_replay_passed = true
schema_equivalence_passed = true
public_rpc_contracts_passed = true
backend_e2e_replayed = true
configurable_product_persistence_e2e_passed = true
rls_negative_checks_passed = true
idempotency_and_concurrency_passed = true
events_and_outbox_passed = true
canonical_package_lock_present = true
clean_install_linux_passed = true
clean_install_windows_passed = true
typecheck_and_build_passed = true
```

## Trabalho explicitamente fora do caminho crítico

- refatoração cosmética;
- substituição integral do legado contido;
- scoring derivado do protótipo;
- nova pesquisa de arquétipos substituindo os quatro oficiais;
- segunda jornada antes da OpenAI;
- aplicativo móvel nativo;
- marketplace ou comunidade completos;
- modelo produtivo de decisão de crédito;
- infraestrutura multi-região;
- dashboards avançados antes do fluxo oficial.
