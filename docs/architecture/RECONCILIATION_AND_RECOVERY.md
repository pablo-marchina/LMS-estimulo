# Reconciliação e recuperação

**Revisado em:** 2026-07-30  
**Estado:** requisitos lógicos definidos; automação de produção pendente

## Objetivo

Detectar e corrigir divergências entre estado transacional, eventos, outbox, objetos, integrações e processamentos posteriores sem duplicar efeitos ou esconder falhas.

O runtime atual não possui scheduler, reconciliador de fila, token de dispatch ou worker de scan aprovado. Estruturas históricas no banco não constituem operação ativa.

## Invariantes

1. toda operação reconciliável possui identidade estável;
2. efeitos de negócio são idempotentes;
3. estado confirmado, evento e outbox permanecem correlacionados;
4. divergência é detectável e auditável;
5. recuperação não apaga histórico nem altera evidência retroativamente;
6. retry preserva a intenção original;
7. ação manual exige autorização, motivo e registro;
8. falha de reconciliação fecha o fluxo quando integridade ou segurança puder ser afetada.

## Classes de divergência

- outbox pendente sem publicação;
- publicação sem projeção confirmada;
- integração externa sem readback ou correlação;
- objeto físico sem registro lógico ou registro sem objeto;
- sessão ou tentativa interrompida em estado não terminal;
- identidade externa sem vínculo interno consistente;
- trabalho assíncrono futuro sem claim, ack ou efeito coerente;
- configuração publicada divergente da versão referenciada;
- deployment diferente do SHA/digest aprovado.

## Ciclo lógico

```text
inventariar estado esperado e observado
→ classificar divergência
→ bloquear ações inseguras
→ executar reparo idempotente
→ verificar resultado
→ registrar evidência
→ escalar quando não reconciliável automaticamente
```

## Regras de recuperação

- nunca inferir sucesso apenas porque uma chamada externa respondeu;
- consultar estado antes de repetir efeito;
- usar chaves idempotentes e versões agregadas;
- não criar novo identificador de domínio para um retry;
- preservar erro original, tentativas e ator;
- limitar número e duração de retries;
- isolar itens não recuperáveis para revisão;
- não executar redrive sem correção ou autorização;
- emitir alerta quando backlog, idade ou falha ultrapassar o limite aprovado.

## Estado atual do software

Os gates do banco exercitam idempotência, concorrência, eventos, outbox, autorização e falhas transacionais em PostgreSQL efêmero. Isso prova os contratos do software, não uma operação contínua de produção.

A verificação de ambiente implantado deve ser read-only e não criar jobs, tokens ou dados sintéticos permanentes.

## Gate B

A futura arquitetura deve definir e provar:

1. proprietário e frequência de cada reconciliação;
2. fonte de autoridade por entidade;
3. mecanismo de claim, retry e isolamento;
4. limites, backoff e dead letter quando aplicável;
5. observabilidade e alertas;
6. ferramentas e autorização para reparo manual;
7. retenção das evidências;
8. cenários de falha e recuperação no staging AWS;
9. runbooks e escalonamento;
10. rollback e disaster recovery.

Produção não pode ser liberada enquanto divergências críticas não forem detectáveis e recuperáveis dentro dos objetivos aprovados.
