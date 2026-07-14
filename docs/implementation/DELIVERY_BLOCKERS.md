# Registro de bloqueadores da entrega

**Versão:** 3.0  
**Data:** 2026-07-14  
**Status:** ativo

## Regras

- `P0` bloqueia a implementação oficial ou a entrada de usuários reais;
- `P1` deve ser resolvido antes da produção;
- uma dívida técnica contida não é bloqueador sem risco ou dependência concreta;
- encerramento exige evidência executável proporcional ao requisito;
- migrations aplicadas não são editadas.

## Bloqueadores ativos

| ID | Severidade | Área | Descrição | Bloqueia | Critério de encerramento |
|---|---|---|---|---|---|
| `PRODUCT-CONFIGURATION` | P0 | Produto | formulário oficial, 4 arquétipos, scoring, Jornada OpenAI, avaliações, pontos e direitos ainda não estão consolidados como configuração publicada | substituição da vertical sintética | entradas oficiais versionadas, aprovadas e carregadas no motor existente |
| `LMS-MUST-HAVES` | P0 | Produto/Frontend | comentários, uploads, provas finais, selos e certificados ainda não funcionam de ponta a ponta | aceite funcional | fluxos implementados no participante e na operação, com eventos e testes |
| `IDENTITY-SITE-INTEGRATION` | P0 | Identidade | login real e entrada pelo site Estímulo ainda não foram comprovados | usuários reais | identidade única, sessão real, permissões e integração com o site testadas |
| `HUBSPOT-PHYSICAL-INTEGRATION` | P0 | Integração | conta, campos de projeção e adapter real ainda não foram inventariados ou testados | produção integrada | inventário mínimo, matriz de projeção, adapter real, retry, reconciliação e E2E no sandbox |
| `BROWSER-ACCESSIBILITY` | P1 | Experiência | fluxo oficial no navegador, mobile e acessibilidade não foram comprovados | produção | E2E dos fluxos críticos e auditoria de acessibilidade |
| `AWS-STAGING` | P1 | Infraestrutura | arquitetura está documentada, mas o staging AWS ainda não foi implantado e validado | produção | deploy, domínio/TLS, secrets, logs, backup, restore e rollback comprovados |
| `UNUSED-TEST-ADAPTERS` | P1 | Uploads | `file-storage` e `file-scan-worker` existem no Supabase de teste sem consumidor final | upload produtivo | integrar ao fluxo de upload ou remover função, scheduler, configuração e secrets sem uso |

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

A dívida permanece contida. Não será executada substituição em massa.

Um componente legado só entra no caminho crítico quando:

- bloquear requisito obrigatório;
- impedir migração para AWS;
- representar risco de segurança ou integridade;
- impedir manutenção da área que precisa ser alterada.

### Nomenclatura

Nomenclatura semântica é recomendação de manutenção, não gate funcional de entrega. Identificadores históricos permanecem onde necessários para replay e compatibilidade.

## Gates encerrados

### Banco e runtime

```text
recovered_migration_count = 244
clean_replay_passed = true
schema_equivalence_passed = true
public_rpc_contracts_passed = true
backend_e2e_replayed = true
rls_negative_checks_passed = true
idempotency_and_concurrency_passed = true
events_and_outbox_passed = true
```

### Build e CI

```text
canonical_package_lock_present = true
web_ci_uses_npm_ci = true
clean_install_linux_passed = true
clean_install_windows_passed = true
typecheck_and_build_passed = true
```

### Fundações reutilizáveis

```text
nextjs_application_present = true
initial_participant_and_operator_routes_present = true
hubspot_gateway_contract_defined = true
hubspot_test_adapter_present = true
configurable_form_contract_defined = true
classification_engine_present = true
assignment_history_append_only = true
activation_rules_versioned = true
```

Esses itens são fundação, não prova de que o produto oficial esteja completo.

## Ordem de desbloqueio

```text
1. fechar configuração oficial do produto
2. carregar diagnóstico e Jornada OpenAI no motor existente
3. completar frontend e must-haves
4. integrar identidade/site e HubSpot real
5. executar browser E2E e acessibilidade
6. validar AWS staging
7. liberar produção controlada
```

Nenhuma refatoração cosmética ou substituição genérica de legado deve interromper essa sequência.