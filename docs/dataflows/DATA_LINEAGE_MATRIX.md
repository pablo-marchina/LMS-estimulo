# Matriz de linhagem de dados

**Revisado em:** 2026-09-01  
**Status:** referência vigente de origem/store/destino permitido

| Objeto | Origem autorizada | Store primário | Evento/projeção | Destino permitido | Proibido por padrão |
|---|---|---|---|---|---|
| Conta | Auth/cadastro | identidade | `user_account_id` opaco | autorização/suporte | senha/token no event store |
| Empreendedor | cadastro + identidade resolvida | `core` | `entrepreneur_id` | jornadas/operação | PII direta em eventos |
| Negócio | cadastro/fonte autorizada | `core` | `business_id` | operação/análise autorizada | documento bruto em evento |
| Jornada | administração | `catalog` | ID operacional + eventos de lifecycle | orquestração/UI | tratar `journey_version*` como snapshots editoriais atuais |
| Matrícula/instância | orquestração | `orchestration` | IDs e marcos | UI/operação | usar slug/nome como chave |
| Resposta diagnóstica | participante | `diagnostics` | IDs mínimos | cálculo/pesquisa governada | texto/PII desnecessários no evento |
| Resultado diagnóstico | engine configurada | `diagnostics` | resultado/versão do instrumento | personalização autorizada/UI | score de crédito/rótulo permanente |
| Quick check | participante/backend | `assessment` | tentativa/resultado | feedback/progresso | confiar em correção declarada pelo browser |
| Entrega/arquivo | participante | `assessment` + storage | ID/hash/metadados | reviewer autorizado | URL assinada/binário no evento |
| Pontos | engine/ledger | `engagement` | lançamento/projeção | UI/ranking | número hardcoded sem fato causal |
| Ranking | ledger/projeção | `engagement` | posição + identificação mascarada | participantes | e-mail completo de terceiro |
| Badge | regra de conquista | `engagement` | `award_id` | UI | inferir award de primeira visita/browser |
| Certificado | engine de credencial | `engagement` | emissão/revogação | participante/verificação | alegação além da evidência |
| Evento | backend/conector verificado | `eventing` | envelope/payload mínimo | consumidores aprovados | alteração arbitrária |
| Outbox | transação de domínio | `eventing` | rota/checkpoint | consumidor externo aprovado | chamada síncrona obrigatória a CRM |
| Feature/score | pipeline analítico | `behavior/reporting` | snapshot/versionamento | análise governada | alterar acesso/recompensa/crédito |
| Logs/traces | runtime | observabilidade | não é evento de negócio | operação/segurança | resposta do usuário/PII desnecessária |

## Integrações

PostgreSQL é a fonte do LMS. Um destino externo recebe apenas projeções explicitamente permitidas e por consumidor desacoplado. Se o destino for HubSpot, aplicar também `DEC-070`; isso não transforma o CRM em fonte de credencial ou dependência transacional.

## Jornada

Edição ao vivo muda o estado editorial atual da jornada, enquanto respostas, tentativas, entregas, ledgers, eventos e auditoria preservam seus fatos próprios. Não fabricar um “snapshot histórico da jornada” que o runtime não mantém como produto.