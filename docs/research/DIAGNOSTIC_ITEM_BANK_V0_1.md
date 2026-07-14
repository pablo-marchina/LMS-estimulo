# Banco de itens do diagnóstico oficial

**Versão documental:** 0.2  
**Instrumento de referência:** versão 3  
**Data:** 2026-07-14  
**Status:** estrutura oficial reconciliada; texto exato, alternativas e scoring ainda bloqueiam publicação

## 1. Autoridade

A fonte primária deste documento é `arquetipos_estimulo.md`, que declara um formulário de 12 perguntas distribuídas em 5 dimensões.

O protótipo Raio-X contém textos, alternativas e scoring úteis como evidência secundária, mas não possui autoridade para alterar o instrumento oficial. Em especial:

- adiciona uma Q13 sobre tempo de negócio;
- possui diferenças de enunciado em relação ao resumo oficial;
- contém pesos, cortes e desempate hardcoded sem a planilha metodológica citada;
- sempre força um resultado.

Por isso, nenhum dado do protótipo será publicado automaticamente como configuração oficial.

## 2. Inventário canônico das 12 perguntas

| ID | Pergunta resumida da referência | Tipo declarado | Dimensão principal | Estado |
|---|---|---|---|---|
| Q1 | No fim do mês, consegue dizer quanto sobrou no negócio? | Escala 1–4 | D1 Gestão financeira | Estrutura confirmada; texto/opções a homologar |
| Q2 | Recebeu R$ 2 mil de cliente e a conta de luz da casa vence hoje: o que faz? | Múltipla escolha | D1 Gestão financeira | Conflita com o enunciado do protótipo |
| Q3 | Teve mês com dinheiro insuficiente nos últimos 6 meses? Como resolveu? | Múltipla escolha | D1 + D5 | Estrutura confirmada; opções a homologar |
| Q4 | Há algo que faz toda semana no negócio sem precisar lembrar? | Escala 1–4 | D2 Disciplina e hábito | Estrutura confirmada; texto/opções a homologar |
| Q5 | Parcela vence amanhã e fornecedor tem problema hoje: o que faz primeiro? | Múltipla escolha | D2 Disciplina e hábito | Cenário do protótipo é semelhante, mas não idêntico |
| Q6 | Consegue dizer quanto quer faturar daqui a 6 meses? | Escala 1–4 | D3 Visão e planejamento | Estrutura confirmada; texto/opções a homologar |
| Q7 | Se recebesse R$ 10 mil para investir, qual seria o primeiro pensamento? | Múltipla escolha | D3 + D5 | Estrutura confirmada; opções a homologar |
| Q8 | Precisou se ausentar por dois dias: o que aconteceu no negócio? | Múltipla escolha | D4 Perfil empreendedor | Estrutura confirmada; opções a homologar |
| Q9 | O que mais representa o dia a dia no negócio? | Múltipla escolha | D4 Perfil empreendedor | Estrutura confirmada; opções a homologar |
| Q10 | Na última vez que pegou crédito, para que usou? | Múltipla escolha | D5 Crédito e risco | Estrutura confirmada; opções a homologar |
| Q11 | Deixou de pagar parcela no prazo nos últimos 12 meses? | Sim/Não + condicional | D2 + D5 | Estrutura confirmada; causas condicionais a homologar |
| Q12 | Como descreveria sua relação com dinheiro, no geral? | Escala visual 1–5 | D1 + D5 | Estrutura confirmada; texto/opções a homologar |

## 3. Divergências entre referência e protótipo

### 3.1 Quantidade de perguntas

- documento oficial: 12 perguntas;
- protótipo Raio-X: 13 perguntas;
- Q13 do protótipo: “Há quanto tempo você toca esse negócio?”.

Decisão documental: a Q13 não integra o arquétipo oficial. Ela pode ser reaproveitada futuramente como campo contextual para maturidade operacional, após aprovação.

### 3.2 Q2

O resumo oficial usa um cenário de recebimento de R$ 2 mil e conflito com uma conta pessoal. O protótipo pergunta por que um mês bom terminou quase sem caixa. São itens diferentes e podem medir comportamentos diferentes.

Nenhum dos dois enunciados será tratado como texto final até a Estímulo identificar a versão aprovada.

### 3.3 Q5

O resumo oficial menciona parcela que vence e problema com fornecedor. O protótipo acrescenta valor disponível, antecipação ao fornecedor e opção de renegociação. A expansão do cenário precisa de homologação.

### 3.4 Q12

A referência resume uma relação geral com dinheiro. O protótipo delimita o último mês e combina vida pessoal e negócio. O período e a unidade de análise precisam ser aprovados.

### 3.5 Texto introdutório e randomização

A referência determina:

- linguagem situacional;
- ausência de resposta socialmente óbvia;
- randomização de alternativas no Typeform;
- explicação de que não existe resposta certa;
- escala sem ponto neutro para Q1 e Q4.

A Q12 usa escala visual 1–5 segundo a mesma referência e, portanto, é uma exceção explícita ao padrão sem ponto neutro.

## 4. Informações obrigatórias por item

A configuração publicada deverá registrar para cada pergunta:

- ID estável;
- versão;
- enunciado exato;
- instrução e período de referência;
- tipo de resposta;
- alternativas e chaves estáveis;
- ordem fixa ou randomizada;
- condição de exibição;
- obrigatoriedade;
- dimensão ou dimensões associadas;
- contribuição de cada alternativa;
- finalidade;
- justificativa metodológica;
- texto de acessibilidade;
- histórico de alteração.

## 5. Scoring ausente

A referência afirma que existe uma planilha de iteração com justificativas metodológicas e log de revisão, mas ela não foi incluída no pacote.

Ainda faltam:

- pesos de cada alternativa por dimensão;
- pesos diretos por arquétipo, se existirem;
- normalização dos scores;
- cortes mínimos;
- prioridade entre arquétipos;
- regra de empate;
- tratamento de respostas condicionais;
- tratamento de item ausente;
- exemplos oficiais de entrada e resultado;
- versão e autoria da metodologia.

O `scoring_config.json` do protótipo não substitui esses artefatos.

## 6. Estado da classificação

A premissa oficial exige que o formulário defina um dos quatro arquétipos. Porém, sem regra oficial de empate, a política de produção permanece bloqueada.

O motor pode suportar:

- prioridade determinística;
- empate explícito;
- resultado inconclusivo;
- abstenção;
- confidence nula ou calculada.

A escolha entre essas opções é decisão de produto/metodologia, não decisão técnica. Nenhuma será ativada silenciosamente.

## 7. Testes necessários antes da publicação

- validação de schema de todas as perguntas;
- teste de obrigatoriedade e condicionais;
- teste de randomização sem alterar scoring;
- equivalência entre planilha aprovada e engine;
- casos oficiais de cada arquétipo;
- casos de empate e limite;
- replay determinístico;
- teste de recálculo entre versões;
- revisão cognitiva dos enunciados;
- revisão de linguagem não estigmatizante;
- revisão de privacidade e consequências.

## 8. Gate atual

```text
official_question_count = 12
official_dimension_count = 5
official_archetype_count = 4
prototype_question_count = 13
prototype_is_authoritative = false
exact_wording_approved = false
exact_options_approved = false
scoring_method_received = false
tie_rule_approved = false
publishable = false
```

O item pool exploratório anterior permanece recuperável no histórico Git, mas não representa mais o instrumento oficial da operação inicial.
