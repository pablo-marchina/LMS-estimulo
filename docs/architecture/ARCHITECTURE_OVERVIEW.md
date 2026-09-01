# Visão geral da arquitetura

Este documento é o mapa de arquitetura da Plataforma Estímulo. Ele conecta os documentos especializados e mantém os diagramas canônicos necessários para compreender o sistema sem depender do contexto de uma entrega específica.

## 1. Contexto do sistema

```mermaid
flowchart LR
  Participant[Participante] --> Web[Plataforma Estímulo]
  Admin[Equipe administrativa] --> Web
  Web --> IdP[Provedor de identidade]
  Web --> DB[(PostgreSQL)]
  Web --> Storage[Armazenamento privado]
  Web --> AI[Provider de IA opcional]
  DB --> Outbox[Outbox]
  Outbox --> External[Destinos externos autorizados]
```

A plataforma é o sistema de registro das jornadas, diagnóstico, progressão, engajamento e evidências operacionais. Destinos externos não participam da transação síncrona do domínio.

## 2. Containers lógicos

```mermaid
flowchart TB
  Browser[Navegador]
  Web[Next.js Web]
  Gateway[Server Actions / Route Handlers / APIs]
  Edge[Edge Functions]
  DB[(PostgreSQL)]
  Obj[Object Storage]
  Queue[Processamento assíncrono]
  Ext[Integrações externas]

  Browser --> Web
  Web --> Gateway
  Gateway --> Edge
  Gateway --> DB
  Edge --> DB
  Gateway --> Obj
  DB --> Queue
  Queue --> Ext
```

O domínio fica atrás de contratos server-side. O navegador nunca declara como fato final nota, conclusão, saldo, autorização ou elegibilidade.

## 3. Componentes da aplicação

```mermaid
flowchart LR
  UI[UI e rotas]
  Auth[Identidade e autorização]
  Product[Catálogo e jornadas]
  Diagnostic[Diagnóstico]
  Assessment[Avaliações e entregas]
  Engagement[Engajamento e credenciais]
  Experience[Experiência / CMS / B2B]
  Events[Eventos e outbox]
  Governance[Governança]
  Adapters[Ports e adapters]

  UI --> Auth
  UI --> Product
  UI --> Diagnostic
  UI --> Assessment
  UI --> Engagement
  UI --> Experience
  Product --> Events
  Diagnostic --> Events
  Assessment --> Events
  Engagement --> Events
  Auth --> Governance
  Events --> Adapters
```

Os contextos detalhados estão em [`../domain/BOUNDED_CONTEXTS.md`](../domain/BOUNDED_CONTEXTS.md).

## 4. Modelo de dados por domínio

```mermaid
flowchart TB
  IAM[iam]
  Core[core]
  Catalog[catalog]
  Orch[orchestration]
  Diagnostics[diagnostics]
  Assessment[assessment]
  Engagement[engagement]
  Experience[experience]
  Behavior[behavior]
  Eventing[eventing]
  Governance[governance]
  Reporting[reporting]

  IAM --> Core
  Core --> Orch
  Catalog --> Orch
  Orch --> Assessment
  Diagnostics --> Orch
  Assessment --> Engagement
  Orch --> Engagement
  Orch --> Eventing
  Diagnostics --> Eventing
  Assessment --> Eventing
  Engagement --> Eventing
  Eventing --> Behavior
  Eventing --> Reporting
  Governance --> IAM
```

O ERD detalhado permanece em [`../data/database/DATABASE_ERD.md`](../data/database/DATABASE_ERD.md).

## 5. Autenticação e autorização

```mermaid
sequenceDiagram
  actor User as Usuário
  participant IdP as Provider Auth
  participant Web as Next.js
  participant IAM as IAM interno
  participant RBAC as RBAC/RLS
  User->>IdP: autentica
  IdP-->>Web: sessão/identidade verificada
  Web->>IAM: resolve identidade externa
  IAM-->>Web: user_account / entrepreneur / membership
  Web->>RBAC: valida capability e escopo
  RBAC-->>Web: permitido ou negado
  Web-->>User: experiência autorizada
```

A resolução de identidade existente evita lock exclusivo no caminho comum e limita atualizações de heartbeat, reduzindo contenção em rajadas de RPCs autenticadas.

## 6. Jornada e aprendizagem

```mermaid
stateDiagram-v2
  [*] --> draft
  draft --> published: publicar
  published --> draft: despublicar
  published --> published: editar conteúdo autorizado
```

```mermaid
flowchart LR
  Enrollment[Matrícula] --> Instance[Instância da jornada]
  Instance --> Track[Trilha atribuída]
  Track --> Lesson[Aula/atividade]
  Lesson --> Check[Quick check]
  Lesson --> Practice[Prática/entrega]
  Check --> Progress[Progressão]
  Practice --> Progress
  Progress --> Credential[Badge/certificado]
```

## 7. Diagnóstico

```mermaid
flowchart LR
  Definition[Definição] --> Version[Versão publicada]
  Version --> Session[Sessão]
  Session --> Answers[Respostas]
  Answers --> Dimension[Média por dimensão]
  Dimension --> Profile[Classificação configurada]
  Profile --> Assignment[Atribuição auditável]
```

Thresholds configurados como limites superiores são avaliados do menor para o maior. O runtime não inventa pesos, cortes ou textos ausentes da metodologia aprovada.

## 8. Comando transacional, eventos e outbox

```mermaid
sequenceDiagram
  participant UI as Cliente
  participant App as Caso de uso
  participant DB as PostgreSQL
  participant Worker as Consumidor
  participant Ext as Destino externo
  UI->>App: comando + idempotency key
  App->>DB: validação + autorização
  App->>DB: estado + ledger + evento + outbox
  DB-->>App: commit atômico
  App-->>UI: resultado
  Worker->>DB: claim da outbox
  Worker->>Ext: efeito idempotente
  Worker->>DB: confirmação/checkpoint
```

Detalhes: [`TRANSACTIONAL_OUTBOX.md`](TRANSACTIONAL_OUTBOX.md), [`QUEUE_ARCHITECTURE.md`](QUEUE_ARCHITECTURE.md) e [`RECONCILIATION_AND_RECOVERY.md`](RECONCILIATION_AND_RECOVERY.md).

## 9. Storage e arquivos

```mermaid
flowchart LR
  Client[Cliente] --> API[API autorizada]
  API --> Meta[(Metadata no PostgreSQL)]
  API --> Private[Bucket privado]
  Private --> Verify[Validação de integridade/política]
  Verify --> Ready[Objeto utilizável]
  Ready --> Signed[URL temporária autorizada]
```

Objetos são privados; URLs assinadas são temporárias e não viram identificadores permanentes de domínio.

## 10. Ambientes

```mermaid
flowchart LR
  Local[Local] --> Test[Teste]
  Test --> Preview[Preview]
  Preview --> GateA[Gate de software]
  GateA --> AWSStaging[AWS staging aprovado]
  AWSStaging --> GateB[Gate de produção]
  GateB --> Production[AWS produção]
```

Supabase e Vercel servem desenvolvimento, teste e preview. A produção institucional depende da arquitetura AWS aprovada e dos critérios em [`../security/PRODUCTION_READINESS_GATE.md`](../security/PRODUCTION_READINESS_GATE.md).

## 11. Observabilidade e recuperação

```mermaid
flowchart LR
  Request[Request] --> Logs[Logs redigidos]
  Request --> Metrics[Métricas]
  Request --> Trace[Tracing/correlação]
  DB[(Estado)] --> Reconcile[Reconciliação]
  Queue[Jobs/outbox] --> Reconcile
  Reconcile --> Alert[Alerta / operação]
```

Logs técnicos não são eventos comportamentais. Backups, restore, rollback, replay e reconciliação têm contratos separados.

## 12. Mapa de documentos arquiteturais

- ambientes: [`ENVIRONMENT_AND_CLOUD_STRATEGY.md`](ENVIRONMENT_AND_CLOUD_STRATEGY.md);
- fronteira AWS: [`AWS_ARCHITECTURE_STATUS.md`](AWS_ARCHITECTURE_STATUS.md);
- providers: [`PROVIDER_PORTS_AND_ADAPTERS.md`](PROVIDER_PORTS_AND_ADAPTERS.md);
- banco: [`../data/database/DATABASE_MODEL.md`](../data/database/DATABASE_MODEL.md);
- dados ponta a ponta: [`../dataflows/DATA_FLOW_ARCHITECTURE.md`](../dataflows/DATA_FLOW_ARCHITECTURE.md);
- eventos: [`../events/EVENT_ARCHITECTURE.md`](../events/EVENT_ARCHITECTURE.md);
- storage: [`STORAGE_ARCHITECTURE.md`](STORAGE_ARCHITECTURE.md);
- segurança: [`../security/SECURITY_PRIVACY_ARCHITECTURE.md`](../security/SECURITY_PRIVACY_ARCHITECTURE.md);
- observabilidade: [`OBSERVABILITY_AND_ALERTS.md`](OBSERVABILITY_AND_ALERTS.md);
- recuperação: [`RECONCILIATION_AND_RECOVERY.md`](RECONCILIATION_AND_RECOVERY.md).
