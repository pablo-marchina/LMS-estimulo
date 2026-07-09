# Plano de coleta de evidências no piloto

**Versão:** 0.1  
**Data:** 2026-07-08  
**Status:** Preparado para orientar eventos, banco e avaliação

## 1. Objetivo

Transformar o primeiro piloto da Jornada OpenAI em uma fonte prospectiva de evidências para:

- melhorar a jornada;
- avaliar o diagnóstico;
- testar regras de personalização;
- identificar barreiras;
- descobrir padrões comportamentais;
- avaliar posteriormente se arquétipos agregam valor.

## 2. Unidades de análise

- empreendedor;
- negócio;
- sessão diagnóstica;
- participação em jornada;
- atividade;
- tentativa;
- intervenção;
- submissão prática;
- janela de aplicação;
- versão de conteúdo e regra.

## 3. Linha do tempo de coleta

### T0 — Entrada

Coletar:

- contexto e objetivo;
- prontidão operacional;
- dimensões exploratórias;
- preferência de suporte;
- baseline de conhecimento;
- confiança calibrada;
- barreiras previstas.

### T1 — Primeira semana ou início efetivo

Coletar:

- tempo até primeira ação;
- preparação necessária;
- primeira conclusão válida;
- dificuldades;
- pedidos de ajuda;
- resposta à primeira intervenção.

### T2 — Durante a jornada

Coletar:

- regularidade;
- sequência;
- abandono;
- retomada;
- tentativas;
- revisão de conteúdo;
- uso de suporte;
- submissões;
- feedback;
- mudanças de segmentos operacionais.

### T3 — Conclusão

Coletar:

- domínio demonstrado;
- prática concluída;
- confiança pós-jornada;
- utilidade percebida;
- intenção de aplicação;
- barreiras restantes;
- satisfação com personalização.

### T4 — Aplicação posterior

Janela a definir conforme atividade.

Coletar separadamente:

- aplicação autorrelatada;
- evidência enviada;
- validação da evidência;
- manutenção da prática;
- resultado operacional percebido;
- dificuldades de continuidade.

## 4. Dados mínimos por intervenção

- população elegível;
- regra e versão;
- exposição;
- entrega;
- abertura ou visualização;
- ação-alvo;
- janela de observação;
- efeito indesejado;
- opt-out;
- comparação disponível.

## 5. Métricas de diagnóstico

### Qualidade de resposta

- conclusão;
- abandono por seção;
- tempo total;
- tempo por item;
- alterações;
- respostas ausentes;
- padrões invariantes;
- inconsistências entre itens relacionados.

### Utilidade operacional

- proporção com recomendação acionável;
- frequência de `uncertain_personalization`;
- aceitação ou troca da recomendação;
- diferença de comportamento após roteamento;
- necessidade de correção manual.

### Relação prospectiva

Analisar dimensões e segmentos contra:

- início;
- regularidade;
- conclusão;
- recuperação após erro;
- pedido de suporte;
- prática;
- aplicação.

Não usar o mesmo evento simultaneamente como causa da segmentação e resultado de validação sem separação temporal.

## 6. Estratégia de comparação

Quando possível:

- randomizar pequenas variações de suporte ou conteúdo;
- usar rollout em ondas;
- registrar baseline antes de ativar uma regra;
- comparar regra personalizada com experiência padrão;
- preservar elegíveis não expostos por falha operacional como grupo distinto, não como controle automaticamente válido.

## 7. Checkpoints

### Checkpoint A — 20 participantes

- verificar falhas técnicas;
- revisar linguagem;
- revisar duração;
- detectar abandono;
- corrigir eventos ausentes;
- não redefinir perfis estatisticamente.

### Checkpoint B — 50 participantes

- revisar distribuição de respostas;
- eliminar itens sem variabilidade ou incompreendidos;
- revisar segmentos operacionais;
- verificar qualidade das regras.

### Checkpoint C — 100 participantes

- realizar análise exploratória preliminar;
- verificar coerência dimensional;
- estudar associações prospectivas simples;
- decidir se coleta qualitativa complementar é necessária.

### Checkpoint D — Amostra adequada para perfis

- definir por simulação/poder com base em separação esperada, número de indicadores e prevalência mínima;
- comparar 1 a 6 perfis;
- validar fora da amostra ou em nova onda.

## 8. Proteções

- pseudonimização;
- minimização;
- acesso restrito;
- separação entre dados de produto e crédito;
- versionamento;
- registro de finalidade;
- não publicar pequenos grupos identificáveis;
- não usar resultados exploratórios para crédito.

## 9. Saída esperada

O piloto deverá permitir responder:

1. quais barreiras realmente impedem o início;
2. quais intervenções ajudam na retomada e aplicação;
3. quais dimensões têm informação útil;
4. se regras simples superam a experiência padrão;
5. se existem padrões consistentes que justifiquem arquétipos;
6. quais eventos e dados precisam ser corrigidos antes da próxima onda.
