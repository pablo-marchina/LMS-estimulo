# Falhas, retries, dead letters, replay e reconciliação

**Versão:** 0.1  
**Status:** Baseline E09

## 1. Objetivo

Definir um comportamento previsível quando partes do fluxo falham. Uma release de produção não pode depender de correção manual silenciosa nem perder fatos entre o commit operacional e os consumidores.

## 2. Classificação de falhas

| Classe | Exemplos | Tratamento padrão |
|---|---|---|
| Validação | payload inválido, estado incompatível | rejeitar sem retry; erro de domínio rastreável |
| Autorização | escopo ou capacidade ausente | negar e registrar auditoria quando sensível |
| Concorrência | versão de agregado divergente | retornar conflito; cliente recarrega e reavalia |
| Transitória interna | timeout de banco, lock temporário | retry limitado no comando quando seguro |
| Transitória assíncrona | worker indisponível, 429/5xx | backoff exponencial com jitter |
| Permanente técnica | schema incompatível, campo obrigatório ausente | dead letter e alerta |
| Permanente funcional | objeto externo inexistente, mapping ambíguo | conflito/reconciliação humana ou regra aprovada |
| Segurança | assinatura inválida, replay, arquivo malicioso | rejeitar, isolar e alertar |
| Privacidade | dado proibido no payload | bloquear produção do evento e abrir incidente técnico |

## 3. Política de retry

- Retry só ocorre quando a operação é idempotente ou protegida por chave única.
- Backoff deve incluir jitter e respeitar `Retry-After` de sistemas externos.
- Limite de tentativas varia por classe de efeito; a configuração é versionada.
- Erro permanente não deve consumir tentativas repetidas.
- O motivo armazenado deve ser sanitizado.

## 4. Dead letter

Cada entrada deve conter:

- `event_id` ou `job_id`;
- consumidor/conector;
- versão do handler;
- primeira e última tentativa;
- contagem;
- classificação da falha;
- código de erro sanitizado;
- referência segura ao payload, não cópia irrestrita;
- ação recomendada;
- status de resolução.

Estados:

```text
open → investigating → corrected → replay_scheduled → resolved
                         ↘ discarded_with_justification
```

Descartar exige justificativa e auditoria.

## 5. Replay

Modos permitidos:

1. **Projection rebuild:** reprocessa eventos apenas para stores reconstruíveis.
2. **Dry run:** executa lógica sem persistir efeitos.
3. **Targeted replay:** intervalo, agregado ou evento específico.
4. **Migration replay:** usa handler versionado para criar nova projeção.

Efeitos externos, notificações, pontos, certificados e operações irreversíveis ficam bloqueados por padrão durante replay. Para habilitá-los, deve existir chave idempotente externa e aprovação explícita.

## 6. Reconciliação

### 6.1 Interna

Verifica periodicamente:

- evento de domínio sem outbox correspondente;
- outbox concluído sem entregas esperadas;
- consumidor com gap de `aggregate_version`;
- projeção divergente do estado operacional;
- ledger de pontos sem evento de origem;
- certificado sem snapshot de requisitos;
- submissão em estado pendente sem job ativo.

### 6.2 HubSpot

Compara IDs externos, propriedades proprietárias da plataforma, associações e data de atualização. A plataforma só corrige automaticamente campos dos quais é proprietária; conflitos em campos compartilhados entram em fila de reconciliação.

### 6.3 Crédito

Será definido depois de conhecida a fonte oficial. A reconciliação deverá comparar estado atual, sequência/versionamento e operações ausentes sem inferir estágios.

## 7. Compensação

Transações entre sistemas não usam rollback distribuído. Quando um efeito externo já ocorreu e o fluxo posterior falha, aplica-se uma ação compensatória de negócio quando disponível, por exemplo:

- revogar certificado, preservando emissão histórica;
- reverter pontos via novo lançamento;
- cancelar intervenção ainda não enviada;
- corrigir propriedade CRM com nova sincronização;
- invalidar tentativa com evento auditado.

Nunca se apaga silenciosamente o fato original.

## 8. Alertas mínimos

| Condição | Severidade inicial |
|---|---|
| Evento canônico não persistido após commit operacional | Crítica |
| Idade do outbox acima do limite aprovado | Alta |
| Consumidor essencial sem progresso | Alta |
| Dead letter nova | Alta |
| Taxa de retry anormal | Média/Alta |
| Conflitos de identidade ou HubSpot | Alta |
| Gap de aggregate_version | Alta |
| Evento com PII proibida | Crítica |
| Reconciliação divergente repetida | Alta |

Os limiares quantitativos finais serão definidos no E13.

## 9. Runbooks mínimos futuros

- desbloquear outbox;
- investigar consumidor parado;
- corrigir schema incompatível;
- processar dead letter;
- replay de projeção;
- reconciliar HubSpot;
- revogar/reemitir certificado;
- reverter pontos;
- tratar webhook inválido;
- responder a exposição de PII em evento/log.
