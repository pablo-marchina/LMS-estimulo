# Dicionário de dados — orientação vigente

**Revisado em:** 2026-09-01  
**Status:** referência semântica; o catálogo físico é reconstruído das migrations

A antiga versão deste arquivo descrevia um modelo-alvo preliminar e uma contagem estática de tabelas. Ela deixou de ser segura como dicionário físico depois da evolução executável do banco. Para impedir divergência, nomes de colunas, FKs, funções, contagens e tipos são obtidos de `supabase/migrations/` e dos artefatos de equivalência.

## Convenções

- UUID interno não é substituído por identificador externo;
- timestamps operacionais usam `timestamptz`/UTC conforme migrations;
- eventos, ledgers, aceites e auditoria preservam histórico;
- JSONB é usado para configuração/snapshot onde o relacionamento essencial continua explícito;
- RLS e grants fazem parte do contrato de cada tabela/função;
- projeções podem ser reconstruídas quando sua fonte histórica permite.

## Vocabulário por schema

| Schema | Dados principais |
|---|---|
| `iam` | contas, organizações, memberships, papéis e permissões |
| `core` | empreendedores, negócios, vínculos, arquivos e aquisição |
| `catalog` | programas, jornada operacional, biblioteca, atividades, conteúdos e temas |
| `orchestration` | matrículas, instâncias, trilhas, etapas e progresso |
| `diagnostics` | definições/versões de diagnóstico, perguntas, respostas, resultados e arquétipos |
| `assessment` | avaliações, quick checks, tentativas, entregas e revisões |
| `engagement` | pontos, carteira, ranking, recompensas, badges e certificados |
| `experience` | configurações, interface e B2B |
| `behavior` | eventos/snapshots analíticos e score comportamental |
| `eventing` | eventos, outbox, inbox e estado de entrega |
| `integration` | mapeamentos e estado de integrações externas |
| `governance` | documentos legais, aceites, retenção e auditoria |
| `reporting` | read models/projeções |
| `app_private` | helpers internos não públicos |
| `public` | facades/RPCs autorizadas |

## Jornada e nomenclatura legada

`catalog.journey_versions` permanece no schema por compatibilidade, mas a experiência de produto usa uma única linha operacional por jornada. Não interpretar `version_number`, `journey_version_id` ou nomes semelhantes como suporte atual a múltiplos snapshots editoriais.

## Campos sensíveis

- CPF bruto não deve aparecer em URL, metadata pública, evento ou log;
- credenciais, tokens e service role nunca são dados de domínio versionados;
- ranking público recebe identificação mascarada;
- URLs assinadas de arquivos são temporárias e não devem ser persistidas como fato durável.

## Como consultar o dicionário físico

1. reconstruir o banco com `npm run replay:database-clean`;
2. validar equivalência com `npm run validate:schema-equivalence`;
3. inspecionar o catálogo PostgreSQL resultante;
4. usar [`DATABASE_MODEL.md`](DATABASE_MODEL.md) para semântica e [`DATABASE_ERD.md`](DATABASE_ERD.md) para visão resumida.

Não atualizar este documento copiando dumps ou contagens transitórias do CI.