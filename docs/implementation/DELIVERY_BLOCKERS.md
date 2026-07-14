# Registro de bloqueadores e plano de ação

**Versão:** 4.0  
**Data:** 2026-07-14  
**Status:** ativo

## Regra

- `P0`: bloqueia a vertical oficial ou usuários reais.
- `P1`: bloqueia produção controlada.
- `P2`: bloqueia aceite final.
- Fixtures técnicas não substituem configuração oficial.
- Trabalho independente continua enquanto entradas externas estão pendentes.

## Fundação concluída

- 245 migrations com replay e equivalência;
- contratos RPC, RLS, idempotência, eventos e outbox;
- backend E2E;
- aplicação Next.js inicial;
- motor configurável;
- persistência transacional e projeções CRM por outbox;
- baseline do diagnóstico em 12 perguntas, 5 dimensões e 4 arquétipos;
- CI, build e contenção do legado.

## Bloqueadores

| ID | Nível | Encerramento |
|---|---|---|
| `DIAGNOSTIC-OFFICIAL-CONFIGURATION` | P0 | IR-008 aprovado, draft reproduzível, casos oficiais, publicação controlada e E2E |
| `OPENAI-JOURNEY-PUBLICATION` | P0 | IR-005 aprovado e jornada oficial executável em desenvolvimento/teste |
| `FRONTEND-OFFICIAL-VERTICAL` | P0 | diagnóstico, resultado, dashboard, jornada, aula, progresso e administração mínima usando runtime real |
| `LMS-MUST-HAVES` | P0 | comentários, uploads, avaliações, selos e certificados com persistência, autorização, eventos e testes |
| `IDENTITY-SITE-INTEGRATION` | P0 | IR-009 atendido e navegação site→LMS com identidade única |
| `HUBSPOT-PHYSICAL-INTEGRATION` | P1 | IR-002, adapter real, retry, reconciliação e E2E no sandbox |
| `BROWSER-ACCESSIBILITY` | P1 | E2E de navegador/mobile e acessibilidade sem bloqueadores |
| `AWS-STAGING` | P1 | deploy, TLS, secrets, logs, backup, restore e rollback |
| `PARTNER-CONTENT` | P2 | embed/redirect autorizado com tracking e fallback |
| `REWARDS-REDEMPTION` | P2 | catálogo, solicitação, aprovação e histórico de resgate |
| `AUTHORIZED-CREDIT-CONTEXT` | P2 | contexto autorizado integrado somente para personalização |

## Fase atual

Executar em paralelo:

### Entradas externas

- IR-008: diagnóstico;
- IR-005: Jornada OpenAI;
- IR-009: site e identidade;
- IR-002: HubSpot.

### Implementação independente

1. comentários por aula;
2. upload de prática e integração de storage/scan;
3. avaliações versionadas, selos e certificados;
4. frontend de jornada, aula, progresso e estados críticos;
5. administração mínima;
6. eventos e E2E com fixtures técnicas.

**Gate F1:** capacidades genéricas funcionando sem alegação de conteúdo oficial.

## Etapas seguintes

### F2 — Vertical oficial

Carregar drafts aprovados, validar casos oficiais, publicar em desenvolvimento/teste, conectar ao frontend e executar o fluxo completo.

### F3 — Integrações reais

Integrar site/identidade, HubSpot e contexto autorizado; comprovar sincronização em sandbox.

### F4 — Qualidade e staging

Concluir browser E2E, mobile, acessibilidade e AWS staging com backup, restore e rollback.

### F5 — Produção controlada

Liberar coorte pequena, acompanhar falhas e ampliar após estabilidade.

### F6 — Aceite final

Concluir conteúdo de parceiros, resgate mínimo, contexto autorizado e auditoria final contra as referências.

## Fora do caminho crítico

- refatoração cosmética;
- substituição integral do legado;
- regras derivadas do protótipo sem aprovação;
- segunda jornada antes da OpenAI;
- aplicativo móvel nativo;
- marketplace ou comunidade completos;
- automação de decisão financeira;
- infraestrutura multi-região;
- dashboards avançados antes da vertical oficial.
