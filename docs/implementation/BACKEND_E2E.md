# Backend E2E reproduzível

**Data:** 2026-07-10  
**Estado:** concluído  
**Ambiente:** PostgreSQL 17.6 efêmero no GitHub Actions

## Resultado

A vertical técnica atual foi reproduzida depois do replay das 244 migrations, sem consultar nem alterar o Supabase remoto durante a execução comportamental.

```text
clean_replay_passed = true
schema_equivalence_passed = true
public_rpc_contracts_passed = true
backend_e2e_replayed = true
transaction_model = one_transaction_per_rpc
cleanup = ephemeral_postgres_container
```

## Fluxo comprovado

1. publicação imutável da versão da jornada;
2. replay da publicação sem novos efeitos;
3. matrícula sintética;
4. início da jornada;
5. diagnóstico com quatro respostas;
6. atribuição do caminho `standard`;
7. início de atividade;
8. confirmação de quatro seções sem duplicação;
9. primeira tentativa de quick check reprovada;
10. segunda tentativa aprovada;
11. conclusão de etapa, caminho e jornada;
12. projeção final para participante e operador.

## Invariantes comprovados

```text
journey_events = 35
total_event_delta = 39
outbox_delta = 39
successful_submission_correlated_events = 8
point_ledger_entries = 2
point_ledger_sum = 7
final_progress = 1
final_point_balance = 7
accepted_sections = 4
passing_attempt_number = 2
```

O replay da submissão aprovada preserva o mesmo resultado e não cria novos eventos, outbox ou lançamentos de pontos.

## Provas negativas

- `IDEMPOTENCY_KEY_REUSED` para mesma chave com payload diferente;
- `AGGREGATE_VERSION_CONFLICT` para versão agregada obsoleta;
- `PUBLISHED_VERSION_IMMUTABLE` para mutação de versão publicada;
- `FORBIDDEN` para ator sem permissão;
- participante não acessa estado de outro contexto;
- ator não relacionado não lê nem altera empreendedor ou instância de jornada por RLS;
- role `authenticated` não executa RPCs exclusivos do servidor.

## Dados de referência ausentes do histórico original

O replay estrutural revelou configurações no Supabase de teste que não foram criadas pelo histórico original:

- quatro itens diagnósticos;
- dezesseis opções;
- dois caminhos;
- duas etapas de caminho;
- vinte e nove IDs canônicos de schemas de eventos.

Esses registros são materializados como fixtures explícitas em `scripts/database/backend-e2e`, somente no PostgreSQL efêmero. Eles não foram transformados retroativamente em migrations.

## Execução

```bash
npm run test:database-gates
```

O comando valida os quatro manifests, reproduz as 244 migrations, compara o schema, congela os 18 RPCs e executa este E2E.

## Limite

Esta prova fecha o bloqueio de fonte, replay, contratos e comportamento do runtime atual. Ela não autoriza automaticamente migrations funcionais nem transforma o PostgreSQL em autoridade dos dados de negócio.
