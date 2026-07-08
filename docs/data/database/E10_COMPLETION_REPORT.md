# Relatório de conclusão do E10 — Modelagem completa do banco

**Versão:** 0.1  
**Data:** 2026-07-08  
**Status:** E10 concluído no nível lógico e físico preliminar.

## 1. Resultado

O modelo de domínio, os 118 eventos e os fluxos ponta a ponta foram convertidos em um baseline relacional PostgreSQL compatível, multi-jornada e orientado à produção.

Foram definidos:

- 13 schemas lógicos;
- 121 tabelas;
- 212 relações de chave estrangeira;
- constraints centrais;
- índices para caminhos críticos;
- proteção append-only;
- RLS habilitável e perfis de privilégio;
- estratégia de migrations;
- migração do schema legado;
- modelo de ledger de pontos;
- modelo de features;
- modelo de score experimental;
- estratégia de volume e particionamento.

## 2. Tarefas do backlog

| Tarefa | Status | Resultado |
|---|---|---|
| E10-T01 Modelo conceitual | DONE | Atualizado e traduzido para schemas físicos. |
| E10-T02 Modelo lógico completo | DONE V0.1 | 121 tabelas e dicionário completo. |
| E10-T03 Constraints e integridade | DONE V0.1 | Invariantes, FKs, checks e proteção histórica. |
| E10-T04 Ledger de gamificação | DONE V0.1 | Ledger idempotente e projeções separadas. |
| E10-T05 Features comportamentais | DONE STRUCTURE | Estrutura reproduzível; fórmulas serão validadas posteriormente. |
| E10-T06 Score experimental | DONE STRUCTURE | Estrutura e guardrails; uso em crédito proibido. |
| E10-T07 Consentimento/auditoria/retenção | DONE STRUCTURE | Tabelas e processo; prazos reais pendentes. |
| E10-T08 Índices/particionamento | DONE V0.1 | Índices iniciais e gatilhos de particionamento definidos. |
| E10-T09 Comparação com schema atual | DONE V0.1 | Estratégia de substituição e mapeamento legado. |

## 3. Decisões principais

- PostgreSQL relacional é a referência do modelo; o provedor será escolhido no E12.
- schemas por domínio preservam modularidade sem microserviços;
- o estado operacional e o evento correspondente são atômicos;
- event store não substitui tabelas de domínio;
- versões publicadas são imutáveis;
- pontos são ledger;
- projeções são reconstruíveis;
- dados externos não viram PK interna;
- PII não entra em eventos;
- features e scores permanecem fora do perfil principal;
- arquétipos e score podem existir estruturalmente, mas ficam desativados sem validação.

## 4. Pendências sinalizadas

Não impedem o próximo épico, mas impedem aprovar migrations produtivas finais:

- provedor PostgreSQL/Supabase e versão;
- adaptador real de autenticação/claims;
- inventário do HubSpot;
- identificadores e estados oficiais de crédito;
- prazos institucionais de retenção;
- papéis administrativos reais;
- aplicação do DDL em PostgreSQL real;
- conteúdo e instrumentos finais da Jornada OpenAI.

## 5. Gate de saída

O E10 está concluído porque agora é possível responder:

- onde cada entidade vive;
- qual tabela é fonte de verdade;
- como histórico e versão são preservados;
- como cada evento é armazenado/distribuído;
- como pontos, certificados e intervenções são auditados;
- como HubSpot e crédito se conectam sem controlar o núcleo;
- como features e scores são reproduzidos;
- como migrar a fundação atual.

A próxima etapa é E11 — arquitetura concreta de integração com HubSpot. Parte dela continuará dependente do inventário do sandbox; enquanto isso, pode-se fechar contrato, ownership e prova técnica abstrata. Alternativamente, se o inventário ainda não estiver disponível, o caminho crítico técnico avança ao E12 com a decisão da stack e arquitetura de aplicação/nuvem, mantendo E11 parcialmente bloqueado.
