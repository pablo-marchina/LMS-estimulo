# Contratos públicos de RPC

**Revisado em:** 2026-09-01  
**Status:** fronteira versionada e verificada por replay

## Fronteira

```text
browser → Next.js server action/BFF → gateway autenticado → RPC PostgreSQL
```

O contrato machine-readable [`public-rpc-contracts-v1.json`](public-rpc-contracts-v1.json) fixa assinaturas, propriedades de segurança, grants, consumidores e códigos observáveis. Contagens/fingerprints não são duplicados aqui.

## Segurança

- facades privilegiadas não concedem execução direta a `public`, `anon` ou `authenticated`;
- gateway valida sessão, identidade, ator, allowlist, payload, timeout e sanitização;
- funções de comando usam idempotência e transação;
- `SECURITY DEFINER` usa `search_path` fechado onde exigido.

## Legado congelado

Nomes `e14_*` permanecem por compatibilidade. Uma correção funcional não autoriza criar nova overload/facade pública ou expandir argumentos opacos apenas para contornar o legado.

O quick-check de múltipla escolha foi corrigido mantendo a facade pública original e alterando semanticamente um helper privado já inventariado. Substituições desse tipo devem ser registradas em [`opaque-helper-semantic-replacements-v1.json`](opaque-helper-semantic-replacements-v1.json) e comprovadas por replay/regressão.

## Regra de mudança

Não alterar contrato/baseline isoladamente para fazer CI passar. Mudança válida exige migration, consumidor/justificativa quando aplicável, regressão e schema replay coerente.

## Validação

```bash
npm run validate:public-rpc-contracts
npm run validate:rpc-gateway-coverage
npm run test:database
```