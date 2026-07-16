# Especificação da Jornada OpenAI

**Versão:** 1.1  
**Data:** 2026-07-16  
**Status:** estrutura reconciliada; publicação bloqueada por decisões editoriais

## Autoridade

A hierarquia está em [SOURCE_AUTHORITY_HIERARCHY.md](../product/SOURCE_AUTHORITY_HIERARCHY.md).

Para a Jornada OpenAI:

1. `premissas-desenvolvimento.md` define requisitos superiores;
2. os documentos de conteúdo do pacote são fontes editoriais;
3. esta especificação organiza as fontes;
4. código e fixtures não são fonte editorial;
5. divergências não são resolvidas por heurística;
6. a sincronização HubSpot segue a [DEC-070](../decisions/HUBSPOT_SCOPE_DECISION.md).

## Fontes editoriais

| Fonte | Papel |
|---|---|
| `draft-validacao-jornada-capacitacao-ia-digital-mei_me.md` | visão geral, fluxo e gamificação |
| `Bloco-01-boas-vindas-e-potencial-da-ia .docx.md` | boas-vindas e potencial da IA |
| `bloco-02-base-opcional.docx.md` | bloco base opcional |
| `trilha-01-marketing-e-vendas-com-ia.docx.md` | Marketing e Vendas |
| `trilha-02-gestao-com-ia.docx.md` | Gestão |
| `trilha-03-desenvolvimento-avancado-com-codex.docx.md` | desenvolvimento com Codex |
| `premissas-desenvolvimento.md` | LMS, dados, interfaces e produção |

## Identidade da jornada

| Campo | Valor |
|---|---|
| Programa | Capacitação de Crédito |
| Jornada | Capacitação em IA para MEI/ME — Estímulo e OpenAI |
| Público | MEIs e microempresas |
| Idioma | Português do Brasil |
| Canal | Plataforma web responsiva |
| Modalidade | Assíncrona, curta, prática e modular |
| Ferramenta principal | ChatGPT |
| Ferramenta avançada | Codex |
| Status | `draft` até fechamento editorial |

## Objetivo

Permitir que pequenos empreendedores usem IA de forma prática e segura para marketing, vendas, gestão, produção de materiais e criação de artefatos digitais.

Conclusão não comprova impacto econômico ou redução de risco de crédito.

## Estrutura atual

```text
entrada
→ boas-vindas e potencial da IA
→ hub de trilhas
   ├─ bloco base opcional
   ├─ Marketing e Vendas com IA
   ├─ Gestão com IA
   └─ desenvolvimento avançado com Codex conforme regra aprovada
```

A ordem de desbloqueio e certificação deve seguir a versão editorial aprovada e ser armazenada como dados versionados.

## Bloco 1 — Boas-vindas

Objetivos:

- apresentar a iniciativa;
- reduzir ansiedade;
- aproximar IA da realidade do empreendedor;
- mostrar aplicações;
- explicar a jornada;
- gerar primeira participação.

Capacidades: vídeo, slides, interação, materiais, avaliação, selo e eventos de progresso.

## Bloco 2 — Base opcional

Objetivos:

- formular pedidos melhores;
- usar contexto, tarefa, restrições e formato;
- revisar iterativamente;
- configurar o ChatGPT;
- abordar segurança.

O bloco é opcional e não se torna obrigatório sem aprovação.

## Trilha 1 — Marketing e Vendas

Resultados esperados:

- identidade visual inicial;
- ideias e calendário;
- imagens e legendas;
- peças de produto ou serviço;
- scripts de vendas;
- respostas a objeções;
- mensagens e propostas.

## Trilha 2 — Gestão

Resultados esperados:

- organização de dados;
- tabela financeira inicial;
- classificação de gastos;
- checklist operacional;
- proposta comercial;
- leitura inicial de contrato.

> IA é apoio e não substitui contador, advogado ou gestor responsável.

## Trilha 3 — Codex

Objetivos:

- explicar Codex;
- transformar pedido em projeto;
- criar e revisar artefatos;
- executar testes;
- abordar Git, comandos, credenciais e publicação segura.

Resultados previstos: site, proposta, formulário, testes e preparação para compartilhamento.

Duração, pré-requisitos, avaliação e credencial permanecem bloqueados.

## Padrão pedagógico

1. problema real;
2. exemplo guiado;
3. demonstração;
4. pausa prática;
5. pergunta rápida;
6. material complementar;
7. avaliação de utilidade em cinco estrelas.

Assistir não equivale a compreender, aplicar ou obter resultado.

## Avaliações

A plataforma suporta participação, quick checks, provas, prática, revisão humana, estrelas, tentativas, feedback e histórico.

Ainda devem ser aprovados perguntas, respostas, notas, tentativas, randomização e desbloqueio.

## Práticas e uploads

Os envios registram participante, atividade, versão, entrega, consentimento, termos, scan, revisão e eventos.

O HubSpot recebe apenas sinais de engajamento e variáveis de cálculo elegíveis pela DEC-070. Binários e payloads brutos permanecem fora.

## Gamificação e credenciais

A plataforma suporta pontos, ledger, conquistas, recompensas, ranking, selos, certificados, revogação e validação pública.

Critérios permanecem configuração editorial a aprovar.

## Personalização

Pode considerar arquétipo, maturidade, diagnóstico, contexto autorizado, comportamento anterior e prontidão.

Usuário sem diagnóstico vê conteúdo sem restrição por arquétipo. Personalização não influencia crédito automaticamente.

## Eventos obrigatórios

Conforme aplicável:

- visualização e início;
- progresso;
- conclusão;
- resposta e tentativa;
- comentário;
- estrelas;
- prática e upload;
- scan e revisão;
- ponto e conquista;
- credencial;
- recomendação;
- abandono e retomada.

Todos permanecem no event store detalhado. Somente itens classificados como `engagement_signal` ou `calculation_input_or_result` são sincronizados ao HubSpot.

## Interface

A jornada opera em home, catálogo, blocos, atividade multimídia, comentários, avaliação, upload, perfil, engajamento e administração.

## Bloqueadores editoriais

- duração e numeração;
- mídias e materiais;
- avaliações;
- conclusão;
- rubricas;
- pontos e credenciais;
- termos de upload;
- acessibilidade;
- revisão de segurança, finanças, contratos e privacidade;
- acesso real a ChatGPT e Codex.

## Critério de publicação

```text
source_package_registered = true
content_assets_received = true
durations_reconciled = true
progression_approved = true
assessments_approved = true
practice_rules_approved = true
gamification_approved = true
credential_rules_approved = true
upload_terms_approved = true
accessibility_assets_ready = true
journey_configuration_publishable = true
real_participant_e2e_passed = true
hubspot_engagement_and_calculation_sync_passed = true
```
