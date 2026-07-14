# Matriz de rastreabilidade das premissas atuais

**Versão:** 3.0  
**Data:** 2026-07-14  
**Status:** ativo

## Regra de uso

A matriz rastreia somente requisitos necessários para o produto final. Uma capacidade é concluída quando requisito, implementação e prova de runtime concordam.

| ID | Requisito | Estado | Lacuna necessária | Prova de conclusão |
|---|---|---|---|---|
| P-001 | referências oficiais prevalecem sobre ADRs, código e protótipos | Alinhado | manter documentos ativos coerentes | revisão documental sem conflito |
| P-002 | Supabase somente em desenvolvimento/teste | Definido | impedir promoção direta | configuração e documentação de ambientes |
| P-003 | AWS em staging e produção | Planejado | ambiente ainda não implantado | deploy, E2E, backup, restore e rollback |
| P-004 | plataforma multi-jornada com OpenAI como primeira jornada | Fundação presente | Jornada OpenAI oficial não carregada | publicação da jornada sem hardcode no núcleo |
| P-005 | formulário versionado e quatro arquétipos oficiais | Motor presente | perguntas, scoring e textos oficiais pendentes | diagnóstico oficial E2E |
| P-006 | personalização por diagnóstico e contexto autorizado | Parcial | regras oficiais e contexto de crédito pendentes | resultado ativa jornada/recomendação correta |
| P-007 | comentários por aula | Ausente | issue 61 | criar, visualizar e moderar comentário |
| P-008 | upload de prática por aula/módulo | Parcial | storage/scan sem consumidor | upload, scan, consentimento e avaliação E2E |
| P-009 | provas, selos e certificados | Parcial | regras e emissão final ausentes | aprovação/reprovação, emissão e validação |
| P-010 | pontos e recompensas | Parcial | ledger existe; resgate mínimo ausente | saldo, histórico e solicitação de resgate |
| P-011 | conteúdo próprio e de parceiros | Parcial | adapter/redirect final ausente | conteúdo autorizado embedado ou redirecionado |
| P-012 | ações relevantes geram eventos estruturados | Parcial | completar cobertura das telas oficiais | rota/ação → evento sem duplicação |
| P-013 | HubSpot como User 360 | Parcial | inventário e adapter real pendentes | projeções de identidade, diagnóstico e progresso no sandbox |
| P-014 | event store preserva detalhe comportamental | Fundação presente | ampliar para novas funcionalidades | eventos e outbox dos must-haves |
| P-015 | integração com site e login real | Ausente | identidade e entrada pelo site pendentes | sessão real e identidade única E2E |
| P-016 | contexto de crédito não vira decisão automática | Protegido | integrar somente dados autorizados | personalização sem efeito decisório de crédito |
| P-017 | frontend mobile e acessível | Parcial | browser E2E e auditoria pendentes | fluxos críticos em desktop e mobile |
| P-018 | banco e runtime reproduzíveis | Atendido | preservar gates | replay, equivalência, contratos e backend E2E |
| P-019 | legado não cresce e não bloqueia entrega sem risco concreto | Atendido | alterar apenas por necessidade | containment permanece verde |

## Itens explicitamente fora da matriz de bloqueio

- renomeação integral de helpers legados;
- quinta taxonomia de arquétipos sem decisão oficial;
- score produtivo de crédito;
- segunda jornada antes da OpenAI;
- aplicativo móvel nativo;
- marketplace ou comunidade completos;
- refatorações cosméticas;
- documentação adicional sem requisito novo.

A ordem operacional é mantida no registro de bloqueadores e nas issues, não em planos versionados separados.