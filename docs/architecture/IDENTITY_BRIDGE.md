# Bridge de identidade Supabase/Cognito/HubSpot

**Versão:** 1.1  
**Data:** 2026-07-16  
**Estado:** contrato técnico parcial; integração oficial pendente

## Autoridade e objetivo

`premissas-desenvolvimento.md` exige:

- clientes com crédito vinculados ao registro correto;
- criação de clientes sem crédito para associação futura;
- coleta ou resolução de nome, e-mail, CPF, telefone, CNPJ opcional e UTM;
- login integrado à experiência Estímulo.

A DEC-070 limita os dados enviados pelo LMS ao HubSpot a identificadores mínimos de vínculo, engajamento e dados úteis para cálculos aprovados.

## Fluxo esperado

```text
entrada pelo site Estímulo
→ autenticação no provedor autorizado
→ validação de token, issuer, audience e expiração
→ coleta ou resolução dos campos obrigatórios
→ normalização da identidade externa
→ resolução do user_account interno
→ busca e deduplicação no HubSpot
→ vínculo ou criação do registro CRM
→ persistência dos identificadores cruzados
→ sessão interna autorizada
→ contexto transacional PostgreSQL
```

## Identidades separadas

O domínio preserva:

- identidade externa de autenticação;
- conta interna `iam.user_account`;
- empreendedor;
- negócio;
- contato/empresa no HubSpot;
- operação de crédito;
- organização operadora.

Nenhum identificador substitui silenciosamente outro.

## Regras de autenticação

- JWT e refresh token não são persistidos;
- chave do domínio nunca é apenas o `sub` externo;
- identidade externa é única por `(issuer, subject)`;
- e-mail deve ser verificado;
- colisão por e-mail não vincula contas automaticamente;
- mudança de provedor não troca o `user_account_id`;
- sessões administrativas exigem autorização Estímulo;
- recursos de teste falham fechados em produção.

## Dados de entrada

Antes da ativação oficial, definir e testar:

- nome e nome preferido;
- e-mail normalizado e verificado;
- CPF validado e protegido;
- telefone normalizado;
- CNPJ opcional e vínculo ao negócio;
- UTMs e origem;
- consentimentos e aviso de privacidade;
- atualização e correção.

Esses dados podem já existir no HubSpot como dados CRM. A integração do LMS usa somente os identificadores mínimos necessários para localizar ou associar os sinais permitidos pela DEC-070.

## Resolução no HubSpot

A busca pode considerar:

- ID HubSpot conhecido;
- CPF;
- CNPJ e associação;
- e-mail;
- telefone;
- identificador de crédito;
- ID interno sincronizado.

Estados possíveis:

```text
single_match
no_match_create
multiple_matches_manual_resolution
conflict_blocked
existing_contact_new_company
existing_contact_existing_credit
```

Merge automático somente com regra aprovada e auditável.

## Identificadores persistidos para integração

O LMS deve preferir:

- `user_account_id` interno;
- `hubspot_contact_id`;
- `hubspot_company_id` quando necessário;
- `credit_operation_id` quando autorizado;
- hashes ou fingerprints necessários para reconciliação.

Não é necessário repetir CPF, telefone ou e-mail em cada evento de engajamento.

## Contexto transacional

Após validação e resolução:

```sql
SET LOCAL app.user_account_id = '<uuid>';
SET LOCAL app.organization_id = '<uuid>';
```

O contexto é derivado pelo servidor.

## Provedores

### Supabase development/test

O adapter pode validar tokens do projeto autorizado e resolver identidade interna. A prova real exige usuário controlado e fluxo com HubSpot sandbox.

### AWS production

O adapter de produção deve validar Cognito ou alternativa aprovada, mantendo o mesmo contrato interno.

## Cadastro de teste

O cadastro de teste:

- existe somente para desenvolvimento;
- não coleta todos os campos oficiais;
- não resolve identidade HubSpot real;
- não integra o site;
- não encerra o requisito.

## Gates

```text
site_entry_flow_defined = false
real_identity_provider_selected = false
name_email_cpf_phone_cnpj_utm_flow_tested = false
hubspot_identity_search_implemented = false
hubspot_contact_creation_implemented = false
hubspot_company_and_credit_association_implemented = false
deduplication_and_conflict_rules_approved = false
minimal_linking_identifiers_defined = false
participant_and_admin_permissions_tested = false
supabase_real_token_flow_tested = false
aws_identity_flow_tested = false
production_test_bypasses_disabled = true
```
