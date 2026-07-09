# Governança de base legal e consentimento

## Regra central

O catálogo contém hipóteses previstas na LGPD, mas o sistema não escolhe a base legal automaticamente. A seleção exige avaliação institucional por atividade e não por produto inteiro.

## Consentimento

Consentimento só pode ser usado quando a finalidade aprovada estiver marcada como `requires_consent=true`. A RPC registra:

- titular e finalidade;
- status `granted`, `refused`, `withdrawn`, `expired` ou `superseded`;
- versão da política;
- canal e evidência;
- hash do texto apresentado;
- categorias apresentadas;
- contexto redigido;
- consentimento anterior substituído.

Os registros são append-only. Revogação não altera a linha anterior: cria nova decisão e preserva a cadeia de evidência.

## Restrições

- não usar consentimento para tornar opcional um tratamento necessário ao contrato sem separar as finalidades;
- não agrupar marketing, pesquisa, personalização e crédito em uma única autorização;
- não presumir consentimento por uso da plataforma;
- não usar legítimo interesse sem avaliação documentada de finalidade, necessidade, balanceamento e transparência;
- não usar proteção do crédito como autorização genérica para qualquer perfilamento educacional;
- não ativar tratamento de dados sensíveis com uma base aplicável apenas a dados pessoais comuns.

## Pendências institucionais

- base de cada uma das sete atividades;
- textos e versões dos avisos;
- quando o consentimento é realmente opcional;
- canal de revogação e efeitos downstream;
- tratamento de registros históricos após revogação;
- avaliação de legítimo interesse, quando proposta;
- documentação específica para proteção do crédito.
