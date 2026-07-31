# Transactional outbox executável

**Revisado em:** 2026-07-31  
**Estado:** persistência, claim e contratos implementados; consumidor externo de produção pendente

## Responsabilidade

A outbox desacopla transações do LMS de qualquer destino externo. O produtor conhece apenas evento, rota lógica, payload versionado, hash e idempotency key. Nenhum CRM, warehouse ou API específica é requisito do domínio.

## Operação atômica

Na mesma transação, o caso de uso:

1. autentica e autoriza o ator;
2. valida payload e idempotency key;
3. bloqueia o agregado quando necessário;
4. altera o estado ou ledger;
5. chama `eventing.append_event(...)`;
6. cria as rotas de outbox;
7. registra auditoria quando a operação é privilegiada;
8. confirma tudo junto.

A função calcula o hash do payload e cria uma linha por `route_key`. Nenhum efeito externo ocorre antes do commit.

## Contrato do consumidor ETL

Um consumidor futuro deve:

- permanecer desativado enquanto `ETL_EXPORT_ENABLED=false`;
- usar `eventing.claim_outbox_batch` com `FOR UPDATE SKIP LOCKED`, lease e lote limitado;
- preservar `event_id`, `correlation_id`, schema version e payload hash;
- deduplicar em inbox antes de executar o efeito;
- enviar idempotency key ao destino quando suportado;
- registrar tentativa, status, resposta sanitizada e checkpoint;
- completar, reagendar com backoff ou mover para dead letter;
- exportar por cursor monotônico e permitir retomada;
- assumir entrega pelo menos uma vez, nunca exatamente uma vez física.

## Estados

```text
pending → claimed → completed
              ↘ retry_wait → claimed
              ↘ dead_letter
```

Lease expirado devolve o item à elegibilidade. Uma confirmação externa sem checkpoint deve ser reconciliada antes de novo envio.

## Segurança de replay

Replay de projeção nunca chama destinos externos. Uma rota externa só é reativada por operação explícita, auditada e idempotente. Alterar o destino ETL não exige mudar produtores, tabelas de domínio ou eventos históricos.

## Dados exportáveis

A outbox pode transportar fatos mínimos e IDs opacos. Conteúdo livre, arquivos, URLs assinadas, segredos e dados pessoais desnecessários permanecem no store protegido. A transformação para um destino externo deve aplicar classificação, minimização e aprovação próprias.

## Observabilidade

Métricas mínimas:

- idade e volume do item pendente mais antigo;
- claim, conclusão, retry e dead letter por rota;
- latência evento → checkpoint;
- duplicatas detectadas;
- lease expirado;
- divergência de hash ou cursor;
- falha por destino configurado.

## Provas de produção pendentes

- concorrência entre consumidores sem claim duplicado;
- recuperação de lease expirado;
- backpressure e saturação;
- retry sem duplicar pontos, certificados, resgates ou exportações;
- reconciliação após resposta externa ambígua;
- retenção, alertas e continuidade no provider AWS aprovado.
