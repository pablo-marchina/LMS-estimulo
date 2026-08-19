# Baseline produtiva de RLS

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

## RLS habilitado sem políticas (padrão intencional)

Diversas tabelas (`iam.user_cpf_identifiers`, `assessment.delivery_*`, `engagement.reward_*`/`certificate_*`, `catalog.library_items`/`themes`, `experience.b2b_*`/`platform_settings`, `integration.identity_resolution_cases`, entre outras) têm `ROW LEVEL SECURITY` habilitado e **nenhuma política**. Isso é deliberado, não uma lacuna: todo acesso a essas tabelas acontece via funções `SECURITY DEFINER` de propriedade de um role privilegiado, que ignora RLS por definição de dono — não pela ausência de política. Ver comentário em `supabase/migrations/20260730212300_enable_extension_rls.sql`: "All extension data is accessed through authenticated SECURITY DEFINER RPCs... fail-closed for direct Data API access". Habilitar RLS sem política nessas tabelas serve para bloquear qualquer acesso direto via Data API (bypass das funções), não para filtrar linhas.

Exceção: `iam.user_cpf_identifiers` guarda dado `sensitive_personal` (CPF) e depende inteiramente de toda função `SECURITY DEFINER` que a toca estar corretamente escopada, sem uma segunda camada de defesa. Para essa tabela especificamente, considerar `FORCE ROW LEVEL SECURITY` + uma política explícita restrita a `service_role`, para que mesmo o dono da tabela não tenha acesso implícito fora do caminho de função (ver migration de hardening correspondente).

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
