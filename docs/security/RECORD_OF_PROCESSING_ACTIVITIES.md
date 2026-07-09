# Registro técnico de operações de tratamento — ROPA

## Estado

O ROPA técnico possui sete atividades, 18 ativos, 26 vínculos de necessidade, quatro partes e 16 vínculos com terceiros. Todas as atividades permanecem `draft`; o registro é uma hipótese de arquitetura, não aprovação jurídica.

| Atividade | Perfilamento | Alto risco | Crédito | Estado |
|---|---:|---:|---:|---|
| Operação central da plataforma | não | não | não | draft |
| Personalização da aprendizagem | sim | sim | não | draft |
| Operações de segurança | não | sim | não | draft |
| Avaliação de efetividade | sim | sim | não | draft |
| Sincronização CRM | não | sim | não | draft |
| Pesquisa comportamental experimental | sim | sim | não | draft |
| Apoio futuro a crédito | sim | sim | sim | draft e proibida |

## Condições para ativação

Uma atividade só pode mudar para `active` quando:

1. a finalidade estiver aprovada;
2. existir base legal específica;
3. houver política de retenção aprovada;
4. pelo menos um ativo estiver vinculado com justificativa de necessidade;
5. a aprovação estiver registrada;
6. atividades de alto risco tiverem RIPD efetivo;
7. atividades de crédito tiverem o controle `CREDIT_DECISION_GOVERNANCE` aprovado.

O banco rejeita transações que tentem contornar essas condições.

## Partes registradas

- Estímulo: controlador proposto, pendente de confirmação formal do escopo;
- Supabase: infraestrutura de testes, pendente de região, DPA e avaliação;
- AWS: infraestrutura futura de produção, pendente de conta, região, contratos e controles;
- HubSpot: operador/CRM proposto, pendente de inventário e avaliação.

## Aprovação necessária

Para cada atividade, a Estímulo deve confirmar: controlador, finalidade, base legal, titulares, fontes, campos, operações, destinatários, transferências, retenção, responsáveis, medidas de segurança e documentação de alto risco. A atividade deve ser dividida quando finalidades ou bases forem materialmente distintas.
