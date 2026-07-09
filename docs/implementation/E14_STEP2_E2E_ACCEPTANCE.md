# E14 — Passo 2 — critérios de aceite ponta a ponta

**Data:** 2026-07-09  
**Status:** DONE — contrato de aceite aprovado; implementação ainda não iniciada  
**Fonte máquina-legível:** `e14-step2-e2e-acceptance-v0.1.json`

## Objetivo

Impedir que a primeira vertical seja considerada funcional apenas porque há telas ou registros isolados. Cada ação mutável deve possuir autorização, transação atômica, tabelas conhecidas, eventos canônicos, resposta de API, comportamento idempotente e falhas verificáveis.

## Fluxo contratado

```text
operador publica a versão interna
→ operador matricula participante sintético
→ participante autentica e inicia a jornada
→ inicia e responde diagnóstico
→ resultado e caminho são persistidos
→ inicia e reconhece as seções da atividade
→ inicia e responde quick check
→ submissão é corrigida
→ aprovação conclui atividade, caminho e jornada
→ progresso chega a 100%
→ dois lançamentos totalizam 7 pontos
→ operador visualiza resultado e evidências
```

A Jornada OpenAI continua bloqueada editorialmente. O contrato se aplica apenas à jornada técnica `internal_test_only` criada no Passo 1.

## Regras globais

1. O navegador não coordena escrita em várias tabelas.
2. Todo comando passa por um handler de aplicação no servidor.
3. Estado de domínio, eventos e outbox são gravados na mesma transação PostgreSQL.
4. `Idempotency-Key` é obrigatório em todos os comandos `POST`, `PUT` e `PATCH`.
5. A mesma chave com o mesmo payload retorna a resposta canônica com `replayed=true`.
6. A mesma chave com payload diferente retorna `409 IDEMPOTENCY_KEY_REUSED`.
7. Transições concorrentes usam `expected_aggregate_version`; versão obsoleta retorna `409 AGGREGATE_VERSION_CONFLICT`.
8. Falha de evento ou outbox reverte todos os efeitos do comando.
9. Identificadores de outro tenant retornam `404` para evitar enumeração.
10. Somente identidades sintéticas podem ser usadas nesta vertical.

## Mapeamento para o modelo persistido

Os passos conceituais do Passo 1 não correspondem todos a linhas de `orchestration.path_steps`:

- `welcome` é representado pela disponibilidade e início da instância;
- `diagnosis` ocorre antes da atribuição do caminho;
- `guided` e `standard` usam dois templates, ambos com uma única etapa apontando para a mesma atividade;
- o modo guiado é configuração de apresentação do caminho;
- `quick_check` é uma avaliação vinculada à versão da atividade;
- `completion` é uma transição de estado, não uma etapa artificial.

Isso evita criar etapas fictícias apenas para adaptar a interface ao banco.

## Contratos definidos

| ID | Operação | Resultado principal |
|---|---|---|
| AUTH01 | autenticar participante | JWT válido e identidade interna mapeada |
| CMD01 | publicar vertical | grafo versionado publicado e quatro eventos |
| CMD02 | criar matrícula | matrícula, instância e progresso inicial |
| CMD03 | iniciar jornada | matrícula ativa e instância iniciada |
| CMD04 | iniciar diagnóstico | sessão diagnóstica em andamento |
| CMD05 | registrar resposta | revisão imutável da resposta |
| CMD06 | concluir diagnóstico | resultado, incerteza, caminho e step atômicos |
| CMD07 | iniciar atividade | step `in_progress` e sessão de atividade |
| CMD08 | reconhecer seção | progresso sem duplicação por repetição |
| CMD09 | iniciar quick check | tentativa numerada respeitando limite |
| CMD10 | registrar resposta | resposta válida ligada ao evento causal |
| CMD11 | submeter quick check | correção; em aprovação, conclusão e 7 pontos |
| QRY01 | consultar estado do participante | estado atual consistente da jornada |
| QRY02 | consultar resultado administrativo | fatos e versões sem interpretação de crédito |

Os contratos completos incluem endpoint, entrada, autorização, leituras, escritas, eventos, resposta, repetição e falhas.

## Critérios críticos

### Diagnóstico

- quatro respostas obrigatórias;
- revisão preserva histórico;
- alta evidência gera `standard`;
- dimensão baixa ou baixa confiança gera `guided`;
- duas ou mais respostas incertas geram evento explícito de incerteza;
- resultado e caminho são persistidos juntos;
- repetição não cria segunda atribuição.

### Atividade e quick check

- iniciar atividade muda o step para `in_progress`;
- cada seção reconhecida conta uma única vez;
- opção inválida retorna `422` sem evento de resposta;
- resposta errada gera tentativa reprovada e feedback, sem conclusão e sem pontos;
- resposta correta conclui atividade, caminho e jornada;
- progresso final é `1.0`;
- ledger contém exatamente duas entradas, totalizando 7 pontos;
- repetição da submissão não duplica nenhum efeito.

### Operação administrativa

O resultado deve mostrar participante referenciado, versão da jornada, diagnóstico, caminho, atividade, quick check, progresso, pontos e IDs de evidência. Não pode mostrar score de crédito, arquétipo ou inferências de persistência, risco ou capacidade.

## Matriz de aceite

Foram definidos 21 cenários, incluindo:

- `401` sem autenticação;
- `403` sem matrícula;
- `404` para acesso entre organizações;
- `409` para repetição conflitante, estado inválido ou concorrência;
- `422` para respostas e configurações inválidas;
- publicação imutável;
- revisão de diagnóstico preservada;
- quick check reprovado sem pontos;
- conclusão idempotente com exatamente 7 pontos;
- rollback integral quando evento ou outbox falha;
- resultado administrativo consistente.

## Lacunas explícitas para a implementação

### P0 — command layer inexistente

O banco possui tabelas, RLS, `eventing.append_event`, outbox e constraints, mas não possui handlers/RPCs para os 11 comandos. Eles deverão ser implementados no Passo 4. O cliente não poderá escrever diretamente nas tabelas para simular o fluxo.

### P0 — imutabilidade publicada não protegida no banco

As versões publicadas ainda não têm trigger de imutabilidade. Uma migration deverá impedir alteração destrutiva após publicação e exigir nova versão.

### P0 para front-end — aplicação ausente

O repositório ainda não contém uma aplicação Next.js executável. Isso não bloqueia este contrato, mas bloqueia o mapeamento e a integração real de interface nos Passos 3 e 5.

### P0 para E2E — identidade ainda não provada

A conexão Supabase existe, porém o fluxo completo JWT sintético → `iam.user_accounts` → `core.entrepreneurs` ainda precisa ser comprovado.

### P1 — saldo projetado

O ledger é a fonte autoritativa. Até a latência da projeção ser definida, a resposta do comando final deve calcular o saldo do ledger confirmado ou atualizar a projeção na mesma transação.

## Evidência produzida

```bash
node scripts/e14/validate-step2-acceptance.mjs
node --test scripts/e14/validate-step2-acceptance.test.mjs
```

Resultado:

- 14 contratos de operação;
- 11 comandos mutáveis;
- 21 cenários de aceite;
- 29 eventos canônicos verificados;
- 36 tabelas verificadas contra as migrations canônicas;
- 5 lacunas explícitas;
- 9 testes aprovados;
- 0 falhas.

## Condição para considerar a vertical implementada

Este documento conclui somente o Passo 2. A vertical funcional continuará não implementada até que os contratos sejam executados por APIs reais, sem alteração manual no banco, e todos os 21 cenários sejam comprovados no Passo 7.
