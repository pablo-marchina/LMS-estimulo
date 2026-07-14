# Contenção de helpers e aliases opacos

**Versão:** 0.5  
**Data:** 2026-07-14  
**Status:** dívida técnica contida e não bloqueante

## Objetivo

Preservar os contratos existentes e impedir crescimento do legado de banco sem transformar sua substituição integral em requisito de entrega.

## Baseline atual

O [baseline canônico](opaque-helper-baseline-v1.json) é gerado a partir das 244 migrations executáveis.

```text
legacy_function_count = 114
legacy_private_helper_count = 106
legacy_public_rpc_count = 8
inventory_sha256 = 4970dd5691a824aafdfc70688addcdf63397df6903440e281e7233a1075d6aaf
```

O inventário registra assinatura, migration final e consumidores diretos. O conjunto não pode crescer silenciosamente.

## Fronteira da aplicação

Os oito RPCs públicos com argumentos opacos são isolados em:

```text
apps/web/lib/journey-runtime/legacy-rpc-arguments.ts
```

O restante da aplicação usa nomes semânticos. Nenhum novo componente deve construir argumentos opacos diretamente.

## Substituição já executada

A migration aplicada:

```text
supabase/migrations/20260710165530_m15a_e14_semantic_activity_session_close.sql
```

substituiu um helper privado de baixo risco, preservando os 18 RPCs públicos e o backend E2E.

Essa substituição permanece válida, mas não estabelece obrigação de repetir o processo para todas as funções.

## Política vigente

Não haverá campanha de renomeação ou substituição em massa.

Um helper ou RPC legado será alterado somente quando:

1. bloquear requisito obrigatório do produto;
2. impedir migração ou execução em AWS;
3. representar risco de segurança, dados ou confiabilidade;
4. impedir manutenção da área que precisa ser modificada;
5. possuir consumidor conhecido e cobertura suficiente para mudança segura.

Quando uma alteração for necessária:

```text
identificar consumidor e efeito
→ provar comportamento atual
→ criar substituto semântico
→ redirecionar consumidores
→ remover somente se não houver dependências
→ executar contratos e E2E
→ aplicar remotamente apenas com autorização
```

## Gates preservados

```text
legacy_database_surface_inventoried = true
new_opaque_database_helpers_allowed = false
legacy_public_rpc_aliases_isolated = true
application_direct_alias_construction_allowed = false
public_rpc_count = 18
public_rpc_fingerprint_changed = false
backend_e2e_passed = true
physical_legacy_replacement_complete = false
physical_legacy_replacement_required_for_release = false
```

A contenção continua sendo verificada. A substituição física integral não bloqueia configuração oficial, frontend, HubSpot, identidade ou AWS.