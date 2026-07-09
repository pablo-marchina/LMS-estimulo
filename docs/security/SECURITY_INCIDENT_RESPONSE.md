# Resposta a incidentes de segurança

## Registro implementado

Incidentes possuem código, tipo, severidade, estado, janela temporal, estimativas, impacto, contenção, causa raiz, dados pessoais/sensíveis envolvidos e avaliação de comunicação. A timeline é append-only e redige segredos.

## Estados

`detected → triage → investigating → contained → eradicated → recovering → monitoring → closed`

Também existe `false_positive`. O workflow técnico não decide sozinho se há obrigação de comunicação; registra a avaliação e sua evidência.

## Playbook mínimo

1. preservar evidências e limitar acesso;
2. classificar confidencialidade, integridade e disponibilidade;
3. identificar sistemas, dados, titulares, período e terceiros;
4. conter sem destruir evidências;
5. avaliar risco aos titulares e necessidade de comunicação;
6. erradicar a causa e rotacionar credenciais;
7. recuperar e validar integridade;
8. monitorar recorrência;
9. concluir postmortem com ações, responsáveis e prazos.

## Severidade proposta

- **low:** sem dado pessoal ou impacto material;
- **medium:** escopo limitado e contenção rápida;
- **high:** dado pessoal, indisponibilidade relevante, acesso persistente ou terceiro comprometido;
- **critical:** exfiltração ampla, dado sensível, ransomware, impacto em crédito ou incapacidade de contenção.

## Pendências

- incident commander e contatos reais;
- canal 24x7 e matriz de escalonamento;
- critérios aprovados de notificação à ANPD/titulares;
- integração com AWS, HubSpot e fornecedores;
- exercício tabletop e prova técnica;
- runbooks de credencial comprometida, vazamento, ransomware, perda de backup e decisão de crédito incorreta.
