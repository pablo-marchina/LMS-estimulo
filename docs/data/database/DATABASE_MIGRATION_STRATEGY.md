# Estratégia de migrations e transição da fundação atual

**Versão:** 0.1

## 1. Decisão

Não aplicar remendos no schema antigo. O modelo novo será criado lado a lado e os dados aproveitáveis serão migrados explicitamente.

## 2. Ondas de migration

### M00 — infraestrutura de banco

- extensões;
- schemas;
- roles;
- funções auxiliares;
- tabela de controle de migrations.

### M01 — identidade e governança básica

- contas;
- organizações;
- empreendedores;
- negócios e vínculos;
- permissões;
- finalidades/consentimento;
- arquivos.

### M02 — catálogo e versionamento

- programas;
- jornadas;
- cursos;
- atividades;
- competências;
- regras;
- assets.

### M03 — orquestração e diagnóstico

- trilhas/passos/transições;
- inscrições e instâncias;
- diagnóstico, segmentos e personalização.

### M04 — avaliação, prática e gamificação

- avaliações;
- submissões/rubricas;
- pontos;
- selos;
- certificados.

### M05 — eventos e processamento

- schemas de eventos;
- events/outbox/inbox;
- deliveries/dead letters;
- checkpoints.

### M06 — integração

- connections;
- mappings;
- jobs;
- webhooks;
- conflitos/reconciliação.

### M07 — inteligência

- feature store;
- score store;
- validações/aprovações.

### M08 — views, RLS e grants

- API views/functions;
- policies;
- privilégios;
- testes de isolamento.

## 3. Mapeamento do schema antigo

| Antigo | Novo | Política |
|---|---|---|
| `users` | `iam.user_accounts` + `core.entrepreneurs` | migrar somente perfis reais e reconciliar auth |
| `partners` | `iam.organizations` | migrar como organização tipo partner |
| `teachers` | conta/membership/contributor | evitar entidade paralela sem identidade |
| `courses` | definition + version | criar snapshot v1 |
| `tracks` | path templates/steps | converter regras textuais manualmente |
| `modules` | catalog.modules | migrar estrutura editorial |
| `lessons` | activity definition/version | converter mídia e metadados |
| `lesson_assets` | content_assets/file_objects | validar URLs e segurança |
| `lesson_progress` | projeção/import legado | não fabricar histórico de eventos |
| `assessments/questions` | assessment specs/questions | publicar versão explícita |
| `quiz_attempts/answers` | attempts/responses/results | migrar apenas se dados reais e íntegros |
| `submissions/reviews` | submissions/evidence/reviews | validar consentimento e arquivos |
| `points` | point_ledger | importar com regra `legacy_import` e idempotência |
| `badges/user_badges` | definitions/versions/awards | guardar evidência legada |
| `certificates` | definitions/versions/issuances | manter código e snapshot |
| `notifications` | intervenção/notificação | migrar somente se operacionalmente necessário |

## 4. Dados legados sem eventos

Nunca gerar eventos comportamentais detalhados retroativamente a partir de um estado agregado. Exemplo:

- `lesson_progress.completed_at` pode gerar um registro de importação/snapshot;
- não pode gerar sessões, revisitas ou sequência inexistentes;
- features que exigem comportamento granular devem marcar `insufficient_evidence` para dados legados.

## 5. Estratégia de rollout

1. criar schema novo;
2. carregar conteúdo OpenAI validado;
3. criar segunda jornada sintética para teste multi-jornada;
4. validar integrações em sandbox;
5. executar dual-read apenas em staging, se necessário;
6. migrar usuários/conteúdo elegível;
7. congelar escrita no schema antigo;
8. cutover;
9. reconciliar contagens e hashes;
10. manter rollback de aplicação e backup do schema anterior.

## 6. Regras de migration produtiva

- uma migration por mudança coerente;
- sem edição de migrations já aplicadas;
- expansão antes de contração;
- mudanças destrutivas em múltiplos deploys;
- migrations testadas do zero e sobre snapshot anterior;
- índices grandes de forma concorrente quando aplicável;
- backfills idempotentes e observáveis;
- cada migration com plano de rollback ou forward-fix.
