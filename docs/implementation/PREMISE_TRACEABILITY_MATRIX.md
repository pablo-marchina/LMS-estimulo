# Matriz de rastreabilidade das premissas atuais

**Versão:** 4.0  
**Data:** 2026-07-16  
**Status:** ativo e alinhado ao pacote de referências

## Regra de uso

A matriz rastreia requisitos de produto até implementação e prova.

A autoridade está definida em [SOURCE_AUTHORITY_HIERARCHY.md](../product/SOURCE_AUTHORITY_HIERARCHY.md). Uma capacidade somente é concluída quando:

1. a fonte do requisito está identificada;
2. o comportamento implementado corresponde à fonte;
3. a prova usa o runtime adequado;
4. conteúdo sintético não é apresentado como oficial;
5. documentação, issue e estado do código concordam.

## Matriz

| ID | Fonte | Requisito | Estado | Lacuna necessária | Prova de conclusão |
|---|---|---|---|---|---|
| P-001 | `premissas-desenvolvimento.md` | a fonte máxima é `premissas-desenvolvimento`; o restante do pacote prevalece em assuntos não técnicos | Alinhado documentalmente | manter documentos e issues coerentes | revisão sem conflito e CI documental |
| P-002 | `premissas-desenvolvimento.md` | produto desenvolvido e mantido internamente | Definido | impedir compra/terceirização substitutiva | propriedade interna de código, arquitetura, dados e operação |
| P-003 | `premissas-desenvolvimento.md` | issues são backlog funcional obrigatório | Parcial | mapear todas as issues aos requisitos e critérios | issue → implementação → teste → evidência |
| P-004 | `premissas-desenvolvimento.md` | Supabase somente em desenvolvimento/teste | Definido | impedir promoção direta | configuração e documentação de ambientes |
| P-005 | `premissas-desenvolvimento.md` | AWS em staging e produção | Planejado | ambiente ainda não implantado | deploy, E2E, backup, restore e rollback |
| P-006 | `premissas-desenvolvimento.md`, `trabalho.md` | todas as ações relevantes do usuário geram eventos estruturados | Parcial | cobertura das telas e ações oficiais | ação real → evento com ator, tempo, sequência, contexto e versão |
| P-007 | `premissas-desenvolvimento.md` | todos os dados do usuário capturados ou usados possuem representação no HubSpot | Ausente no runtime real | inventário, matriz completa, objetos/eventos, adapter, retry e reconciliação | sandbox HubSpot com cobertura de todas as categorias |
| P-008 | `premissas-desenvolvimento.md` | clientes com crédito mantêm o mesmo ID; clientes sem crédito são criados para associação futura | Ausente | regras de deduplicação e integração de identidade | E2E com usuário existente, novo e crédito posterior |
| P-009 | `premissas-desenvolvimento.md` | login resolve nome, e-mail, CPF, telefone, CNPJ opcional e UTM | Ausente no fluxo oficial | formulário, validação, consentimento e integração | login/site real com dados persistidos e sincronizados |
| P-010 | `premissas-desenvolvimento.md`, `arquetipos_estimulo.md` | diagnóstico versionado com 12 perguntas, 5 dimensões e 4 arquétipos | Estrutura presente; conteúdo bloqueado | texto, opções, scoring, desempate, copy e casos oficiais | diagnóstico oficial E2E |
| P-011 | `premissas-desenvolvimento.md` | diagnóstico editável e integrado ao Typeform ou solução aprovada | Parcial | decisão e integração reais | publicação, captura, versão e recálculo testados |
| P-012 | documentos da Jornada OpenAI | Jornada OpenAI completa e publicável | Bloqueado | conteúdo, avaliações, progressão, acessibilidade e credenciais | jornada oficial ponta a ponta |
| P-013 | `premissas-desenvolvimento.md` | personalização e visibilidade por arquétipo; conteúdo geral sem diagnóstico | Parcial | matriz oficial de elegibilidade | usuários de quatro perfis e sem diagnóstico recebem conteúdo correto |
| P-014 | `premissas-desenvolvimento.md` | home com anúncios, trilhas, continuar, progresso, menu e recompensas | Parcial | carrossel, conteúdo oficial e recompensas reais | browser E2E real da home |
| P-015 | `premissas-desenvolvimento.md` | trilhas com labels, blocos expansíveis e conclusão configurável | Parcial | UI/editor oficial e regras da jornada | participante e admin operam trilha oficial |
| P-016 | `premissas-desenvolvimento.md` | atividades com comentários | Fundação genérica implementada | moderação, abuso e operação reais | E2E real com participante e operador |
| P-017 | `premissas-desenvolvimento.md` | avaliação de utilidade em cinco estrelas | Ausente | modelo, evento, UI e relatório | avaliação persistida, sincronizada e consultável |
| P-018 | `premissas-desenvolvimento.md` | quick check e avaliações de aprendizagem | Fundação genérica implementada | conteúdo e regras oficiais | aprovação/reprovação na Jornada OpenAI |
| P-019 | `premissas-desenvolvimento.md`, issues | conteúdos internos/externos e formatos adequados, incluindo vídeos horizontal/vertical | Parcial | hospedagem/player, tracking e acessibilidade | formatos oficiais em desktop e mobile |
| P-020 | `premissas-desenvolvimento.md`, issues | uploads de prática | Fundação genérica implementada | scanner real, retenção e storage AWS | upload → scan → revisão → download em staging |
| P-021 | `premissas-desenvolvimento.md` | perfil com certificados, diagnóstico e histórico | Parcial | dados oficiais e histórico completo | perfil real reconciliado com HubSpot |
| P-022 | `premissas-desenvolvimento.md` | conquistas, recompensas, histórico de pontuação e ranking | Parcial | regras, resgate, ranking e proteções | ledger, UI, sincronização e operação aprovados |
| P-023 | `premissas-desenvolvimento.md` | administração de usuários | Ausente como gestão completa | busca, edição autorizada, histórico e suporte | operador gerencia usuários com auditoria |
| P-024 | `premissas-desenvolvimento.md` | administração integral de trilhas | Parcial | editor de blocos, atividades, labels e regras | versão oficial criada e publicada pela UI |
| P-025 | `premissas-desenvolvimento.md` | biblioteca de conteúdo com labels | Fundação inicial implementada | taxonomia oficial, mídias e acervo | conteúdo oficial criado, encontrado e reutilizado |
| P-026 | pacote de referências | interface segue guia Estímulo e mockups como referência | Parcial | revisão visual e componentes faltantes | aprovação visual e responsividade |
| P-027 | `premissas-desenvolvimento.md` | reutilizar ao máximo o repositório anterior com segurança | Parcial | inventário explícito de reutilizado/descartado | matriz de reaproveitamento e justificativas |
| P-028 | `premissas-desenvolvimento.md` | manutenção, legado, documentação e GitHub são critérios de aceite | Fundação presente | lint, reviews, proteção e docs completas | gates CI, revisão e documentação sincronizada |
| P-029 | decisões técnicas | diagnóstico e sinais não decidem crédito sem validação | Protegido | manter gates e governança | nenhuma ação produtiva de crédito ativada |
| P-030 | requisito de produção | E2E real atravessa navegador, identidade, banco, storage, scan e HubSpot | Ausente | substituir prova sintética por vertical real | E2E em AWS staging/sandboxes |
| P-031 | segurança/privacidade | dados reais possuem finalidade, acesso, retenção e direitos | Bloqueado | políticas e aprovações institucionais | revisão de segurança, privacidade e operação |

## Itens que não encerram requisito oficial isoladamente

- fixture ou configuração sintética;
- Browser E2E com backend substituído por arquivo local;
- adapter HubSpot em memória;
- interface sem conteúdo oficial;
- certificado genérico sem regra oficial;
- upload com estado de scan sem scanner real;
- documentação de AWS sem ambiente implantado;
- compatibilidade teórica sem prova no runtime final.

## Fora da primeira entrega, salvo nova aprovação

- decisão automática de crédito;
- aplicativo móvel nativo;
- compra de LMS externo;
- segunda jornada publicada antes da OpenAI;
- marketplace complexo;
- refatoração cosmética de legado contido.

A ordem operacional permanece no registro de bloqueadores e nas issues.
