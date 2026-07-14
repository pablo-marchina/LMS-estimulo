# Solicitação mínima de inventário do HubSpot

**Versão:** 0.2  
**Data:** 2026-07-14  
**Status:** necessária para o adapter real, sem bloquear desenvolvimento local

## Objetivo

Obter somente as informações necessárias para integrar o LMS ao HubSpot como User 360.

Não enviar tokens, segredos, cookies, dados pessoais reais ou exports de contatos.

## Informações necessárias

### Conta e acesso

- portal ID;
- sandbox ou test account disponível;
- hubs e tiers contratados;
- modelo de autenticação aprovado;
- responsável administrativo;
- scopes que podem ser concedidos.

### Objetos e identificadores

- contatos;
- empresas;
- objetos usados para crédito ou relacionamento;
- identificador de deduplicação de contato;
- identificador de empresa;
- associações contato–empresa e com objetos de crédito;
- propriedades já usadas para perfil, segmento, jornada ou capacitação.

### Integração

- webhooks disponíveis;
- limites de API e batch;
- convenção de nomes;
- workflows que leem ou escrevem propriedades relevantes;
- política de criação de novas propriedades;
- ambiente autorizado para testes.

## Matriz de projeção a aprovar

A integração deve mapear somente os dados necessários para operação e relacionamento.

| Dado do LMS | Finalidade | Destino HubSpot | Frequência | Histórico | Sensibilidade |
|---|---|---|---|---|---|
| identidade e vínculo empresarial | User 360 | a definir | criação/alteração | sim | pessoal |
| contexto de crédito autorizado | personalização | a definir | alteração | sim | elevado |
| versão e resultado do diagnóstico | personalização/relacionamento | a definir | conclusão/recálculo | sim | elevado |
| arquétipo vigente | personalização | a definir | alteração | sim | elevado |
| matrícula e progresso agregado | acompanhamento | a definir | marcos | sim | operacional |
| conclusão, selo e certificado | reconhecimento | a definir | emissão/revogação | sim | operacional |
| sinais aprovados | pesquisa/operação | a definir | conforme regra | sim | conforme sinal |

Eventos brutos, logs técnicos, arquivos e cada interação individual não precisam de propriedade CRM própria.

## Modelo físico

O inventário deve permitir escolher, para cada projeção:

- propriedade em contato ou empresa;
- associação com objeto existente;
- objeto customizado, somente quando necessário;
- evento de aplicação, quando adequado;
- referência ao registro detalhado mantido pelo LMS.

Não é requisito materializar formulários, questões, alternativas, jornadas e conteúdos completos como objetos HubSpot.

## Critério de conclusão

```text
hubspot_account_metadata_received = true
hubspot_sandbox_available = true
identity_and_company_mapping_defined = true
credit_context_mapping_defined = true
projection_matrix_approved = true
required_scopes_approved = true
api_limits_recorded = true
webhook_strategy_defined = true
```

Depois desse gate, o adapter real pode ser implementado e testado sem alterar o modelo operacional do LMS.