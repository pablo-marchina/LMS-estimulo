# Gate de prontidão para produção

## Resultado atual

```text
ready = false
passed = 2
blocking_open = 22
accepted_risk = 0
```

A existência de código deployável não permite operação real. O gate é um registro canônico de evidências; `passed` exige verificação, e risco aceito exige referência formal.

## Aprovados tecnicamente

- `INTERNAL_RLS_COMPLETE`: 156/156 tabelas com RLS, nenhuma sem policy e nenhuma legível diretamente por cliente.
- `LOG_REDACTION_ACTIVE`: redaction recursiva e hash consistente comprovados.

## Em progresso

- direitos dos titulares: workflow e RPCs existem, mas falta canal, exportação e exercício real;
- resposta a incidentes: registro e timeline existem, mas faltam contatos, playbook aprovado e exercício.

## Bloqueados

Controlador, encarregado/dispensa, aviso de privacidade, ROPA, bases legais, retenção, scanner real, AWS staging, backup/PITR, restore, TLS, rotação, access review, contratos/DPA, transferências, HubSpot, RIPD comportamental, governança de crédito, KMS e integridade de auditoria cloud.

## Informação/documentação a obter

1. identificação jurídica do controlador e escopo;
2. encarregado, ato de designação ou análise de dispensa, com canal público;
3. inventário HubSpot e fluxo real de crédito;
4. decisões de base legal e retenção;
5. textos de aviso e consentimento;
6. conta/região/rede/domínios AWS;
7. contratos, DPAs, subprocessadores e transferências;
8. owners e escalonamento operacional;
9. RPO/RTO, política de backup e restore;
10. política de crédito para revisão humana, contestação, explicabilidade, equidade e monitoramento.

## Regra de uso comportamental

A atividade `credit_decision_support` permanece `draft`. Mesmo com base, retenção e RIPD preenchidos, o banco rejeita sua ativação enquanto `CREDIT_DECISION_GOVERNANCE` não estiver `passed`.
