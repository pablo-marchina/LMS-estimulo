# Modelo de dimensões do diagnóstico

**Versão:** 0.3  
**Revisado em:** 2026-09-01  
**Status:** estrutura oficial identificada; metodologia completa de scoring ainda depende de fonte/aprovação externa

## Escopo

A referência de pesquisa identifica cinco dimensões e quatro arquétipos. Este documento não inventa pesos, cortes ou propriedades psicométricas ausentes.

### Dimensões identificadas

1. Gestão financeira;
2. Disciplina e hábito;
3. Visão e planejamento;
4. Perfil empreendedor;
5. Relação com crédito e risco.

As associações de perguntas e contribuições exatas devem seguir a configuração/metodologia aprovada; relações narrativas não autorizam derivar pesos.

## Nota sobre o runtime atual

A implementação de 31/08 corrigiu **como uma configuração já publicada é executada**:

- score por dimensão é a média dos scores das respostas aplicáveis;
- thresholds configurados para os perfis são interpretados como limites superiores inclusivos;
- faixas menores são avaliadas antes de faixas maiores.

Isso impede classificação enviesada pela ordem errada dos thresholds. **Não transforma esses thresholds em metodologia oficial** e não autoriza documentar valores numéricos que não existam como fonte aprovada/versionada.

## Arquétipos

Os nomes/textos operacionais podem ser configurados e evoluir. A classificação é temporal e destinada a personalização/pesquisa. Não é score de crédito, atributo cadastral permanente ou prova causal de maturidade.

## Maturidade e prontidão

Maturidade operacional e prontidão para a Jornada OpenAI são eixos separados. Podem contextualizar personalização quando houver dados/finalidade autorizados, sem reclassificar silenciosamente o arquétipo.

## O que ainda não deve ser inferido sem fonte oficial

- peso exato de cada alternativa;
- contribuição cruzada entre dimensões;
- normalização metodológica;
- cutoffs oficiais e regra de empate;
- tratamento metodológico de respostas ausentes/condicionais;
- evidência de validação/qualidade do instrumento.

## Gate metodológico

Antes de tratar o cálculo como metodologia oficialmente validada, é necessário possuir fonte versionada/aprovada para alternativas, pesos, cortes, casos de borda e exemplos de referência. O software deve continuar capaz de executar a configuração sem completar lacunas por heurística silenciosa.