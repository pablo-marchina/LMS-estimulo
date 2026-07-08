# Finalidade e guardrails do diagnóstico

**Versão:** 0.1  
**Data:** 2026-07-08  
**Status:** Proposta para pesquisa e validação; não autorizada para decisão de crédito

## 1. Objetivo

Definir o que o diagnóstico da Plataforma Estímulo pode medir, para quais decisões de produto ele pode ser usado e quais interpretações permanecem proibidas até que existam evidências suficientes.

O diagnóstico inicial não será um teste de personalidade, um score de crédito, uma avaliação clínica ou uma classificação permanente da pessoa. Ele será um instrumento versionado de personalização e pesquisa.

## 2. Usos autorizados na fase inicial

O diagnóstico poderá apoiar:

1. escolha da trilha ou ordem inicial de atividades;
2. intensidade e formato de suporte;
3. recomendação de conteúdos de preparação;
4. frequência e tipo de intervenção;
5. identificação de barreiras de acesso ou aprendizagem;
6. mensuração de mudanças ao longo da jornada;
7. análise experimental da utilidade das dimensões e perfis;
8. geração de hipóteses para futuras features comportamentais.

## 3. Usos proibidos na fase inicial

O diagnóstico não poderá, isoladamente ou em combinação com eventos do piloto:

- aprovar ou reprovar crédito;
- alterar taxa, limite, garantia ou condição financeira;
- representar risco de inadimplência como fato;
- inferir caráter, honestidade, capacidade moral ou intenção de pagamento;
- excluir participantes da capacitação;
- produzir tratamento prejudicial sem revisão e governança;
- ser apresentado como instrumento estatisticamente validado antes da validação;
- ser utilizado para afirmar causalidade entre perfil, capacitação e resultado de crédito.

## 4. Arquitetura conceitual do diagnóstico

O instrumento deverá manter três componentes separados.

### 4.1 Perfil comportamental central

Dimensões relativamente persistentes, mas atualizáveis, relacionadas à forma como o empreendedor planeja, executa, aprende, busca apoio, verifica informações e reage a dificuldades.

Este componente é o único candidato a sustentar arquétipos no futuro.

### 4.2 Snapshot contextual

Condições que podem mudar rapidamente e não definem o arquétipo:

- maturidade do negócio;
- momento de crédito;
- urgência financeira;
- disponibilidade de tempo;
- estrutura da equipe;
- acesso digital;
- limitações operacionais;
- eventos externos recentes.

### 4.3 Prontidão específica da jornada

Conhecimento, acesso e objetivos ligados à jornada atual. Para a Jornada OpenAI:

- experiência anterior com IA;
- dispositivo e conectividade;
- tarefas que deseja realizar;
- familiaridade com upload, texto, áudio e arquivos;
- capacidade de reconhecer dados sensíveis;
- acesso às ferramentas exigidas;
- confiança para revisar resultados produzidos por IA.

Prontidão de IA não é um traço permanente e não deve definir um arquétipo geral.

## 5. Unidade de interpretação

Os resultados deverão ser interpretados como evidências sobre respostas dadas em uma versão e contexto específicos.

Não se deverá declarar:

> “O empreendedor é desorganizado.”

Formulação permitida:

> “Nesta aplicação do instrumento, as respostas indicaram baixa frequência declarada de rotinas de planejamento e acompanhamento.”

## 6. Requisitos de validade

A validade não será tratada como propriedade permanente do formulário. Ela deverá ser sustentada para cada uso, público e contexto por evidências de:

- conteúdo: itens representam adequadamente a dimensão;
- processo de resposta: participantes compreendem as perguntas como pretendido;
- estrutura interna: itens se agrupam de forma compatível com as dimensões;
- relação com outras variáveis: resultados se relacionam com comportamentos de forma coerente;
- consequências: o uso não gera danos ou exclusões indevidas;
- utilidade: o resultado efetivamente melhora a personalização.

## 7. Guardrails de classificação

- quatro arquétipos são uma hipótese de negócio, não uma quantidade a ser forçada nos dados;
- deve existir estado `unclassified` ou `uncertain`;
- a classificação deverá armazenar probabilidades ou confiança, não apenas um rótulo;
- baixa confiança não será convertida em perfil definitivo;
- cada atribuição registrará versão do instrumento e do modelo;
- novas avaliações não apagarão atribuições anteriores;
- o resultado deverá ser explicado em linguagem não estigmatizante;
- arquétipos deverão gerar ações diferentes e testáveis;
- características demográficas não serão usadas como entradas do arquétipo na primeira versão;
- características demográficas poderão ser utilizadas, com finalidade e acesso controlados, para verificar equidade e diferenças de funcionamento dos itens.

## 8. Relação com a Teoria da Mudança

O diagnóstico deverá apoiar personalização e aplicação de conhecimentos, mas não substituir a mensuração de resultados. A plataforma deverá manter separadas:

```text
resposta diagnóstica
→ recomendação ou intervenção
→ participação
→ compreensão
→ aplicação prática
→ resultado posterior
```

## 9. Política de atualização

O diagnóstico deverá ser reaplicável em situações definidas, como:

- início de uma nova jornada;
- mudança relevante de contexto;
- intervalo temporal pré-definido;
- solicitação do participante;
- baixa confiança da classificação;
- avaliação de mudança após intervenção.

A reaplicação não deve ocorrer em frequência capaz de induzir respostas artificiais ou fadiga.

## 10. Critério de saída para produção

Um arquétipo só poderá orientar personalização automática quando:

- sua definição estiver documentada;
- possuir itens e regras versionados;
- tiver passado por entrevistas cognitivas;
- produzir classificação reproduzível;
- demonstrar acionabilidade;
- possuir análise mínima de estabilidade e equidade;
- permitir resultado incerto;
- estiver aprovado para o uso específico.

## Referências metodológicas

- Knekta, Runyon e Eddy (2019), *One Size Doesn't Fit All*: validade depende do uso e contexto; análise fatorial é apenas uma das evidências necessárias.
- Boateng et al. (2018), *Best Practices for Developing and Validating Scales*.
- Sinha, Calfee e Delucchi (2021), *Practitioner's Guide to Latent Class Analysis*.
- Tein, Coxe e Cham (2013), estudo de poder para identificação do número correto de classes.
