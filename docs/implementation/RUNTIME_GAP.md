# Fonte, contratos e comportamento do runtime

**Versão:** 1.1  
**Data:** 2026-07-14  
**Status:** fundação reproduzida; produto oficial ainda não carregado  
**Ambiente de referência:** Supabase de desenvolvimento/teste `cfpfeavjlgheqqiaqtzv`

## Histórico executável

| Grupo | Quantidade | SQL remoto | Fingerprint ordenado |
|---|---:|---:|---|
| M00–M12 | 76 | 411.340 bytes | `663173105a16924db650127f437900de0ad3422b2f7bf50a5e804f19d1a570a3` |
| M13 | 165 | 123.636 bytes | `6df68289eb6de6a47f84f6bb8dae0761c75f148132dd99341e739e8f4a62f144` |
| M14/M14b | 2 | 12.045 bytes | `8b3cb9b361f2bbff69d784ef92767de14795f761c1159321e8b163ccde96fde0` |
| M15a | 1 | 1.536 bytes | `8fbc1cc944fefa9e9bd5cfed4deb572c07d730162b5267b3074ce511fd867d96` |
| **Total** | **244** | **548.557 bytes** | quatro manifests validados |

## Gates comprovados

```text
clean_replay_passed = true
schema_equivalence_passed = true
public_rpc_count = 18
public_rpc_contracts_passed = true
backend_e2e_replayed = true
rls_negative_checks_passed = true
idempotency_and_concurrency_passed = true
events_and_outbox_passed = true
```

O workflow `.github/workflows/database-gates.yml` reconstrói o banco, verifica equivalência, valida contratos e executa o backend E2E.

## Backend E2E

A vertical sintética comprova:

- publicação e matrícula;
- jornada e diagnóstico;
- atividade e seções;
- quick check reprovado e aprovado;
- progresso e pontos;
- eventos e outbox;
- consultas de participante e operador;
- autorização, RLS, idempotência e concorrência.

```text
journey_events = 35
total_event_delta = 39
outbox_delta = 39
point_ledger_entries = 2
point_ledger_sum = 7
```

Evidência detalhada: [BACKEND_E2E.md](BACKEND_E2E.md).

## Fixtures técnicas

O replay usa:

- quatro itens diagnósticos e dezesseis opções;
- dois caminhos e duas etapas;
- vinte e nove IDs de schemas de eventos.

Esses dados são somente fixtures. Devem ser substituídos pela configuração oficial sem reconstruir a fundação.

## Lacunas funcionais

- formulário, scoring e quatro arquétipos oficiais;
- Jornada OpenAI e avaliações reais;
- comentários, uploads, provas, selos e certificados;
- identidade e integração com o site;
- adapter HubSpot real;
- browser E2E e acessibilidade;
- AWS staging.

## Dívida técnica

Os helpers e RPCs opacos permanecem como compatibilidade histórica. A superfície está inventariada, isolada e impedida de crescer.

A substituição integral não é requisito de release. Um componente só será alterado quando bloquear uma capacidade necessária ou representar risco concreto.

## HubSpot

O runtime operacional permanece no LMS. Dados relevantes são projetados para o HubSpot por outbox e reconciliação.

O código existente de write/readback pode ser reutilizado em escritas CRM críticas, mas não define o fluxo obrigatório de toda ação do produto.

## Comandos permanentes

```bash
npm run validate:migration-history
npm run replay:database-clean
npm run validate:schema-equivalence
npm run validate:public-rpc-contracts
npm run test:backend-e2e
npm run test:database-gates
```

## Estado de saída

```text
foundation_reproducible = true
official_product_configuration_loaded = false
lms_must_haves_complete = false
hubspot_real_adapter_implemented = false
browser_e2e_passed = false
aws_staging_validated = false
legacy_replacement_required_for_release = false
```

Supabase permanece restrito a desenvolvimento/teste. AWS continua obrigatória para staging e produção.