# Finalidade e guardrails do diagnóstico

**Versão:** 0.2  
**Data:** 2026-07-14  
**Status:** requisito oficial para personalização inicial; instrumento ainda bloqueado para publicação até receber scoring e regras completas; não autorizado para decisão de crédito

## 1. Autoridade e objetivo

Este documento interpreta as referências oficiais sem substituí-las. Em caso de conflito, prevalecem:

1. `premissas-desenvolvimento.md`;
2. `trabalho.md`;
3. `arquetipos_estimulo.md`;
4. alterações posteriores explicitamente aprovadas pela Estímulo;
5. protótipos, código e documentos técnicos somente como evidência secundária.

A operação inicial deve aplicar um formulário versionado que atribua um dos quatro arquétipos oficiais:

- Fazedor;
- Batalhador;
- Construtor;
- Navegador.

O diagnóstico serve inicialmente para personalização, relacionamento, ativação de conteúdo e pesquisa. Ele não é um teste clínico, uma classificação permanente da pessoa nem um score de crédito produtivo.

## 2. Instrumento oficial identificado

A referência `arquetipos_estimulo.md` descreve a versão 3 do formulário com:

- 12 perguntas;
- 5 dimensões;
- perguntas situacionais;
- quatro arquétipos de saída;
- maturidade operacional calculada fora do formulário comportamental.

As cinco dimensões oficiais são:

1. D1 — Gestão financeira;
2. D2 — Disciplina e hábito;
3. D3 — Visão e planejamento;
4. D4 — Perfil empreendedor;
5. D5 — Relação com crédito e risco.

O protótipo Raio-X contém uma Q13 sobre tempo de negócio. Essa pergunta é evidência secundária de implementação e deve ser tratada como contexto/maturidade, não como parte confirmada das 12 perguntas do arquétipo, até aprovação formal.

## 3. Usos autorizados na fase inicial

O diagnóstico poderá apoiar:

1. apresentação do resultado oficial em linguagem não estigmatizante;
2. escolha ou priorização de trilhas e conteúdos;
3. intensidade e formato de suporte;
4. criação de plano de ação por perfil;
5. frequência e tipo de intervenção;
6. combinação do arquétipo com maturidade e momento autorizado da jornada de crédito;
7. mensuração da utilidade da personalização;
8. pesquisa sobre estabilidade, compreensão e acionabilidade do instrumento.

## 4. Usos proibidos na fase inicial

O diagnóstico não poderá, isoladamente ou em combinação com eventos do piloto:

- aprovar ou reprovar crédito;
- alterar taxa, limite, garantia ou condição financeira;
- representar risco de inadimplência como fato validado;
- inferir caráter, honestidade, capacidade moral ou intenção de pagamento;
- excluir participantes da capacitação;
- produzir tratamento prejudicial sem revisão e governança;
- ser apresentado como instrumento estatisticamente validado antes da validação;
- ser usado para afirmar causalidade entre perfil, capacitação e resultado de crédito;
- transformar as descrições de risco do documento de arquétipos em regra produtiva de concessão.

As menções a risco de crédito existentes na referência são hipóteses de produto e pesquisa. Qualquer uso em crédito exige validação, governança, explicação, revisão humana, monitoramento e aprovação institucional específicas.

## 5. Separação conceitual obrigatória

A plataforma deve manter três camadas separadas.

### 5.1 Arquétipo comportamental

Resultado do formulário oficial de 12 perguntas e 5 dimensões. A atribuição registra a versão do formulário, da política e dos textos de resultado.

### 5.2 Maturidade operacional

Pré-infância, Infância, Adolescência ou Maturidade, obtida por dados objetivos autorizados. A referência determina que esse eixo não é calculado pelo formulário comportamental.

### 5.3 Prontidão específica da jornada

Conhecimento, acesso, objetivos e barreiras ligados à jornada atual. Para a Jornada OpenAI, inclui experiência com IA, dispositivo, conectividade, tarefas desejadas, uploads, dados sensíveis e acesso às ferramentas.

A personalização pode combinar as três camadas, mas elas não devem ser fundidas em um único rótulo.

## 6. Unidade de interpretação

O resultado deve ser apresentado como orientação de desenvolvimento baseada nas respostas daquela versão e contexto.

Evitar formulações permanentes ou estigmatizantes, como:

> “O empreendedor é desorganizado.”

Preferir:

> “Suas respostas nesta aplicação indicam oportunidades de fortalecer rotinas de gestão e acompanhamento.”

Os textos oficiais dos quatro resultados devem preservar o tom construtivo da referência.

## 7. Regras de classificação e incerteza

A premissa oficial determina que o formulário defina um dos quatro arquétipos. Entretanto, o pacote de referência não contém a planilha de iteração/scoring mencionada nem uma regra formal de empate.

Portanto:

- a plataforma deve suportar empate, prioridade e abstenção tecnicamente;
- nenhuma dessas estratégias será ativada como política oficial sem aprovação;
- não será inventada probabilidade ou confiança;
- `confidence` permanece nulo enquanto não houver método aprovado;
- a configuração oficial não pode ser publicada enquanto pesos, cortes e desempate não forem reproduzíveis;
- o scoring hardcoded do protótipo Raio-X é evidência secundária e não fonte oficial.

## 8. Versionamento, histórico e alteração

- formulário segue definição–versão–instância;
- rascunhos são editáveis;
- versões publicadas são imutáveis;
- respostas e resultados preservam a versão utilizada;
- recálculo cria nova atribuição e não apaga a anterior;
- override exige ator, justificativa e trilha de auditoria;
- mudanças metodológicas exigem nova versão e changelog.

## 9. Requisitos de validade

A validade deve ser sustentada para o uso específico por evidências de:

- conteúdo: itens representam adequadamente as cinco dimensões declaradas;
- processo de resposta: participantes compreendem as perguntas como pretendido;
- estrutura interna: pesos e combinação produzem comportamento coerente;
- estabilidade: resultados não variam arbitrariamente;
- relação com outras variáveis: associações são analisadas sem assumir causalidade;
- consequências: o uso não gera dano ou exclusão indevida;
- utilidade: o resultado melhora de fato a personalização.

A afirmação de validação pela FDC e a base citada na referência precisam ser acompanhadas do relatório, base ou evidência metodológica correspondente antes de qualquer claim público de validação.

## 10. Relação com a Teoria da Mudança

A plataforma deve manter separadas:

```text
resposta diagnóstica
→ arquétipo e contexto
→ recomendação ou intervenção
→ participação
→ compreensão
→ aplicação prática
→ resultado posterior
```

Conclusão de conteúdo, arquétipo ou engajamento não comprovam automaticamente impacto no negócio ou redução de risco.

## 11. Gate de publicação

A configuração inicial só poderá ser publicada quando existirem:

- texto exato das 12 perguntas;
- alternativas, condicionais e randomização aprovadas;
- vínculo de cada alternativa às dimensões e arquétipos;
- pesos, cortes, prioridades e regra de empate;
- versão e changelog do instrumento;
- textos finais dos quatro resultados;
- matriz inicial de ativações permitidas;
- revisão de linguagem, privacidade e consequências;
- teste de equivalência entre a especificação aprovada e a configuração carregada.

Até esse gate, o runtime pode ser testado apenas com configurações sintéticas claramente identificadas.
