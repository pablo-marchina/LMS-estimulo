# Contenção de helpers e aliases opacos

**Revisado em:** 2026-07-30  
**Status:** dívida técnica inventariada e impedida de crescer

## Objetivo

Preservar contratos existentes e impedir crescimento do legado de banco sem transformar sua substituição integral em requisito de entrega.

## Fonte de verdade

O inventário legível por máquina é [`opaque-helper-baseline-v1.json`](opaque-helper-baseline-v1.json). Ele registra a superfície legada aprovada, assinaturas e fingerprint. Contagens e hashes não são duplicados neste documento.

O gate `validate:legacy-rpc-containment` compara o histórico reconstruído e a fronteira da aplicação com esse baseline. Alterar somente o baseline para aceitar crescimento não revisado é proibido.

## Fronteira da aplicação

RPCs com argumentos opacos são isoladas em:

```text
apps/web/lib/journey-runtime/legacy-rpc-arguments.ts
```

O restante da aplicação usa nomes semânticos. Nenhum novo componente deve construir argumentos opacos diretamente.

## Política vigente

Não haverá campanha de renomeação ou substituição em massa. Um helper ou RPC legado será alterado somente quando:

1. bloquear requisito obrigatório do produto;
2. impedir portabilidade ou execução no ambiente aprovado;
3. representar risco de segurança, dados ou confiabilidade;
4. impedir manutenção da capacidade alterada;
5. possuir consumidor conhecido e cobertura suficiente para mudança segura.

Quando a alteração for necessária:

```text
identificar consumidor e efeito
→ provar comportamento atual
→ criar substituto semântico
→ redirecionar consumidores
→ remover somente sem dependências
→ executar contratos e E2E
→ aplicar ao ambiente de teste por migration autorizada
```

## Invariantes

- a superfície legada permanece inventariada;
- novos helpers opacos são proibidos;
- aliases legados ficam isolados na fronteira compatível;
- módulos de domínio não constroem argumentos opacos;
- mudanças exigem migration, consumidor, teste e replay;
- substituição física integral não é requisito automático de release.

## Validação

```bash
npm run validate:legacy-rpc-containment
npm run validate:public-rpc-contracts
npm run test:database
```

O resultado da validação pertence ao workflow do SHA avaliado, não a este documento.
