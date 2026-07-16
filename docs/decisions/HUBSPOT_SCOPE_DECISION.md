# DEC-070 — Escopo de dados do HubSpot

**Data:** 2026-07-16  
**Status:** aprovada  
**Autoridade:** decisão explícita posterior do responsável pelo projeto

## Decisão

A integração do LMS com o HubSpot deve armazenar somente:

1. identificadores mínimos necessários para vincular o dado ao usuário correto;
2. informações de engajamento do usuário na plataforma;
3. informações que possam ajudar em cálculos, classificações, personalização, análise ou pesquisa aprovados.

## Consequências

- o HubSpot não é banco operacional nem repositório integral do LMS;
- o PostgreSQL preserva estado transacional, eventos detalhados, conteúdo, auditoria e histórico completo;
- a matriz HubSpot define quais campos/eventos são sincronizados, sua finalidade, granularidade, frequência, retenção e reconciliação;
- configurações editoriais, conteúdo bruto, arquivos binários, segredos e telemetria técnica permanecem fora do CRM;
- respostas abertas e comentários integrais somente são sincronizados com finalidade específica e aprovação de privacidade;
- variáveis úteis para cálculo exigem origem, versão, definição, qualidade e governança;
- nenhum sinal educacional ou comportamental pode influenciar decisão de crédito sem validação metodológica, análise de vieses, revisão humana e aprovação institucional.

## Classificação canônica

```text
linking_identifier
engagement_signal
calculation_input_or_result
not_synced
```

## Decisões superadas

Esta decisão substitui a interpretação ampla da DEC-066 segundo a qual todos os dados capturados ou usados deveriam possuir representação no HubSpot.

Preserva:

- DEC-006: separação entre eventos, features e score;
- DEC-007: HubSpot não é o event store detalhado;
- DEC-054: HubSpot participa da visão integrada e da operação de relacionamento;
- DEC-058: ações relevantes continuam gerando eventos estruturados;
- DEC-064: arquétipos e sinais não são regras produtivas de crédito sem governança.

## Revisão

Revisar após inventário real do HubSpot, definição dos cálculos e validação de volume, privacidade e utilidade operacional.
