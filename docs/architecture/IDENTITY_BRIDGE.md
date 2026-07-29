# Identidade, acesso e vínculo externo

**Revisado em:** 2026-07-29  
**Status:** identidade da aplicação implementada em Supabase; integração institucional pendente

## Estado implementado

### Participantes

- cadastro público;
- confirmação de e-mail;
- login por senha;
- captura de UTM de primeiro contato;
- conclusão do cadastro com CPF obrigatório;
- CPF validado, cifrado por AES-256-GCM e indexado por HMAC independente;
- resolução de contexto interno para acessar áreas protegidas.

### Administração

- entrada separada em `/entrar/administracao`;
- Google OAuth;
- e-mail confirmado no domínio exato `@estimulo.org`;
- vínculo organizacional e RBAC;
- login administrativo por senha proibido.

O domínio do e-mail e o parâmetro Google `hd` não concedem permissões sozinhos.

## Entidades

A aplicação distingue:

- identidade externa;
- conta interna;
- participante/empreendedor;
- negócio;
- organização operadora;
- contato e empresa no HubSpot;
- operação de crédito.

Não existe vínculo automático por simples coincidência de e-mail.

## Runtime atual

Supabase Auth é o provedor ativo de desenvolvimento/teste. Cookies e tokens são gerenciados pelo adapter SSR e não são persistidos como dados de domínio.

O provedor de produção na AWS ainda não foi selecionado. Cognito é uma alternativa possível, não uma implementação vigente.

## Lacunas institucionais

Ainda precisam ser definidos e comprovados:

- entrada integrada ao site Estímulo ou SSO;
- tratamento de usuários já existentes;
- telefone;
- CNPJ opcional e vínculo com negócio;
- recuperação e suporte de conta;
- merge e conflitos;
- provedor de identidade de produção;
- configuração oficial dos redirects e domínios;
- vínculo e deduplicação no HubSpot;
- relação com operações de crédito.

## HubSpot

O código possui política, adapter HTTP e fila de resolução administrativa, mas não possui inventário físico, sandbox ou regras aprovadas para criar, associar ou mesclar registros reais.

Somente identificadores mínimos e dados autorizados pela DEC-070 podem sair do LMS. CPF bruto não é enviado em eventos de engajamento.

## Testes sintéticos

O Browser E2E possui modo sintético restrito a host local, token longo e cookie específico. Não existe rota pública de cadastro de teste e não há bypass produtivo.

## Gate

```text
participant_signup = implemented
participant_email_confirmation = implemented
participant_password_login = implemented
cpf_protection = implemented
admin_google_oauth = implemented
admin_domain_and_rbac_gate = implemented
official_site_entry = pending
phone_and_optional_cnpj = pending
production_identity_provider = pending
hubspot_identity_resolution = pending
aws_identity_e2e = pending
```
