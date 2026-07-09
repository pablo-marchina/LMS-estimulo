# Especificação do diagnóstico do MVP v0.2

**Versão:** 0.2  
**Data:** 2026-07-08  
**Status:** Base funcional para implementação e pesquisa; não validada para crédito

## 1. Finalidade

O diagnóstico do MVP terá duas finalidades:

1. realizar roteamento operacional e personalização reversível da Jornada OpenAI;
2. produzir uma base de evidências para avaliar dimensões e descobrir perfis posteriormente.

Não produzirá arquétipo obrigatório nem score de crédito.

## 2. Estrutura do instrumento

### Seção A — Identificação de objetivo

Perguntas:

- qual tarefa deseja melhorar com IA;
- qual resultado espera obter;
- em quanto tempo pretende aplicar o aprendizado;
- qual área do negócio é prioritária.

Saídas:

- `primary_goal`;
- `target_use_case`;
- `application_horizon`;
- `priority_business_area`.

### Seção B — Acesso e prontidão operacional

Itens factuais:

- dispositivo disponível;
- conectividade;
- acesso a e-mail e navegador;
- acesso às ferramentas exigidas;
- capacidade de enviar arquivos;
- experiência anterior com IA;
- conhecimento básico sobre dados sensíveis;
- disponibilidade semanal;
- necessidade de ajuda para começar.

Saídas:

- `access_readiness`;
- `digital_preparation_needed`;
- `privacy_preparation_needed`;
- `support_preference`;
- `available_time_band`.

### Seção C — Dimensões comportamentais exploratórias

Usar subconjunto curto do banco de itens v0.1.

Regras iniciais:

- escala de resposta consistente;
- itens invertidos somente quando necessários e testados;
- média por dimensão com pesos iguais;
- resultado ausente quando menos de 60% dos itens da dimensão forem respondidos;
- escore normalizado de 0 a 100;
- nenhuma faixa será chamada de baixa, média ou alta na interface antes de validação;
- resultados serão representados como tendências de resposta.

### Seção D — Preferências e suporte

Perguntas:

- prefere assistir, ler, ouvir ou praticar;
- deseja lembretes;
- frequência máxima aceitável;
- canal disponível;
- possibilidade de apoio humano;
- preferência por exemplos guiados ou liberdade para explorar.

Saídas:

- `preferred_formats`;
- `nudge_opt_in`;
- `nudge_frequency_cap`;
- `support_mode`;
- `instruction_granularity`.

## 3. Saída do diagnóstico

```json
{
  "instrument_version": "diagnostic-mvp-v0.2",
  "status": "completed",
  "operational_readiness": {},
  "dimension_scores": {},
  "data_quality": {},
  "operational_segments": [],
  "recommended_start": {},
  "classification": {
    "archetype_id": null,
    "status": "not_in_use"
  }
}
```

## 4. Regras iniciais de roteamento

### R01 — Preparação digital

Se qualquer condição crítica de acesso for falsa:

- aplicar `digital_preparation_needed`;
- oferecer preparação antes da primeira atividade dependente;
- não bloquear conteúdos que possam funcionar sem a ferramenta.

### R02 — Preparação de privacidade

Se a pessoa não reconhecer risco de dados sensíveis:

- aplicar `privacy_preparation_needed`;
- exigir microconteúdo de segurança antes de atividades com documentos.

### R03 — Início guiado

Se houver pedido de ajuda inicial ou combinação de baixa confiança e ausência de experiência:

- aplicar `guided_start_recommended`;
- oferecer primeira atividade curta e explicada;
- permitir escolha pela experiência padrão.

### R04 — Início autônomo

Se acesso estiver disponível, objetivo estiver definido e não houver pedido de suporte:

- aplicar `self_directed_start`;
- liberar a experiência padrão.

### R05 — Incerteza

Se respostas estiverem incompletas, conflitantes ou com baixa qualidade:

- aplicar `uncertain_personalization`;
- usar fluxo padrão;
- coletar evidência progressivamente.

## 5. Atualização durante a jornada

As tags operacionais poderão ser atualizadas por regras versionadas.

Exemplos:

- falhas repetidas em avaliação → `assessment_recovery_needed`;
- conteúdo concluído sem prática → `completed_not_applied`;
- inatividade após início → `reengagement_needed`;
- pedido explícito → `human_support_requested`.

Cada alteração registrará:

- regra;
- versão;
- eventos de origem;
- validade;
- motivo;
- timestamp.

## 6. Conteúdo exibido ao participante

O participante deverá receber:

- objetivo recomendado;
- primeiro passo;
- explicação simples dos fatores usados;
- possibilidade de escolher uma alternativa;
- indicação de que o diagnóstico serve à personalização da capacitação;
- ausência de linguagem de risco ou crédito.

Não exibir:

- porcentagem pseudo-científica de personalidade;
- rótulo fixo;
- comparação moral com outros participantes;
- previsão de adimplência;
- inferências não sustentadas.

## 7. Dados para pesquisa

Registrar:

- item e versão;
- ordem de apresentação;
- resposta;
- tempo por item;
- alteração de resposta;
- abandono e retomada;
- canal e dispositivo;
- campos não respondidos;
- regra de roteamento aplicada;
- recomendação exibida;
- escolha do participante;
- comportamento posterior.

## 8. Critérios de revisão

Revisar o instrumento após:

- primeiro grupo de 20 participantes, para usabilidade e abandono;
- 50 participantes, para distribuição e qualidade dos itens;
- 100 participantes, para análise exploratória inicial, se a qualidade permitir;
- amostra maior definida pelo método estatístico antes de qualquer validação de perfis.

Os números acima são checkpoints operacionais, não garantias de validade estatística.

## 9. Restrições

- sem uso em crédito;
- sem enum obrigatório de quatro arquétipos;
- sem pesos ocultos;
- sem ajuste automático por demografia;
- sem inferência a partir de um único clique;
- sem tratamento prejudicial;
- sem uso de pontuação de gamificação como entrada direta.
