# Arquitetura de fluxos de dados ponta a ponta

## Princípios

1. estado operacional, ledger, evento e outbox do mesmo fato são confirmados de forma transacional quando pertencem ao mesmo comando;
2. navegador envia comandos e observações, mas o servidor decide fatos críticos como conclusão, nota, pontos e autorização;
3. consumidores são idempotentes e replay não repete efeito externo por padrão;
4. PostgreSQL é a fonte operacional; destinos externos são assíncronos e substituíveis;
5. PII e arquivos permanecem em stores protegidos; eventos usam IDs e metadados mínimos;
6. features analíticas permanecem separadas dos fatos de origem;
7. cada subdomínio preserva o histórico necessário para reproduzir decisões e resultados.

## Fluxo-base

```text
Browser/Admin
→ Route/Server Action/API
→ autenticação + autorização + validação + idempotência
→ caso de uso/RPC transacional
   ├─ estado
   ├─ ledger/histórico quando aplicável
   ├─ evento
   ├─ auditoria
   └─ outbox
→ commit
→ projeções e consumidores
```

## Stores principais

- identidade: contas, participantes, negócios, organizações e memberships;
- catálogo: programas, jornadas, trilhas, atividades, biblioteca e temas;
- orquestração: matrícula, instância, etapas e progressão;
- diagnóstico/assessment: instrumentos, respostas, resultados, tentativas e entregas;
- engagement: ledgers, ranking, rewards, badges e certificados;
- eventing: eventos, outbox e inbox;
- storage: objetos privados e metadados;
- behavior/reporting: features, scores e projeções;
- governance: documentos legais, aceites e auditoria.

## Jornada

```text
draft → editar → publicar
published → editar
published → despublicar → draft
```

O mesmo registro operacional representa a jornada. Fatos de execução não são regravados por uma alteração editorial.

## Diagnóstico e avaliações

Instrumentos versionados preservam a configuração usada por cada sessão/tentativa. Cálculo, correção e progressão acontecem no servidor com dados estruturados e idempotência.

## Gamificação

Pontos são lançamentos de ledger. Ranking e saldos são projeções. Badges e certificados mantêm identidade e regra de emissão suficientes para auditoria.

## Integração externa

```text
transação de domínio
→ evento/outbox
→ consumidor
→ destino externo
→ checkpoint/reconciliação
```

A indisponibilidade do destino não reabre nem invalida uma transação de negócio já confirmada. Falhas permanecem na camada de entrega, com retry, dead letter e reconciliação.

## Falhas e replay

Falha antes do commit não produz estado parcial. Replay de projeções reconstrói estado derivado sem repetir efeitos externos destrutivos. Divergências são tratadas por reconciliação explícita.

## Fontes de verdade

- schema e transações: `supabase/migrations/`;
- outbox: [`../architecture/TRANSACTIONAL_OUTBOX.md`](../architecture/TRANSACTIONAL_OUTBOX.md);
- domínio: [`../domain/DOMAIN_MODEL.md`](../domain/DOMAIN_MODEL.md);
- runtime: [`../implementation/APPLICATION_FOUNDATION.md`](../implementation/APPLICATION_FOUNDATION.md).