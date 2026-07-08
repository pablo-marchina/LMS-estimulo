# Modelo de momentos de intervenção

**Versão:** 0.1  
**Status:** Estrutura genérica e candidatos da Jornada OpenAI; tempos e canais pendentes de validação

## 1. Separações obrigatórias

- **Momento:** condição em que uma ação pode ser útil.
- **Gatilho:** fato que inicia a avaliação da regra.
- **Elegibilidade:** quem pode receber.
- **Intervenção:** ação executada.
- **Canal:** onde ocorre.
- **Objetivo:** comportamento ou resultado esperado.
- **Janela de avaliação:** período em que o efeito será observado.

Um momento não determina automaticamente uma mensagem.

## 2. Fontes de gatilho

### 2.1 Ciclo da jornada

- convite criado ou entregue;
- participação ativada;
- diagnóstico iniciado ou concluído;
- trilha atribuída;
- atividade disponibilizada;
- marco concluído;
- certificado emitido.

### 2.2 Comportamento

- primeira ação;
- progresso;
- erro;
- tentativa repetida;
- abandono;
- retomada;
- prática submetida;
- feedback recebido;
- sequência de comportamentos.

### 2.3 Tempo

- tempo desde convite;
- tempo desde última atividade;
- proximidade de prazo;
- janela de retorno;
- frequência máxima de contato.

### 2.4 Sistemas externos

- mudança de estágio no HubSpot;
- evento da operação de crédito;
- entrada em público prioritário;
- atualização cadastral relevante.

Os eventos exatos permanecem pendentes do inventário dos sistemas.

### 2.5 Ação humana

- recomendação manual;
- pedido de ajuda;
- revisão de submissão;
- sinalização de suporte;
- exceção aprovada.

## 3. Schema conceitual da regra

```yaml
intervention_definition:
  code: string
  version: integer
  objective: string
  trigger:
    event_name: string
    conditions: []
  eligibility: []
  exclusions: []
  suppression_rules: []
  cooldown: duration
  priority: integer
  action:
    type: in_app | email | whatsapp | recommendation | human_task
    content_version: string
  experiment:
    experiment_id: nullable
    arm: nullable
  outcome:
    target_event: string
    observation_window: duration
  status: draft | active | paused | retired
```

## 4. Intensidade da intervenção

| Nível | Tipo | Exemplo |
|---|---|---|
| 0 | nenhuma ação | continuar observando |
| 1 | orientação passiva | destaque ou próximo passo |
| 2 | nudge leve | lembrete contextual |
| 3 | suporte adaptado | conteúdo alternativo ou explicação |
| 4 | apoio humano | contato ou revisão manual |

A intensidade não deve aumentar automaticamente apenas por ausência de atividade; contexto e frequência precisam ser considerados.

## 5. Candidatos para a Jornada OpenAI

Os tempos são placeholders a validar.

### I01 — Convite sem início

- gatilho: convite entregue sem início;
- objetivo: reduzir perda antes da primeira ação;
- possíveis ações: explicar duração, benefício e privacidade;
- proteção: limite de tentativas e opt-out.

### I02 — Diagnóstico interrompido

- gatilho: sessão iniciada e não concluída;
- objetivo: permitir retomada sem repetir respostas;
- ação: link de retomada e indicação do progresso restante.

### I03 — Resultado do diagnóstico

- gatilho: resultado gerado;
- objetivo: explicar o perfil sem rótulo determinista e apresentar o primeiro passo;
- ação: resumo, confiança e motivo da recomendação.

### I04 — Baixa prontidão digital

- gatilho: barreira de acesso ou uso identificada;
- objetivo: tornar a primeira atividade viável;
- ação: preparação, tutorial ou canal alternativo;
- observação: não confundir com arquétipo.

### I05 — Primeiro sucesso

- gatilho: primeira atividade válida concluída;
- objetivo: reforçar progresso e indicar próximo passo;
- ação: feedback específico, não apenas pontos.

### I06 — Dificuldade em avaliação

- gatilho: erro ou tentativas repetidas;
- objetivo: promover compreensão antes de nova tentativa;
- ação: conteúdo de revisão, exemplo ou explicação;
- proteção: não punir tentativa adicional com perda de acesso.

### I07 — Inatividade após início

- gatilho: ausência de atividade após participação real;
- objetivo: facilitar retomada;
- ação: retornar ao ponto exato, estimar tempo e oferecer alternativa.

### I08 — Prática submetida

- gatilho: submissão registrada;
- objetivo: fornecer retorno e incentivar aplicação real;
- ação: confirmação, feedback automático limitado ou fila humana.

### I09 — Prática não enviada

- gatilho: conteúdo concluído sem evidência prática, quando a prática for relevante;
- objetivo: reduzir distância entre consumo e aplicação;
- ação: desafio simplificado ou autorrelato estruturado.

### I10 — Uma trilha base concluída

- gatilho: primeiro selo base;
- objetivo: direcionar à trilha restante;
- ação: mostrar ganho e próximo caminho.

### I11 — Certificado Base emitido

- gatilho: requisitos base satisfeitos;
- objetivo: reconhecer e oferecer bônus avançado sem pressão;
- ação: certificado e convite opcional ao Codex.

### I12 — Pedido explícito de ajuda

- gatilho: participante solicita suporte;
- objetivo: resolver bloqueio real;
- ação: resposta contextual, material ou tarefa humana.

## 6. Momentos ligados ao crédito

Serão modelados após obter:

- estados oficiais;
- definição de quase aprovado;
- eventos de mudança;
- prazos;
- regras de comunicação;
- dados disponíveis;
- autorização para uso.

Candidatos conceituais, ainda não implementáveis:

- comunicação de quase aprovação;
- preparação para reaplicação;
- pré-desembolso;
- acompanhamento de crédito ativo;
- sinal preventivo de atraso;
- recuperação de inadimplência;
- renovação.

## 7. Prevenção de excesso e conflito

Cada regra deverá possuir:

- cooldown;
- prioridade;
- exclusão por comunicação recente;
- limite por canal;
- preferência do participante;
- opt-out quando aplicável;
- deduplicação;
- cancelamento quando o objetivo já foi atingido;
- tratamento de conflito entre intervenções.

## 8. Avaliação

Para cada intervenção, registrar:

- elegíveis;
- expostos;
- entregues;
- abertos;
- ações posteriores;
- comparação ou baseline;
- efeitos indesejados;
- abandono;
- reclamações;
- diferença entre segmentos.

A intervenção não deverá ser considerada eficaz apenas porque a mensagem foi aberta.
