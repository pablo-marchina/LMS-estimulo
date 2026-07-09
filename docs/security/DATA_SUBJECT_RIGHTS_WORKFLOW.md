# Fluxo de direitos dos titulares

## Escopo implementado

O workflow suporta confirmação, acesso, correção, anonimização, bloqueio, eliminação, portabilidade, informação sobre compartilhamento, informação/revogação do consentimento, revisão de decisão automatizada, oposição e outros pedidos.

## Fluxo

1. **Recebimento:** cria referência, canal, tipo, escopo e prazo.
2. **Verificação de identidade:** registra `pending`, `verified`, `failed` ou `not_required` sem armazenar credenciais no evento.
3. **Validação e delimitação:** identifica sistemas, períodos, finalidades e terceiros.
4. **Busca e execução:** produz evidências por sistema; verifica legal holds e obrigações de conservação.
5. **Revisão:** jurídica/privacidade quando houver conflito, eliminação, crédito ou terceiros.
6. **Resposta:** `fulfilled`, `partially_fulfilled`, `rejected` ou `cancelled`, com justificativa e evidências.
7. **Auditoria:** cada mudança produz evento append-only e audit log redigido.

## Controles

- RPCs somente server-side;
- request events imutáveis;
- redaction recursiva;
- nenhuma exportação por URL permanente;
- arquivos de resposta devem usar armazenamento privado e TTL curto;
- pedidos de revisão automatizada devem preservar input, versão do modelo/regra, explicação e revisão humana;
- eliminação deve consultar retenção e legal hold antes da execução.

## Ainda necessário

- canal público e identidade do encarregado/dispensa;
- SLA interno e responsáveis de escalonamento;
- processo de verificação proporcional ao risco;
- exportador real de dados por titular;
- integrações com HubSpot, AWS e sistemas de crédito;
- templates de resposta aprovados;
- exercício operacional ponta a ponta com equipe real.
