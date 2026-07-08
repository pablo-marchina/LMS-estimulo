# Requisitos de eventos - Jornada OpenAI

**Versão:** 0.1  
**Status:** Requisitos semânticos para alimentar o E08; nomes canônicos finais ainda serão definidos

## 1. Objetivo

Identificar os fatos que a Jornada OpenAI precisa produzir. Este documento não define o envelope, armazenamento ou schema final dos eventos.

## 2. Entrada e navegação

- participação atribuída;
- jornada disponibilizada;
- jornada iniciada;
- hub visualizado;
- trilha selecionada;
- trilha iniciada;
- bloco opcional iniciado ou ignorado;
- bônus desbloqueado.

## 3. Conteúdo

- unidade disponibilizada;
- unidade iniciada;
- progresso de mídia registrado;
- conteúdo consumido;
- material complementar aberto/baixado;
- pausa prática iniciada;
- unidade concluída;
- unidade revisitada.

## 4. Avaliações

- quick check iniciado, respondido e submetido;
- resposta avaliada;
- avaliação de unidade enviada;
- avaliação de trilha enviada;
- prova iniciada, retomada e submetida;
- tentativa avaliada;
- prova aprovada/reprovada;
- nova tentativa disponibilizada.

## 5. Prática

- prática sugerida;
- prática iniciada;
- submissão criada;
- arquivo anexado;
- submissão enviada;
- revisão iniciada;
- submissão aceita, recusada ou devolvida para revisão;
- autorização de uso concedida/retirada;
- caso selecionado e publicado.

## 6. Progressão e reconhecimento

- etapa desbloqueada;
- requisito satisfeito;
- trilha concluída;
- pontos concedidos/revertidos;
- selo emitido/revogado;
- certificado emitido/revogado;
- nível base concluído;
- jornada avançada concluída.

## 7. Propriedades de contexto necessárias

Conforme o tipo de evento:

- participação;
- definição e versão da jornada;
- trilha e etapa;
- atividade e versão;
- avaliação, questão e tentativa;
- regra de progressão;
- regra de pontos;
- dispositivo/canal sem fingerprinting excessivo;
- origem da ação;
- duração ativa quando mensurável de forma confiável;
- estado anterior e posterior;
- causa da transição.

## 8. Eventos que não devem existir como atalhos sem fatos de origem

- `entrepreneur_engaged`;
- `entrepreneur_persistent`;
- `credit_ready`;
- `low_risk`;
- `applied_learning` sem evidência definida.

Esses conceitos são interpretações ou features derivadas, não fatos brutos.

## 9. Relação preliminar com features futuras

| Evidência | Eventos de origem possíveis | Interpretação ainda não autorizada |
|---|---|---|
| conclusão de unidades | início, progresso, quick check, conclusão | disciplina/persistência |
| retomada | inatividade, retorno, nova ação | resiliência |
| revisão de artefato | submissão, feedback, reenvio | abertura a feedback |
| prova | tentativa, resposta, nota | capacidade de aprendizagem |
| prática | submissão e validação | aplicação no negócio |
| resposta a nudge | envio, entrega, abertura, ação | responsividade |

O E08 definirá nomes, schemas, idempotência, ordenação, retenção e consumidores.
