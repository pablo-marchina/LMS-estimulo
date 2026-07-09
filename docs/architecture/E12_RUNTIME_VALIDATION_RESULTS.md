# E12 — Resultados das validações de runtime

**Data:** 2026-07-08  
**Banco:** Supabase compartilhado de testes  
**Princípio:** todos os dados artificiais foram criados dentro de transações encerradas com `ROLLBACK`.

## RLS entre participantes

Com duas contas e dois empreendedores artificiais, a sessão `app_runtime` da conta A observou:

- contas visíveis: 1;
- conta B visível: 0;
- empreendedores visíveis: 1;
- empreendedor B visível: 0.

Resultado: **aprovado**.

## Bridge de identidade

Duas autenticações com o mesmo `issuer + subject`, mas fingerprints de claims diferentes, produziram:

- mesmo `user_account_id`: sim;
- contas internas: 1;
- identidades externas: 1.

Resultado: **aprovado**.

## Evento e transactional outbox

Uma chamada a `eventing.append_event` com duas rotas produziu atomicamente:

- eventos: 1;
- itens de outbox: 2;
- itens reivindicados por `claim_outbox_batch`: 2;
- `attempt_count` mínimo após claim: 1.

Resultado: **aprovado**.

## Inbox e append-only

- primeira aquisição pelo consumidor: aceita;
- segunda aquisição para o mesmo `consumer_id + event_id`: rejeitada;
- conclusão do processamento: aceita;
- tentativa de atualizar o evento imutável: bloqueada pelo trigger.

Resultado: **aprovado**.

## Limites desta validação

Ainda faltam:

- teste concorrente com múltiplas conexões/workers reais;
- teste de reutilização de conexão em pool;
- JWT real emitido pelo Supabase Auth;
- paridade no Amazon RDS de staging;
- carga representativa e testes de desempenho.
