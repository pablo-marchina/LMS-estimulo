# Falhas, retries, dead letters, replay e reconciliação

**Revisado em:** 2026-09-01

## Classes

| Classe | Tratamento |
|---|---|
| validação | rejeitar sem retry |
| autorização | negar e auditar quando sensível |
| concorrência | conflito explícito/recarregar |
| transitória interna | retry limitado apenas se idempotente |
| transitória assíncrona | backoff + jitter |
| permanente técnica/funcional | dead-letter/reconciliação |
| segurança/privacidade | bloquear/isolar/alertar |

## Retry e idempotência

Retry só ocorre quando a operação é idempotente ou protegida por chave única. Mensagens externas respeitam `Retry-After` quando disponível. Erros armazenados são sanitizados.

## Dead letter

Registra referência ao evento/job, consumidor, versão do handler, tentativas, classe/código sanitizado e estado de resolução. Payload sensível não deve ser copiado irrestritamente.

## Replay

Permitido para reconstrução/dry run/intervalo controlado. Notificação, exportação externa, pontos, certificados e outros efeitos irreversíveis ficam bloqueados por padrão durante replay.

## Reconciliação interna

Verifica, entre outros:

- evento sem outbox esperado;
- projeção divergente;
- ledger sem fato causal;
- submissão pendente sem processamento;
- checkpoint/cursor inconsistente;
- divergência de hash/idempotência.

## Reconciliação externa

O mecanismo é genérico por destino. Se HubSpot for um consumidor habilitado, comparar apenas IDs/propriedades autorizadas pela política de ownership e `DEC-070`. Não existe regra especial no núcleo que torne HubSpot obrigatório.

## Compensação

Não há rollback distribuído. Efeito já ocorrido recebe compensação de negócio quando suportada: novo lançamento de pontos, revogação preservando emissão, cancelamento ou nova sincronização corretiva. O fato original não é apagado.

## Alertas

Outbox envelhecida, consumidor parado, dead-letter, retry anormal, gap de versão, PII proibida e reconciliação divergente exigem alerta conforme severidade configurada. Limiares concretos pertencem ao ambiente operacional, não são inventados neste documento.