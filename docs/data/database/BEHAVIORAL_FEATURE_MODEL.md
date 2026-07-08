# Modelo de features comportamentais

**Versão:** 0.1  
**Status:** estrutura pronta; features concretas ainda não validadas para crédito.

## 1. Objetivo

Permitir calcular características reproduzíveis a partir de eventos e dados autorizados sem misturar fatos, interpretações e score.

## 2. Estrutura

```text
feature_definition
→ feature_version
→ dependencies
→ computation_run
→ feature_value
```

## 3. Campos obrigatórios por versão

- finalidade;
- usos permitidos e proibidos;
- tipo de valor;
- fórmula ou código referenciado;
- eventos/features de origem;
- janela temporal;
- população elegível;
- política de ausência;
- qualidade mínima;
- tratamento de eventos atrasados;
- versão e hash;
- critérios de descontinuação.

## 4. Features candidatas de pesquisa

| Feature | Fonte provável | Cuidado |
|---|---|---|
| tempo até primeira ação | convite/inscrição/início | depende de canal e disponibilidade |
| regularidade | sessões em dias distintos | não confundir frequência com aprendizagem |
| taxa de conclusão elegível | passos obrigatórios | controlar exposição e versão |
| retomada após inatividade | eventos de sessão/intervenção | separar retomada espontânea e induzida |
| persistência após erro | tentativas e resultado | controlar dificuldade da avaliação |
| melhoria entre tentativas | resultados versionados | evitar leakage do gabarito |
| cumprimento de prazo | disponibilidade e conclusão | controlar prazo real oferecido |
| prática submetida | submissão | envio não significa qualidade |
| prática validada | revisão/rubrica | depende de capacidade de revisão |
| resposta a intervenção | entrega/ação atribuível | atribuição causal limitada |
| profundidade de revisita | consumo de conteúdo | revisita pode indicar dificuldade |
| pedido de ajuda | suporte explícito | não tratar ajuda como risco negativo |

## 5. Qualidade

`feature_values.quality_status` deverá distinguir:

- sufficient;
- insufficient_evidence;
- stale;
- partial;
- invalid_source;
- calculation_failed.

Valores ausentes não serão convertidos automaticamente em zero.

## 6. Linhagem

Cada valor guarda:

- versão da feature;
- run;
- sujeito/contexto;
- janela;
- watermark;
- quantidade de evidências;
- hash da linhagem.

A linhagem detalhada também poderá ser materializada em `governance.data_lineage_edges`.

## 7. Reprocessamento

Correções de evento ou fórmula criam nova versão/run e novos valores. Valores históricos não são sobrescritos.
