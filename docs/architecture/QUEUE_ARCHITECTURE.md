# Contrato lógico de processamento assíncrono

**Revisado em:** 2026-07-30  
**Estado:** requisitos lógicos preservados; provider e operação AWS pendentes

## Objetivo

Desacoplar trabalhos demorados ou falháveis do request transacional sem introduzir semântica de um provedor no domínio.

Este documento não escolhe fila, scheduler, worker, dead-letter service ou mecanismo de identidade de workload. Essas decisões pertencem à futura arquitetura AWS.

## Estado atual

- o PostgreSQL contém eventos, outbox e estruturas históricas de jobs;
- o runtime ativo não possui scheduler ou worker de malware scan aprovado;
- Edge Functions e filas temporárias de scan não fazem parte da fonte versionada;
- nenhuma estrutura do ambiente Supabase de teste constitui arquitetura de produção;
- o código de domínio deve permanecer atrás de portas lógicas.

## Semântica mínima

Quando processamento assíncrono for implementado, o contrato deve assumir entrega **pelo menos uma vez**. Duplicatas, reentregas e falhas entre efeito e acknowledgement são condições normais.

Invariantes:

- cada trabalho possui identidade estável;
- publicação lógica duplicada é suprimida por chave de deduplicação;
- efeitos usam chave idempotente independente da entrega física;
- cada recebimento possui ownership e prazo explícitos;
- acknowledgement somente conclui o recebimento atual;
- retry não cria novo efeito de negócio;
- poison messages são isoladas e auditáveis;
- redrive preserva histórico e exige correção da causa;
- perda, duplicação ou reordenação não corrompe o estado de domínio;
- backlog e idade da mensagem são observáveis.

## Modelo lógico

```text
transação de domínio
→ evento/outbox
→ publicação idempotente
→ trabalho disponível
→ claim por consumidor
→ efeito idempotente
→ acknowledgement
```

Estados mínimos de um trabalho:

```text
created → queued → in_flight
                    ├─ completed
                    ├─ retry_scheduled → in_flight
                    ├─ dead_lettered → redrive autorizado
                    └─ cancelled
```

A implementação física pode adaptar esse modelo, mas não pode remover auditabilidade, idempotência ou reconciliação.

## Fronteiras

O domínio conhece somente contratos equivalentes a:

- publicar trabalho;
- receber/claimar lote;
- renovar prazo;
- concluir;
- solicitar retry;
- encaminhar para dead letter;
- redrive autorizado;
- consultar backlog e tentativas.

SDKs, receipt handles, nomes de filas, políticas físicas e credenciais permanecem dentro do adapter escolhido após ADR.

## Transação e outbox

Uma ação de negócio que exige processamento posterior deve confirmar estado, evento e outbox de forma atômica. Publicação externa ocorre depois do commit e é reconciliável.

```text
estado + evento + outbox
→ commit
→ publisher
→ provider assíncrono
→ consumidor
→ projeção/integração
```

Falha de publicação não pode perder o trabalho. Falha do consumidor não pode confirmar efeito parcial como concluído.

## Segurança

A futura implementação deve garantir:

- identidade de workload sem segredo permanente exposto ao cliente;
- privilégio mínimo por operação e recurso;
- payload sem token, segredo ou dado pessoal desnecessário;
- criptografia e retenção conforme classificação;
- logs com correlação e redação;
- proteção contra replay não autorizado;
- separação entre produção, staging e testes.

Nenhum mecanismo físico é considerado aprovado até ADR próprio.

## Capacidade e operação

O Gate B deve comprovar:

- throughput e paralelismo definidos por workload;
- backpressure e rejeição controlada;
- retry com jitter e limites;
- dead letter e redrive;
- reconciliação periódica;
- saturação e recuperação de dependências;
- alarmes por backlog, idade, falhas e dead letters;
- soak sem crescimento sustentado;
- custo e limites operacionais.

## Critério de implementação

Uma implementação somente pode ser marcada como ativa quando houver:

1. ADR do provider e da operação;
2. adapter sem vazamento de SDK para o domínio;
3. testes de idempotência, retry, dead letter e reconciliação;
4. observabilidade e runbooks;
5. carga no ambiente AWS aprovado;
6. rollback e recuperação exercitados.

Até lá, processamento assíncrono de produção permanece bloqueado e fail-closed.
