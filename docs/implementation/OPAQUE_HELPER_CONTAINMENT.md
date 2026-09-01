# Contenção de helpers e aliases opacos

**Revisado em:** 2026-09-01  
**Status:** dívida inventariada e impedida de crescer

## Fontes de verdade

- [`opaque-helper-baseline-v1.json`](opaque-helper-baseline-v1.json): inventário/fingerprint congelado;
- [`opaque-helper-semantic-replacements-v1.json`](opaque-helper-semantic-replacements-v1.json): substituições semânticas aprovadas de helpers existentes.

Contagens e hashes não são copiados para este texto.

## Política

Novo helper opaco é proibido. Quando um requisito exige corrigir comportamento em um helper já inventariado, existem dois caminhos seguros:

1. substituir o helper por uma API semântica e migrar todos os consumidores, quando o custo/risco permite; ou
2. fazer **substituição semântica in-place** do helper existente, preservando assinatura/inventário, registrando explicitamente o replacement e cobrindo-o por teste/replay.

O segundo caminho foi usado em `app_private.e14_context_g(...)` para suportar `multiple_choice` como conjunto exato sem criar outra facade pública ou helper opaco.

## Invariantes

- aplicação comum não constrói argumentos opacos fora da fronteira de compatibilidade;
- substituição não amplia grants públicos;
- baseline só muda por mudança intencional revisada, nunca para silenciar CI;
- toda mudança executa contenção, contrato público, equivalência e teste de banco.

## Validação

```bash
npm run validate:legacy-rpc-containment
npm run validate:public-rpc-contracts
npm run test:database
```