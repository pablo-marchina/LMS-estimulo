# Identidade, acesso e vínculo externo

**Revisado em:** 2026-07-29  
**Status:** identidade interna implementada; adapter Cognito/AWS pendente

## Modelo invariável

A aplicação distingue:

- identidade externa;
- conta interna;
- participante/empreendedor;
- negócio;
- organização operadora;
- memberships, capacidades e validade;
- contato/empresa HubSpot;
- operação de crédito.

A autorização pertence ao LMS. Um subject externo, domínio de e-mail, grupo do IdP ou claim isolada nunca concede permissão de domínio diretamente.

## Desenvolvimento/teste

Supabase Auth continua ativo quando:

```text
PLATFORM_RUNTIME_PROVIDER=supabase
```

Capacidades atuais:

### Participantes

- cadastro público;
- confirmação de e-mail;
- login por senha;
- recuperação pelo provedor de teste;
- captura de UTM;
- conclusão de cadastro com CPF obrigatório;
- CPF protegido por AES-256-GCM e HMAC independente;
- resolução da identidade interna.

### Administração

- entrada separada em `/entrar/administracao`;
- Google OAuth;
- e-mail confirmado no domínio exato `@estimulo.org`;
- vínculo organizacional e RBAC;
- login administrativo por senha proibido.

O runtime não contém identidade sintética, login de teste ou bypass.

## Produção AWS

Amazon Cognito User Pool será o broker OIDC padrão, conforme [`DEC-075`](../decisions/AWS_PRODUCTION_ARCHITECTURE.md). Se a empresa já possuir um broker corporativo aprovado, ele pode federar pelo Cognito ou substituí-lo mediante equivalência do contrato OIDC.

Fluxo canônico:

```text
participante: Cognito local ou método corporativo aprovado
administrador: Google/OIDC/SAML federado
                    ↓
token OIDC verificado
                    ↓
provider + issuer + subject + e-mail verificado
                    ↓
external identity
                    ↓
internal user account
                    ↓
participant / organization memberships / RBAC
```

O Cognito não substitui a conta interna. O identificador externo pode mudar, ser vinculado ou ser revogado sem alterar o histórico de domínio.

## Requisitos do adapter AWS

O adapter precisa:

1. validar assinatura, issuer, audience, expiração e token use;
2. aceitar somente providers e app clients aprovados;
3. exigir e-mail verificado onde aplicável;
4. normalizar o contexto de identidade;
5. resolver a conta interna de forma idempotente;
6. impedir linking por coincidência simples de e-mail;
7. carregar memberships e capacidades do PostgreSQL;
8. suportar revogação, encerramento de sessão e recuperação;
9. registrar eventos sem tokens ou dados sensíveis;
10. funcionar atrás do domínio e front door oficiais.

## Migração de usuários

A estratégia precisa ser aprovada com a infraestrutura corporativa:

- usuários novos entram diretamente pelo Cognito;
- contas Supabase existentes são ligadas à mesma conta interna após prova de controle;
- senhas não são copiadas como texto nem presumidas portáveis;
- pode ser necessário reset de senha ou migração suportada;
- conflitos, duplicidades e merges passam por fluxo auditável;
- sessões Supabase não são válidas em produção AWS.

## Administração federada

O Google Workspace pode ser configurado como IdP do Cognito. O domínio `@estimulo.org` continua sendo uma condição, não uma autorização completa. A entrada administrativa exige também:

- provider federado aprovado;
- e-mail confirmado;
- vínculo com organização interna;
- capacidade RBAC ativa;
- validade temporal e finalidade quando aplicável.

## Integração com site e HubSpot

Ainda precisam ser definidos:

- entrada/SSO a partir do site Estímulo;
- comportamento para usuários existentes;
- telefone e CNPJ opcional;
- vínculo com negócio e operação de crédito;
- inventário e deduplicação HubSpot;
- suporte, recuperação e merge institucional.

Somente dados autorizados pela DEC-070 podem sair do LMS. CPF bruto não é enviado em eventos de engajamento.

## Gate

```text
internal_identity_model = implemented
supabase_development_adapter = active
production_identity_target = cognito_or_corporate_oidc
aws_identity_adapter = pending
participant_migration_policy = pending
admin_federation_configuration = pending
official_site_entry = pending
hubspot_identity_resolution = pending
aws_identity_e2e = pending
```
