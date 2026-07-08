# Auditoria do schema inicial

**Versão:** 0.1  
**Status:** Concluída para o schema recebido

## Resumo

O schema atual é um protótipo relacional de LMS tradicional. Ele representa cursos, parceiros, professores, trilhas, módulos, aulas, materiais, progresso, avaliações, entregas, selos, certificados, pontos, recompensas, notificações, configurações e logs.

Ele não é suficiente para o produto de Capacitação de Crédito, pois não preserva a jornada como definição versionada, não modela empreendedor e empresa separadamente, não possui inscrições/instâncias de jornada, não registra eventos comportamentais, não suporta intervenções, não possui linhagem de features/score e não integra HubSpot.

## Problemas de modelagem críticos

### SCH-001 — Ausência de organização, empresa e vínculos

`users` contém `business_name` como texto. Isso impede representar:

- uma empresa com múltiplos representantes;
- um empreendedor associado a mais de uma empresa;
- dados empresariais versionados;
- IDs externos do HubSpot/crédito;
- segmentação e autorização por organização.

### SCH-002 — Curso, jornada, trilha e módulo estão semanticamente misturados

A tabela `courses` funciona como produto principal; `tracks` e `modules` carregam regras de desbloqueio como texto livre. Não existem `journey_definitions`, `journey_versions`, `journey_instances`, etapas e regras executáveis/versionadas.

### SCH-003 — Não há inscrição nem instância de participação

`lesson_progress` liga usuário diretamente à aula. Isso não registra:

- quando e por que a jornada foi atribuída;
- segmento/coorte;
- versão da jornada;
- trilha escolhida;
- estado da participação;
- reatribuição, pausa, expiração ou conclusão.

### SCH-004 — Progresso é estado agregado sem fatos comportamentais

`lesson_progress` guarda segundos e `completed_at`, mas não registra sessões, sequência, retomadas, tentativas, origem, contexto, intervenção ou dispositivo.

### SCH-005 — Tipos e enums são específicos da Jornada OpenAI

`point_action` e `certificate_kind` exigem migration de enum para cada nova jornada/regra. Isso viola a extensibilidade desejada.

### SCH-006 — Não há versionamento editorial

Cursos, aulas, avaliações, perguntas, badges e certificados podem ser alterados sem preservar a versão que um participante consumiu.

### SCH-007 — Não há event store/outbox

Sem `event_log`, `event_outbox`, estado de processamento, retries ou dead-letter, não é possível garantir fluxo confiável para features, score e HubSpot.

### SCH-008 — Não há features, score ou linhagem

Faltam definições, versões, runs, valores, explicações e validações.

## Problemas de integridade e segurança

### SCH-009 — Conteúdo estrutural pode ficar público indevidamente

As policies de `tracks`, `modules`, `lesson_assets`, relações e taxonomias usam `using (true)` e não verificam se o curso/aula pai está publicado. Isso pode expor estrutura e assets de rascunhos.

### SCH-010 — Administração não possui policies próprias

O schema não cria policies/grants para admin gerenciar cursos, aulas, avaliações, badges ou revisões usando sessão de usuário. Apenas `service_role` possui CRUD amplo.

### SCH-011 — Perfil público não é criado automaticamente

Não há trigger de `auth.users` para `public.users`.

### SCH-012 — Entregas podem ser alteradas pelo próprio usuário após revisão

A policy `users manage own submissions` concede `for all`; não existe regra por status para impedir alteração/deleção depois de revisão ou seleção como destaque.

### SCH-013 — Pontos não têm chave de idempotência

Há ledger, mas não há constraint que impeça conceder o mesmo ponto múltiplas vezes para a mesma ação/referência/regra.

### SCH-014 — `reference_id` não possui tipo nem integridade referencial

Não é possível saber a entidade de origem do ponto nem validar sua existência.

### SCH-015 — Certificação não preserva versão do requisito

O certificado referencia curso e tipo, mas não versão da jornada, critérios aplicados, evidências ou score de avaliações.

### SCH-016 — Timestamps `updated_at` não possuem mecanismo de atualização

As colunas existem, mas não há trigger padrão para mantê-las.

### SCH-017 — Estados livres em texto

`tracks.status` e `modules.status` aceitam qualquer texto; regras de desbloqueio também são texto não executável.

### SCH-018 — Settings globais e pessoais são ambíguos

`settings.user_id` é opcional e a unicidade `(user_id, key)` não impede múltiplas linhas globais com `user_id is null` no PostgreSQL.

## Entidades mínimas ausentes no modelo-alvo

- organizations, entrepreneurs, businesses, memberships, external_identities;
- programs, journey_definitions, journey_versions, path_definitions, journey_instances;
- enrollments/cohorts/assignments;
- diagnostic_definitions, versions, dimensions, sessions, responses, results;
- archetype definitions/versions/assignments;
- intervention definitions/rules/instances/deliveries;
- event schemas/log/outbox/processing/dead-letter;
- feature definitions/versions/runs/values;
- score definitions/versions/runs/results/explanations/validation;
- integration connections, external mappings, sync queue/history;
- consent, privacy requests, retention and lineage.

## Decisão inicial

O schema atual não deve receber remendos incrementais até que o modelo de domínio e os fluxos de eventos estejam definidos. Ele poderá fornecer ideias e nomes, mas o caminho recomendado é criar migrations novas a partir de um modelo-alvo revisado e migrar apenas os dados de conteúdo que forem aproveitados.
