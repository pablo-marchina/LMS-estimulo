# Estratégia de personalização do MVP sem entrevistas obrigatórias

**Versão:** 0.2  
**Data:** 2026-07-08  
**Status:** Decisão operacional para o MVP

## 1. Decisão

O MVP não dependerá da definição final dos quatro arquétipos.

A personalização inicial utilizará três fontes separadas:

1. **condições operacionais e de acesso**, observáveis e diretamente acionáveis;
2. **dimensões contínuas provisórias**, calculadas de forma transparente e usadas apenas para personalização de baixo risco e pesquisa;
3. **comportamento real observado durante a jornada**, que poderá atualizar recomendações sem redefinir a identidade do participante.

Os quatro arquétipos permanecem como hipótese posterior. Eles somente serão definidos se dados suficientes demonstrarem que quatro perfis distintos são mais úteis do que dimensões contínuas e regras comportamentais simples.

## 2. Motivo

O contexto do projeto exige:

- personalização desde o início;
- coleta de sinais comportamentais estruturados;
- arquitetura extensível;
- prudência para não transformar hipóteses em decisões de crédito;
- possibilidade de operar mesmo quando entrevistas não forem viáveis.

Forçar quatro perfis antes de evidência produziria rótulos frágeis, contaminaria o modelo de dados e poderia levar a intervenções inadequadas. Adiar toda personalização também seria incompatível com a proposta do produto.

A estratégia adotada permite entregar valor e, simultaneamente, produzir os dados necessários para uma validação futura.

## 3. Camadas da personalização

### 3.1 Camada A — Roteamento operacional

Utiliza respostas factuais ou condições observáveis, como:

- dispositivo disponível;
- qualidade de conectividade;
- capacidade de acessar a ferramenta necessária;
- experiência anterior com IA;
- objetivo declarado;
- tempo disponível;
- necessidade de suporte;
- compreensão de privacidade e dados sensíveis;
- preferência de canal e formato.

Essa camada pode definir imediatamente:

- preparação digital;
- conteúdo introdutório;
- formato alternativo;
- intensidade inicial de suporte;
- ordem das atividades;
- necessidade de revisão humana.

### 3.2 Camada B — Dimensões contínuas provisórias

O diagnóstico poderá gerar indicadores de 0 a 100 para dimensões como:

- planejamento orientado à ação;
- rotina de informação e controle;
- execução e autorregulação;
- persistência e recuperação;
- aprendizagem aplicada;
- busca e uso de apoio;
- experimentação digital;
- verificação e calibração da confiança.

Esses resultados:

- não são score de crédito;
- não são traços permanentes;
- não serão exibidos como julgamento de caráter;
- possuem versão, data e contexto;
- podem permanecer `insufficient_evidence` quando a resposta for incompleta;
- serão usados somente em intervenções reversíveis e de baixo risco.

### 3.3 Camada C — Comportamento observado

A jornada produzirá sinais como:

- tempo até primeira ação;
- frequência de retorno;
- conclusão válida;
- abandono e retomada;
- tentativas;
- pedido de ajuda;
- resposta a feedback;
- submissão e validação de prática;
- aplicação autorrelatada;
- aplicação acompanhada;
- resposta a intervenções.

O comportamento observado poderá ajustar:

- próximo passo recomendado;
- necessidade de revisão;
- granularidade das atividades;
- intensidade de suporte;
- frequência de nudges;
- oferta de alternativa.

Ele não deverá sobrescrever silenciosamente o diagnóstico nem ser interpretado como personalidade.

## 4. Segmentos operacionais

O MVP usará tags não exclusivas e temporárias, em vez de arquétipos fixos.

### Segmentos iniciais candidatos

| Código | Condição | Uso |
|---|---|---|
| `digital_preparation_needed` | barreira técnica ou baixa prontidão específica | oferecer preparação e suporte técnico |
| `guided_start_recommended` | necessidade declarada ou sinais de dificuldade inicial | decompor o início e oferecer orientação |
| `self_directed_start` | acesso, objetivo e confiança mínima suficientes | liberar início autônomo |
| `practice_support_needed` | dificuldade em transferir conteúdo para tarefa real | oferecer exemplo, template ou revisão |
| `assessment_recovery_needed` | tentativas repetidas ou erro persistente | revisão antes de nova tentativa |
| `reengagement_needed` | inatividade após início real | facilitar retomada no ponto exato |
| `completed_not_applied` | conteúdo concluído sem prática ou aplicação | intervenção de aplicação |
| `human_support_requested` | pedido explícito ou bloqueio não resolvido | criar tarefa humana |
| `uncertain_personalization` | informação insuficiente ou sinais conflitantes | usar experiência padrão e coletar mais evidência |

Esses segmentos:

- podem coexistir;
- possuem validade temporal;
- devem registrar regra e versão;
- não serão chamados de arquétipos;
- não serão usados para condição de crédito.

## 5. Política de decisão

A personalização deverá seguir a ordem:

```text
necessidade factual e restrição de acesso
→ objetivo declarado
→ progresso e comportamento observado
→ dimensão provisória
→ experiência padrão quando houver incerteza
```

Uma dimensão autorrelatada nunca deverá prevalecer sobre uma restrição operacional concreta.

Exemplo:

```text
Alta experimentação digital declarada
+ ausência de acesso à ferramenta
→ preparação de acesso continua necessária
```

## 6. Regras de segurança

- nenhuma regra de personalização poderá excluir conteúdo essencial;
- toda recomendação deverá possuir alternativa padrão;
- baixa pontuação não poderá gerar linguagem negativa;
- personalização deverá ser explicável;
- o participante poderá solicitar ajuda ou ignorar recomendações não obrigatórias;
- regras deverão ser versionadas e auditáveis;
- o sistema deverá registrar a causa da recomendação;
- demografia não será entrada de roteamento comportamental;
- resultados do crédito não serão usados no MVP para recalibrar perfis sem governança específica.

## 7. Relação com os quatro arquétipos

A descoberta futura seguirá este fluxo:

```text
dimensões provisórias
+ segmentos operacionais
+ eventos reais da jornada
+ resultados de aprendizagem e aplicação
→ análise de padrões
→ comparação entre modelos de 1 a 6 perfis
→ teste de utilidade
→ eventual definição de quatro arquétipos
```

Quatro arquétipos somente serão aprovados se:

- forem reproduzíveis;
- alterarem intervenções de forma útil;
- superarem regras simples;
- não dependerem de variáveis sensíveis;
- possuírem tratamento de incerteza;
- forem compreensíveis e não estigmatizantes.

## 8. Consequência arquitetural

O sistema deverá armazenar separadamente:

- respostas brutas;
- resultados dimensionais;
- segmentos operacionais;
- regras aplicadas;
- recomendações geradas;
- comportamento observado;
- atribuições futuras de arquétipo.

O schema não poderá conter enum fixo de quatro arquétipos nem exigir classificação para permitir participação.

## 9. Critério de conclusão do E07 para o MVP

O E07 pode ser considerado concluído para arquitetura e implementação quando existirem:

- finalidade e guardrails;
- dimensões provisórias;
- perguntas operacionais;
- banco exploratório de itens;
- regras de roteamento inicial;
- segmentos operacionais;
- plano de coleta do piloto;
- plano de descoberta futura dos arquétipos;
- política de incerteza e equidade.

A validação empírica dos quatro arquétipos passa a ser uma etapa posterior, não um bloqueio do MVP.
