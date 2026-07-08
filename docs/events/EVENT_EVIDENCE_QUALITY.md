# Qualidade e força da evidência comportamental

**Versão:** 0.1

## 1. Objetivo

Impedir que eventos com naturezas diferentes sejam tratados como sinais equivalentes. A arquitetura registra a origem da evidência, mas não atribui uma pontuação universal de “confiança”. Cada feature futura deverá declarar quais evidências aceita.

## 2. Tipos de evidência

| Tipo | Exemplo | Uso recomendado |
|---|---|---|
| `server_transactional` | atividade concluída após validar regra | Fato operacional forte |
| `reviewer_validated` | prática aceita por rubrica | Evidência forte dentro do escopo da rubrica |
| `external_confirmed` | mensagem entregue ou estágio recebido da fonte oficial | Depende da qualidade do sistema externo |
| `server_acknowledged` | progresso ou abertura recebida e aceita pelo backend | Observação útil, não prova de aprendizagem |
| `external_observed` | abertura reportada por provedor | Fraca e sujeita a limitações do canal |
| `client_observed` | posição de vídeo informada pelo navegador | Deve ser consolidada e não usada isoladamente |
| `self_reported` | aplicação declarada pelo empreendedor | Deve permanecer identificada como autorrelato |

## 3. Elegibilidade para features

O catálogo usa quatro estados:

- `eligible`: pode alimentar uma feature, desde que fórmula e janela estejam documentadas;
- `conditional`: requer validações ou combinação com outros eventos;
- `weak_only`: pode ajudar em diagnóstico operacional, mas não sustenta conclusão isolada;
- `derived_only` ou `ineligible`: não usar como input direto; consultar eventos de origem.

Nenhum desses estados autoriza uso em score de crédito.

## 4. Exemplos

- `activity.completed` pode contribuir para taxa de conclusão;
- `activity.progressed` requer deduplicação, consolidação e controle de tempo ativo;
- `certificate.issued` não deve alimentar persistência, pois é resultado de outros eventos;
- `points.awarded` não deve alimentar engajamento, pois depende da regra de gamificação;
- `practice.application.self_reported` deve ser separado de `practice.application.verified`;
- resposta a uma intervenção não pode ser simultaneamente input da segmentação e outcome do mesmo teste sem controle de circularidade.

## 5. Requisitos para uma feature futura

Cada feature deverá documentar:

- eventos aceitos e rejeitados;
- tipo de evidência permitido;
- janela temporal;
- deduplicação;
- eventos atrasados;
- dados ausentes;
- oportunidade de exposição;
- influência de gamificação/intervenção;
- validade e limitações.
