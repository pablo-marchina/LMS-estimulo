# Handoff operacional — E13

## Consultas principais

```sql
select public.production_readiness_status('production');

select code,status,legal_basis_code,high_risk,credit_decision_use
from governance.processing_activities
order by code;

select control_code,status,owner_role,evidence_reference
from governance.production_readiness_controls
where environment='production'
order by blocking desc,control_domain,control_code;
```

## Fluxos server-side

- abrir solicitação: `public.privacy_submit_request`;
- registrar evento/resolução: `public.privacy_record_event`;
- registrar decisão de consentimento: `public.consent_record_decision`;
- abrir incidente: `public.security_open_incident`;
- atualizar incidente: `public.security_record_incident_event`.

Não conceder essas RPCs a `anon` ou `authenticated`. A aplicação deve oferecer endpoints próprios, autenticar, autorizar, validar payload e definir request context.

## Mudança de controle para `passed`

Exigir:

1. evidência verificável;
2. revisão do owner;
3. `verified_at` e, quando aplicável, `verified_by`;
4. ausência de conflito com controles relacionados;
5. teste no ambiente correspondente.

Não usar `accepted_risk` sem aprovação formal, prazo, escopo e plano de tratamento.

## Operações proibidas

- inserir valores de segredo em `secret_inventory`;
- ativar atividade com base/prazo “provisórios”;
- usar score ou feature em crédito;
- executar retenção destrutiva sem dry run e legal-hold check;
- registrar PII/documentos em logs;
- carregar dados reais no scanner técnico de prova;
- marcar AWS controls como aprovados com base no Supabase.

## Incidente

Em suspeita de exposição: preservar evidência, limitar acesso, abrir registro, classificar, rotacionar credenciais afetadas, avaliar dados/titulares/terceiros e acionar o processo institucional de comunicação.
