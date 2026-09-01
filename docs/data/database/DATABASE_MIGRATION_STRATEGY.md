# Estratégia de migrations

**Revisado em:** 2026-09-01  
**Status:** histórico executável consolidado

A descrição antiga de “ondas M00–M08 futuras” foi superada pelo histórico real. A política vigente é simples: `supabase/migrations/` é o único caminho para evoluir o schema autorizado.

## Regras

- migration aplicada não é editada; correção posterior é aditiva;
- replay deve funcionar desde banco vazio;
- migrations ativas são validadas contra manifests/boundaries do histórico recuperado;
- alteração de rotina/grant exige teste de contrato proporcional;
- baseline de equivalência só muda após replay provar a alteração intencional;
- não importar estado remoto para “fazer o Git combinar”;
- não aumentar inventário legado para corrigir comportamento quando uma substituição semântica segura do helper existente resolve;
- backfills são idempotentes e observáveis;
- mudanças destrutivas exigem retenção/integridade e caminho de forward-fix ou rollback aplicável.

## Contratos congelados e substituições

A superfície pública e o inventário de helpers opacos possuem baselines legíveis por máquina. Uma correção que precise alterar a semântica de um helper já inventariado deve:

1. preservar assinatura/facade quando possível;
2. registrar a substituição semântica autorizada;
3. manter grants compatíveis com o contrato público;
4. executar replay, equivalência, contratos e regressão funcional;
5. não alterar baseline apenas para silenciar o CI.

O quick-check de múltipla escolha de 31/08 segue exatamente esse padrão.

## Execução

```bash
npm run validate:migration-history
npm run replay:database-clean
npm run validate:schema-equivalence
npm run validate:public-rpc-contracts
npm run validate:legacy-rpc-containment
npm run test:database
```

## Ambiente remoto

Supabase remoto é destino de desenvolvimento/teste/preview, não fonte do schema. Migrations ausentes são aplicadas na ordem somente após os gates locais. Divergência remota é corrigida por migration/recriação controlada, nunca por edição manual incorporada retroativamente ao histórico.