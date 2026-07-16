# Bridge de identidade Supabase/Cognito/HubSpot

**Versão:** 1.0  
**Data:** 2026-07-16  
**Estado:** contrato técnico parcial; integração oficial de identidade pendente

## Autoridade e objetivo

`premissas-desenvolvimento.md` exige:

- identificação de clientes com crédito no mesmo registro HubSpot;
- criação de clientes sem crédito no HubSpot;
- associação futura do crédito ao mesmo usuário;
- coleta ou resolução de nome, e-mail, CPF, telefone e CNPJ opcional;
- captura de UTM;
- login integrado à experiência oficial da Estímulo.

Este documento define o mecanismo técnico sem reduzir esses requisitos.

## Fluxo esperado

```text
entrada pelo site Estímulo
→ autenticação no provedor autorizado
→ validação de token, issuer, audience e expiração
→ coleta/resolução de nome, e-mail, CPF, telefone, CNPJ opcional e UTM
→ normalização de identidade externa
→ resolução do user_account interno
→ busca e deduplicação no HubSpot
→ vínculo ou criação de contato/empresa
→ registro dos identificadores cruzados
→ sessão interna autorizada
→ contexto transacional PostgreSQL
```

## Identidades separadas

O domínio preserva:

- identidade externa de autenticação;
- conta interna `iam.user_account`;
- empreendedor;
- negócio/empresa;
- contato/empresa/objeto no HubSpot;
- operação de crédito;
- organização operadora.

Nenhum desses identificadores deve ser usado como substituto silencioso de outro.

## Regras de autenticação

- JWT, refresh token e documento bruto de claims não são persistidos;
- chave primária do domínio nunca é somente o `sub` do provedor;
- identidade externa é única por `(issuer, subject)`;
- e-mail deve ser verificado;
- colisão por e-mail não vincula contas automaticamente;
- mudança de provedor não troca o `user_account_id` interno;
- sessões administrativas exigem conta autorizada da Estímulo;
- recursos de teste falham fechados em produção.

## Regras de dados de entrada

Antes da ativação oficial, definir e testar:

- nome e nome preferido;
- e-mail normalizado e verificado;
- CPF validado e protegido;
- telefone normalizado;
- CNPJ opcional e associação ao negócio;
- UTMs e origem;
- consentimentos e aviso de privacidade;
- dados mínimos versus complementares;
- atualização e correção de dados.

## Resolução no HubSpot

A busca deve usar regras aprovadas, não apenas e-mail.

Possíveis sinais:

- ID HubSpot já conhecido;
- CPF;
- CNPJ e associação;
- e-mail;
- telefone;
- identificador de operação de crédito;
- ID interno previamente sincronizado.

Estados possíveis:

```text
single_match
no_match_create
multiple_matches_manual_resolution
conflict_blocked
existing_contact_new_company
existing_contact_existing_credit
```

Merge automático só é permitido quando a regra for explicitamente aprovada e auditável.

## Contexto transacional

Após a identidade ser validada e resolvida, a aplicação deve estabelecer contexto interno para autorização e RLS:

```sql
SET LOCAL app.user_account_id = '<uuid>';
SET LOCAL app.organization_id = '<uuid>';
```

O contexto deve ser derivado pelo servidor, nunca aceito diretamente do cliente.

## Provedores

### Supabase development/test

O adapter pode validar tokens do projeto autorizado e resolver a identidade interna. A prova real ainda requer usuário controlado e fluxo completo, inclusive HubSpot sandbox.

### AWS production

O adapter de produção deve validar o provedor escolhido, inicialmente Cognito ou alternativa aprovada, mantendo o mesmo contrato interno.

A troca de provedor não altera entidades de domínio nem dados HubSpot.

## Cadastro de teste

O cadastro público de teste:

- existe somente para desenvolvimento;
- não coleta todos os campos oficiais;
- não resolve identidade HubSpot real;
- não integra o site;
- não encerra este requisito.

## Gates

```text
site_entry_flow_defined = false
real_identity_provider_selected = false
name_email_cpf_phone_cnpj_utm_flow_tested = false
hubspot_identity_search_implemented = false
hubspot_contact_creation_implemented = false
hubspot_company_and_credit_association_implemented = false
deduplication_and_conflict_rules_approved = false
participant_and_admin_permissions_tested = false
supabase_real_token_flow_tested = false
aws_identity_flow_tested = false
production_test_bypasses_disabled = true
```
