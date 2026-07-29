# Motor configurável de diagnóstico e ativação

**Revisado em:** 2026-07-29  
**Status:** integrado ao runtime de desenvolvimento/teste; configuração oficial pendente

## Escopo implementado

O motor suporta:

- formulários, perguntas e opções versionados;
- arquétipos e políticas de classificação configuráveis;
- score mínimo, margem, prioridade e abstenção;
- histórico append-only, recálculo e override auditável;
- ativações versionadas;
- persistência transacional de submissão, resultado, atribuição, eventos e outbox;
- editor administrativo;
- resolução do diagnóstico disponível ao participante;
- fallback de configuração no ambiente de desenvolvimento/teste.

O núcleo está em `apps/web/lib/configurable-product`, e o runtime do participante usa os módulos de diagnóstico e RPC server-only.

## Estado real

A plataforma possui uma configuração de desenvolvimento com 12 perguntas, cinco dimensões e quatro arquétipos. Isso comprova a capacidade técnica, não a aprovação metodológica ou editorial.

Ainda não estão aprovados:

- texto final das perguntas e alternativas;
- condicionais e randomização;
- pesos, normalização, cortes e empate;
- tratamento de respostas ausentes;
- textos dos resultados;
- matriz de ativações;
- casos oficiais de entrada e saída;
- finalidade e destino HubSpot para resultados.

`confidence` não deve ser fabricada quando não existe metodologia aprovada.

## Persistência

O fluxo operacional grava de forma atômica:

```text
sessão e respostas
→ resultado
→ atribuição
→ ativações
→ eventos
→ outbox
```

Replays idempotentes não duplicam os registros, e uma chave reutilizada com payload divergente é rejeitada.

## HubSpot

A classificação semântica segue a DEC-070. O motor pode produzir candidatos de projeção, mas nenhum resultado é sincronizado enquanto não houver destino físico e finalidade aprovados. O worker assíncrono e a prova em sandbox permanecem pendentes.

## Validação

```bash
npm run test:product
npm run test:database
npm run test:application
```

A prova no ambiente implantado usa `npm run verify:deployment` e não altera o runtime com dados ou serviços falsos.

## Gate oficial

```text
engine_implemented = true
admin_editor_implemented = true
participant_flow_integrated = true
transactional_persistence_implemented = true
development_configuration_present = true
official_wording_approved = false
official_scoring_approved = false
official_activation_matrix_approved = false
real_browser_verification_passed = false
hubspot_destination_approved = false
```