# E12 — Baseline produtiva de RLS

**Versão:** 0.2  
**Estado:** policies geradas; execução em PostgreSQL pendente

## Modelo

As tabelas não leem `auth.uid()` nem claims específicas do Supabase. A API verifica o token, resolve `user_account_id` e abre cada transação com:

```sql
select app_private.set_request_context(
  :user_account_id,
  :organization_id,
  :request_id,
  :actor_type
);
```

As policies usam somente identidade interna, organização atual, capacidades, escopo, recurso e vínculos do domínio.

## Separação de acesso

- participante: seus próprios dados, jornadas, respostas, submissões, pontos e certificados;
- operador: somente organização e recursos autorizados por capacidade/escopo;
- reviewer: revisões atribuídas;
- worker: role de banco separada, `NOBYPASSRLS`, contexto `worker/system` e acesso mínimo;
- navegador: nenhum grant direto aos schemas internos;
- eventing/intelligence/governance: sem exposição direta a `anon` ou `authenticated`.

## Limitação deliberada

RLS não substitui autorização de caso de uso nem column-level grants. Alterações de campos sensíveis — status da conta, aprovação, score, emissão de credencial — continuam restritas a comandos de aplicação e funções autorizadas.

## Prova necessária

A suíte em PostgreSQL deverá testar ao menos:

1. participante A não lê participante B;
2. operador de organização A não lê organização B;
3. participante não altera score, certificado ou ledger;
4. worker sem role `app_worker` não usa contexto de sistema;
5. fim da transação limpa o contexto;
6. conexão reutilizada no pool não herda outro usuário.
