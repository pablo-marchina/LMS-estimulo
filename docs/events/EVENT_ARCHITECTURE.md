# Arquitetura canônica de eventos

**Revisado em:** 2026-09-01  
**Status:** arquitetura vigente de fatos/eventos; não é event sourcing integral

## Decisão

Tabelas operacionais mantêm estado atual e invariantes. Eventos preservam fatos relevantes; outbox os distribui sem perder atomicidade. Eventos derivados não substituem fatos de origem.

```text
comando/observação
→ autenticar + autorizar + validar
→ executar regra
→ estado + evento + outbox (+ auditoria) no mesmo commit
→ consumidores idempotentes
```

## Classes

- comando: pedido que pode ser recusado;
- evento de domínio: fato confirmado pelo backend;
- observação comportamental: evidência validada que pode não alterar estado;
- integração: fato sobre entrega/consumo externo;
- auditoria: fato privilegiado;
- telemetria: logs/traces/métricas, fora do catálogo de comportamento salvo contrato explícito.

## Regras

- browser não declara conclusão/nota/pontos como fato final;
- `client_event_id`/idempotência controlam observações repetidas;
- webhooks externos são verificados antes de virar fato canônico;
- replay de projeção não repete efeito externo automaticamente;
- payload evita PII, segredo, binário e URL assinada desnecessários;
- jornada usa eventos como `admin.journey.saved/published/unpublished` sobre o registro operacional atual; nome legado de aggregate não implica snapshot editorial.

## Integrações

Outbox roteia eventos para consumidores genéricos. Destino externo não participa da transação síncrona. Se HubSpot for configurado, a projeção obedece minimização/`DEC-070`.

## Evolução

Evento possui schema/versionamento e compatibilidade explícita. Mudança incompatível cria nova versão/handler e mantém consumidores antigos pelo período necessário; não se altera payload histórico.

## Observabilidade

Métricas essenciais incluem falha de escrita/evento, idade de outbox, retry/dead-letter, latência, duplicata, gap e reconciliação. Valores de SLO pertencem ao ambiente aprovado.