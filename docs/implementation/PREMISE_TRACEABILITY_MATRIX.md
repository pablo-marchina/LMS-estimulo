# Matriz de rastreabilidade das premissas atuais

**Versão:** 4.1  
**Data:** 2026-07-16  
**Status:** ativo e alinhado ao pacote de referências

## Regra de uso

A autoridade está definida em [SOURCE_AUTHORITY_HIERARCHY.md](../product/SOURCE_AUTHORITY_HIERARCHY.md). A DEC-070 define o escopo atual do HubSpot.

Uma capacidade somente é concluída quando:

1. a fonte está identificada;
2. a implementação corresponde à fonte;
3. a prova usa o runtime adequado;
4. conteúdo sintético não é apresentado como oficial;
5. documentação, issue e código concordam.

## Matriz

| ID | Fonte | Requisito | Estado | Lacuna | Prova de conclusão |
|---|---|---|---|---|---|
| P-001 | `premissas-desenvolvimento.md` | hierarquia de fontes definida | Alinhado | manter documentos coerentes | CI documental e revisão |
| P-002 | `premissas-desenvolvimento.md` | produto desenvolvido e mantido internamente | Definido | impedir substituição por LMS externo | propriedade interna comprovada |
| P-003 | `premissas-desenvolvimento.md` | issues como backlog funcional | Parcial | mapear issues aos requisitos | issue → implementação → teste |
| P-004 | `premissas-desenvolvimento.md` | Supabase apenas em desenvolvimento/teste | Definido | impedir promoção direta | configuração por ambiente |
| P-005 | `premissas-desenvolvimento.md` | AWS em staging e produção | Planejado | ambiente não implantado | deploy, E2E, backup e rollback |
| P-006 | `premissas-desenvolvimento.md`, `trabalho.md` | ações relevantes geram eventos estruturados | Parcial | cobertura das telas oficiais | ação real → evento versionado |
| P-007 | DEC-070 | HubSpot recebe vínculo mínimo, engajamento e dados úteis para cálculo | Ausente no runtime real | inventário, matriz, adapter e reconciliação | sandbox com as três classes e exclusões testadas |
| P-008 | `premissas-desenvolvimento.md` | identidade existente e nova sem duplicação | Ausente | deduplicação e integração real | E2E de usuário existente, novo e crédito posterior |
| P-009 | `premissas-desenvolvimento.md` | entrada resolve nome, e-mail, CPF, telefone, CNPJ opcional e UTM | Ausente no fluxo oficial | formulário, validação e consentimento | site/login real |
| P-010 | fontes de arquétipos | diagnóstico com 12 perguntas, 5 dimensões e 4 arquétipos | Estrutura presente; conteúdo bloqueado | scoring, textos e casos oficiais | diagnóstico oficial E2E |
| P-011 | `premissas-desenvolvimento.md` | diagnóstico editável e versionado | Parcial | integração oficial | publicação, captura e recálculo testados |
| P-012 | documentos da Jornada OpenAI | jornada completa e publicável | Bloqueado | conteúdo, avaliações, progressão e acessibilidade | jornada oficial ponta a ponta |
| P-013 | fontes de personalização | visibilidade por arquétipo e conteúdo geral sem diagnóstico | Parcial | matriz oficial | perfis recebem conteúdo correto |
| P-014 | `premissas-desenvolvimento.md` | home completa | Parcial | carrossel, conteúdo e recompensas reais | browser E2E real |
| P-015 | `premissas-desenvolvimento.md` | trilhas, labels, blocos e regras configuráveis | Parcial | UI/editor oficial | participante e admin operam trilha oficial |
| P-016 | `premissas-desenvolvimento.md` | comentários por aula | Fundação implementada | moderação e operação reais | E2E real participante/operador |
| P-017 | `premissas-desenvolvimento.md` | avaliação de utilidade em cinco estrelas | Ausente | modelo, evento, UI e relatório | avaliação persistida e consultável |
| P-018 | `premissas-desenvolvimento.md` | quick checks e avaliações | Fundação implementada | conteúdo e regras oficiais | aprovação/reprovação oficial |
| P-019 | premissas e issues | conteúdo e vídeo horizontal/vertical | Parcial | hospedagem, player e acessibilidade | desktop/mobile real |
| P-020 | premissas e issues | uploads de prática | Fundação implementada | scanner real e AWS | upload → scan → revisão → download |
| P-021 | `premissas-desenvolvimento.md` | perfil com diagnóstico, histórico e credenciais | Parcial | dados oficiais | perfil real |
| P-022 | `premissas-desenvolvimento.md` | pontos, conquistas, recompensas e ranking | Parcial | regras e operação | ledger, UI e governança |
| P-023 | `premissas-desenvolvimento.md` | administração de usuários | Ausente como gestão completa | busca, edição e suporte | operação auditada |
| P-024 | `premissas-desenvolvimento.md` | administração integral de trilhas | Parcial | editor completo | versão oficial criada pela UI |
| P-025 | `premissas-desenvolvimento.md` | biblioteca com labels e taxonomia | Fundação inicial | acervo e taxonomia oficiais | conteúdo criado e reutilizado |
| P-026 | referências visuais | interface Estímulo e responsiva | Parcial | revisão visual | aprovação e acessibilidade |
| P-027 | `premissas-desenvolvimento.md` | reutilização responsável do legado | Parcial | inventário de reaproveitamento | matriz de manter/substituir/remover |
| P-028 | `premissas-desenvolvimento.md` | manutenção, docs e GitHub como aceite | Fundação presente | lint, reviews e proteção | gates comprovados |
| P-029 | governança | sinais não decidem crédito sem validação | Protegido | manter gates | nenhuma decisão produtiva ativada |
| P-030 | produção | E2E real atravessa navegador, identidade, banco, storage, scan e HubSpot | Ausente | vertical real | E2E em AWS staging/sandboxes |
| P-031 | segurança/privacidade | tratamento governado de dados reais | Bloqueado | políticas e controles | revisão institucional e técnica |

## Matriz específica HubSpot

| Classe | Exemplos | Regra |
|---|---|---|
| `linking_identifier` | IDs internos, contato, empresa, operação | somente o mínimo necessário para associação |
| `engagement_signal` | acesso, progresso, participação, tentativas, conclusão, credenciais | finalidade e granularidade aprovadas |
| `calculation_input_or_result` | dimensões, arquétipo, features e resultados | cálculo versionado e governado |
| `not_synced` | estado transacional, conteúdo, binários, logs e segredos | permanece no sistema apropriado |

## Itens que não encerram requisito oficial isoladamente

- fixture sintética;
- Browser E2E com backend local substituído;
- adapter HubSpot em memória;
- interface sem conteúdo oficial;
- certificado genérico;
- estado de scan sem scanner real;
- documentação AWS sem ambiente implantado.

## Fora da primeira entrega, salvo aprovação

- decisão automática de crédito;
- aplicativo móvel nativo;
- compra de LMS externo;
- segunda jornada publicada antes da OpenAI;
- marketplace complexo;
- refatoração cosmética de legado contido.
