# Plano de descoberta e validação dos arquétipos

**Versão:** 0.1  
**Status:** Metodologia proposta; execução depende da coleta de dados

## 1. Princípio central

Os quatro arquétipos não serão escritos primeiro e justificados depois. A pesquisa deverá avaliar se quatro perfis comportamentais distintos existem, se são suficientemente estáveis e se produzem personalizações úteis.

O resultado possível inclui:

- menos de quatro perfis;
- quatro perfis;
- mais de quatro perfis;
- dimensões contínuas mais úteis que perfis;
- ausência de evidência para classificação.

## 2. Etapas

### Etapa A — Descoberta qualitativa

1. realizar entrevistas semiestruturadas;
2. extrair episódios e comportamentos;
3. construir matriz pessoa × comportamento × contexto;
4. identificar padrões e contradições;
5. revisar dimensões candidatas;
6. propor hipóteses de perfis apenas depois da análise.

**Saída:** perfis qualitativos provisórios e item pool revisado.

### Etapa B — Entrevistas cognitivas

1. aplicar itens a 5–8 participantes;
2. verificar interpretação, memória utilizada e escolha da resposta;
3. reduzir ambiguidade e dupla pergunta;
4. revisar opções e período de referência;
5. estimar duração e abandono.

**Saída:** instrumento piloto.

### Etapa C — Piloto quantitativo

Coletar respostas em amostra suficientemente ampla e diversa. O tamanho deverá ser definido por análise das condições do instrumento e, quando possível, simulação de poder.

Referência operacional inicial:

- sob condições moderadamente favoráveis, cerca de 200 respostas pode sustentar análise fatorial exploratória;
- condições piores, muitos itens ou classes pouco separadas podem exigir 400 ou mais;
- a primeira amostra pequena do MVP não autoriza declarar validação estatística.

### Etapa D — Estrutura das dimensões

Para itens ordinais:

- analisar faltantes e “não se aplica”;
- avaliar distribuições e variabilidade;
- usar correlações adequadas a itens ordinais;
- executar análise fatorial exploratória, não PCA, durante desenvolvimento;
- escolher número de fatores com análise paralela, teoria e interpretabilidade;
- avaliar cargas, cross-loadings e coerência;
- testar estrutura em amostra independente por CFA, quando houver volume.

Confiabilidade interna não será tratada como prova de validade.

### Etapa E — Descoberta de perfis

Usar scores dimensionais ou estimativas fatoriais, não respostas brutas sem preparação.

Modelos candidatos:

- clusterização exploratória para inspeção;
- latent profile analysis para classificação probabilística;
- soluções de 1 a 6 perfis, sem fixar quatro antecipadamente.

Avaliar conjuntamente:

- BIC e critérios relacionados;
- testes de comparação quando apropriados;
- separação e probabilidades posteriores;
- tamanho mínimo dos grupos;
- estabilidade por bootstrap ou reamostragem;
- interpretabilidade;
- coerência com evidência qualitativa;
- utilidade para personalização;
- replicação em amostra ou período posterior.

Entropia não será usada sozinha para escolher o número de perfis, pois uma solução superajustada também pode apresentar alta separação aparente.

### Etapa F — Validação externa

Verificar se perfis ou dimensões se relacionam, sem circularidade, com:

- preferência e uso de suporte;
- resposta a formatos diferentes;
- retomada após interrupção;
- conclusão válida;
- submissão prática;
- aplicação do aprendizado;
- resposta a intervenções;
- estabilidade ao longo do tempo.

Resultados de crédito só poderão entrar em etapa posterior, com governança, finalidade e desenho adequado.

### Etapa G — Teste de utilidade

Um perfil só deve ser mantido se uma intervenção baseada nele superar uma alternativa simples, por exemplo:

- personalização por objetivo declarado;
- personalização por prontidão;
- mesma jornada para todos;
- regras por comportamento observado.

## 3. Critérios de qualidade de um arquétipo

Cada arquétipo deverá possuir:

- definição não estigmatizante;
- padrão distinto de dimensões;
- evidências qualitativas e quantitativas;
- necessidade ou resposta de suporte diferente;
- ações recomendadas e ações proibidas;
- sinais de incerteza;
- limitações e população de validade;
- versão;
- nome revisado com usuários;
- política de atualização.

## 4. Regra de atribuição

A futura atribuição deverá registrar:

```text
archetype_model_version
archetype_id
posterior_probability
second_best_archetype_id
second_best_probability
classification_confidence
classified_at
valid_until
input_instrument_version
```

Regra inicial candidata, a validar:

- atribuição automática apenas quando confiança superar limite aprovado;
- resultado abaixo do limite permanece `uncertain`;
- a experiência deve continuar funcionando sem classificação;
- perfil anterior não é sobrescrito.

## 5. Equidade

Analisar:

- distribuição de perfis por gênero, região e contexto;
- diferença de compreensão dos itens;
- diferencial de funcionamento de itens, quando houver amostra;
- taxas de classificação incerta;
- diferenças na oferta e resultado de intervenções;
- exclusão causada por conectividade ou alfabetização digital.

Demografia não será usada para “corrigir” manualmente a pessoa para um perfil esperado.

## 6. Escopo de validade

A primeira versão deverá ser apresentada como válida apenas para:

- a população amostrada;
- o objetivo de personalização testado;
- a versão do diagnóstico;
- o período e canal em que foi avaliada.

Não generalizar automaticamente de candidatos quase aprovados para mulheres empreendedoras, inadimplentes ou toda a base Estímulo.

## 7. Critério de decisão sobre quatro arquétipos

A solução de quatro perfis será aprovada somente se:

1. não for claramente inferior a soluções alternativas;
2. possuir classes com tamanho e separação adequados;
3. replicar-se razoavelmente;
4. corresponder a padrões compreensíveis;
5. produzir intervenções distintas;
6. não causar consequências injustificadas;
7. for mais útil que usar apenas dimensões contínuas.

## 8. Estado atual

Nenhum arquétipo foi definido. O projeto possui agora método para descobri-los e critérios para rejeitar uma solução inadequada.
