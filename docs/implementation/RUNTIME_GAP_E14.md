# E14-R1 — fonte, contratos e comportamento do runtime

**Versão:** 0.5  
**Data:** 2026-07-10  
**Status:** concluído  
**Ambiente de referência:** Supabase de desenvolvimento/teste `cfpfeavjlgheqqiaqtzv`

## 1. Histórico executável

| Grupo | Quantidade | SQL remoto | Fingerprint ordenado |
|---|---:|---:|---|
| M00–M12 | 76 | 411.340 bytes | `663173105a16924db650127f437900de0ad3422b2f7bf50a5e804f19d1a570a3` |
| M13 | 165 | 123.636 bytes | `6df68289eb6de6a47f84f6bb8dae0761c75f148132dd99341e739e8f4a62f144` |
| M14/M14b | 2 | 12.045 bytes | `8b3cb9b361f2bbff69d784ef92767de14795f761c1159321e8b163ccde96fde0` |
| **Total** | **243** | **547.021 bytes** | três manifests validados |

As versões, nomes, statements e hashes remotos estão materializados em `supabase/migrations` e `supabase/canonical-migrations`.

## 2. Replay e equivalência

O workflow `.github/workflows/e14-clean-replay.yml` usa `supabase/postgres:17.6.1.136` e:

1. valida os três manifests;
2. aplica as 243 migrations, uma transação por migration;
3. compara nove categorias estruturais com o baseline remoto;
4. valida os 18 contratos públicos;
5. executa o backend E2E.

```text
clean_replay_passed = true
schema_equivalence_passed = true
```

As categorias equivalentes são schemas, relações/RLS, colunas, constraints, índices, triggers, policies, rotinas e tipos.

## 3. Contratos públicos

A fronteira pública contém:

```text
rpc_count = 18
commands = 11
queries = 6
identity_operations = 1
contract_sha256 = b751369fb873eb50a423ed7d74614a6c75e4480058e79e6a63006ec10920336f
public_rpc_contracts_passed = true
```

O gate protege assinatura, argumentos, retorno, linguagem, volatilidade, corpo SQL, `SECURITY DEFINER`, `search_path`, grants e mapa aplicativo→RPC.

Execução permitida: `postgres`, `service_role` e `app_worker`. `PUBLIC`, `anon` e `authenticated` não executam os RPCs.

## 4. Backend E2E

A vertical foi reproduzida em PostgreSQL efêmero, com uma transação independente por RPC:

- publicação e matrícula;
- jornada e diagnóstico;
- caminho `standard`;
- atividade e quatro seções;
- quick check reprovado e aprovado;
- progresso e pontos;
- eventos e outbox;
- consultas de participante e operador;
- autorização e RLS negativas;
- idempotência e concorrência otimista.

```text
backend_e2e_replayed = true
journey_events = 35
total_event_delta = 39
outbox_delta = 39
successful_submission_correlated_events = 8
point_ledger_entries = 2
point_ledger_sum = 7
```

Evidência detalhada: [E14_BACKEND_E2E.md](E14_BACKEND_E2E.md).

## 5. Dados fora do histórico

O E2E identificou configurações existentes no Supabase de teste que não foram criadas por `supabase_migrations.schema_migrations`:

- quatro itens diagnósticos e dezesseis opções;
- dois caminhos e duas etapas;
- vinte e nove IDs canônicos de schemas de eventos.

Esses registros são materializados apenas como fixtures no banco efêmero. A revisão do delta de schema deve decidir quais serão configuração oficial versionada e quais permanecerão sintéticos.

## 6. Dívida técnica remanescente

O runtime contém helpers `app_private.e14_*` com nomes opacos e aliases extensos. Os 18 contratos públicos e o E2E agora permitem refatoração incremental segura, mas o padrão não pode ser ampliado.

Regras para a próxima implementação:

1. preservar os 18 RPCs públicos;
2. usar nomes semânticos em novos helpers;
3. comparar resultado, erros, eventos e outbox;
4. remover aliases somente depois de eliminar consumidores;
5. não criar subsistemas paralelos.

## 7. Comandos permanentes

```bash
npm run validate:e14-runtime-history
npm run replay:e14-clean
npm run validate:e14-schema-equivalence
npm run validate:e14-public-contracts
npm run test:e14-backend-e2e
npm run test:e14-database-gates
```

## 8. Próxima etapa

```text
E14-R1a = concluído
E14-R1b = concluído
E14-R1c = concluído
E14-R1d = concluído
→ concluir o delta final de schema
→ impedir expansão dos helpers opacos
→ somente então definir a próxima migration funcional
```

Supabase permanece restrito a desenvolvimento/teste. AWS continua obrigatória para staging e produção.
