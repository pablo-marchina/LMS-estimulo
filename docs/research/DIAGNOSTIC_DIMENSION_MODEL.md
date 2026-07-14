# Modelo de dimensões do diagnóstico

**Versão:** 0.2  
**Data:** 2026-07-14  
**Status:** estrutura oficial identificada; definições operacionais e scoring ainda dependem da metodologia completa

## 1. Fonte e finalidade

A referência `arquetipos_estimulo.md` determina que o formulário comportamental opera com cinco dimensões e quatro arquétipos. Este documento descreve essa estrutura oficial sem criar pesos, cortes ou propriedades psicométricas que não foram entregues.

A versão anterior deste arquivo propunha oito dimensões exploratórias próprias. Elas não correspondem ao instrumento oficial e não podem substituir silenciosamente as cinco dimensões da Estímulo. Conceitos úteis daquela pesquisa poderão ser reaproveitados futuramente como features, prontidão ou hipóteses de intervenção, mas não como dimensões do formulário inicial sem aprovação formal.

## 2. Cinco dimensões oficiais

### D1 — Gestão financeira

**Escopo declarado pela referência:** capacidade de acompanhar o que sobra ou falta, compreender o uso do caixa, lidar com insuficiência financeira e perceber a própria relação com dinheiro.

**Perguntas associadas na referência:**

- Q1 — saber quanto sobrou ou faltou no negócio;
- Q2 — interpretar por que um mês bom terminou sem caixa;
- Q3 — forma de resolver insuficiência de dinheiro;
- Q12 — autopercepção da relação com dinheiro.

**Também participa:** Q2 e Q3 podem ter relação com D5; Q12 é declarada como D1 + D5.

**Cuidados:**

- não confundir baixa renda ou choque externo com incapacidade de gestão;
- não concluir risco de crédito diretamente da dimensão;
- manter separadas informação objetiva, autorrelato e inferência.

### D2 — Disciplina e hábito

**Escopo declarado pela referência:** existência de rotinas, priorização de compromissos e comportamento diante de pagamentos e urgências.

**Perguntas associadas na referência:**

- Q4 — atividade recorrente feita sem precisar lembrar;
- Q5 — prioridade entre parcela e fornecedor;
- Q11 — atraso de pagamento e motivo condicional.

**Cuidados:**

- atraso por falta de dinheiro, esquecimento, priorização e falha técnica são causas distintas;
- comportamento em um episódio não deve ser tratado como traço permanente;
- contexto de crise deve ser preservado no resultado.

### D3 — Visão e planejamento

**Escopo declarado pela referência:** clareza de objetivo futuro e lógica usada para decidir sobre investimento e crescimento.

**Perguntas associadas na referência:**

- Q6 — meta de faturamento em seis meses;
- Q7 — primeiro pensamento ao receber capital para investir.

**Também participa:** Q7 é declarada como D3 + D5.

**Cuidados:**

- não confundir prudência com ausência de visão;
- não assumir que crescimento é sempre a decisão correta;
- separar meta declarada de capacidade real de execução.

### D4 — Perfil empreendedor

**Escopo declarado pela referência:** grau de dependência do negócio em relação ao dono e predominância de execução, improviso, organização ou visão estratégica.

**Perguntas associadas na referência:**

- Q8 — funcionamento do negócio durante ausência do empreendedor;
- Q9 — atividade que melhor representa o dia a dia.

**Cuidados:**

- tamanho da equipe e estágio do negócio influenciam as respostas;
- trabalhar diretamente na operação não deve ser apresentado como falha moral;
- dependência operacional deve ser interpretada junto da maturidade do negócio.

### D5 — Relação com crédito e risco

**Escopo declarado pela referência:** finalidade do crédito, forma de lidar com insuficiência financeira, priorização de compromissos e percepção de estabilidade.

**Perguntas associadas na referência:**

- Q3 — solução usada quando faltou dinheiro;
- Q7 — intenção de uso de capital;
- Q10 — finalidade do último crédito;
- Q11 — atraso e motivo;
- Q12 — relação percebida com dinheiro.

**Cuidados:**

- a dimensão não é um score de crédito;
- finalidade declarada de crédito não comprova capacidade ou intenção de pagamento;
- nunca converter o rótulo da dimensão em aprovação, reprovação, taxa ou limite sem validação e governança próprias.

## 3. Matriz oficial de perguntas

| Pergunta | D1 | D2 | D3 | D4 | D5 |
|---|---:|---:|---:|---:|---:|
| Q1 | principal |  |  |  |  |
| Q2 | principal |  |  |  | possível conforme scoring |
| Q3 | principal |  |  |  | principal |
| Q4 |  | principal |  |  |  |
| Q5 |  | principal |  |  | possível conforme scoring |
| Q6 |  |  | principal |  |  |
| Q7 |  |  | principal |  | principal |
| Q8 |  |  |  | principal |  |
| Q9 |  |  |  | principal |  |
| Q10 |  |  |  |  | principal |
| Q11 |  | principal |  |  | principal |
| Q12 | principal |  |  |  | principal |

A tabela registra apenas relações declaradas ou diretamente indicadas pela referência resumida. O vínculo exato de cada alternativa e seu peso depende da planilha de iteração/scoring ainda não entregue.

## 4. Arquétipos e dimensões

Os quatro arquétipos oficiais são resultados compostos das cinco dimensões:

- **Fazedor:** alta centralidade da execução e lacunas de gestão;
- **Batalhador:** resiliência combinada a instabilidade de caixa e atuação sob pressão;
- **Construtor:** base organizada e necessidade de direção de crescimento;
- **Navegador:** planejamento, informação e uso produtivo de recursos em nível mais avançado.

Essas descrições orientam textos e ativações, mas não revelam por si só a fórmula matemática. A configuração não deve derivar pesos apenas dessas narrativas.

## 5. Maturidade operacional é eixo separado

A referência define quatro estágios objetivos:

- Pré-infância;
- Infância;
- Adolescência;
- Maturidade.

O estágio é determinado por dados objetivos autorizados, como formalização, tempo de negócio, porte e informações operacionais. Ele não pertence ao formulário comportamental.

A Q13 do protótipo Raio-X pergunta tempo de negócio. Ela deve ser tratada como informação contextual candidata para maturidade, não como confirmação de uma décima terceira pergunta do arquétipo.

O resultado de personalização pode usar a matriz:

```text
arquétipo comportamental
× maturidade operacional
× momento autorizado da jornada
→ conteúdo, suporte e ativação
```

## 6. Prontidão da Jornada OpenAI

Prontidão para ChatGPT/Codex também permanece separada do arquétipo:

- experiência anterior com IA;
- dispositivo e conectividade;
- capacidade de usar texto, voz e upload;
- tarefas prioritárias;
- reconhecimento de dados sensíveis;
- acesso às funcionalidades necessárias;
- preferência de formato e suporte.

Esses dados podem alterar a experiência da Jornada OpenAI sem reclassificar o arquétipo central.

## 7. O que não está definido

O pacote oficial ainda não fornece de forma reproduzível:

- definição matemática completa das dimensões;
- peso de cada alternativa;
- contribuição cruzada entre dimensões;
- normalização dos scores;
- regra de transformação de dimensões em arquétipo;
- cortes mínimos;
- regra de empate;
- tratamento de resposta ausente ou condicional;
- evidência da validação citada.

Nenhuma implementação deve completar essas lacunas por heurística silenciosa.

## 8. Gate de aceite

O modelo estará pronto para configuração publicada quando:

- a planilha/metodologia oficial for entregue;
- cada alternativa possuir contribuição versionada;
- os resultados do cálculo forem reproduzíveis;
- casos de borda e empate estiverem aprovados;
- a configuração for comparada com exemplos oficiais;
- linguagem, equidade e consequências forem revisadas;
- o uso permanecer restrito a personalização e pesquisa até autorização adicional.
