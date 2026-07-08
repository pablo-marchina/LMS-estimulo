# Gamificação, selos e certificados - Jornada OpenAI

**Versão:** 0.1  
**Status:** Proposta baseada nos valores sugeridos na fonte

## 1. Princípios

- Pontos são uma camada de engajamento, não evidência automática de aprendizagem ou risco de crédito.
- O saldo será derivado de um ledger imutável, não mantido apenas como número mutável.
- Regras de pontos são versionadas.
- A mesma ação não pode gerar pontos duas vezes sem uma regra explícita de recorrência.
- Reversões e correções geram lançamentos compensatórios; não apagam o histórico.
- Selos e certificados possuem critérios independentes de pontos.
- Recompensas não podem criar incentivo para cliques artificiais ou exposição desnecessária de dados.

## 2. Regras de pontos sugeridas pela fonte

| Ação | Pontos sugeridos | Evento de negócio | Recorrência proposta |
|---|---:|---|---|
| Concluir Boas-vindas | 10 | conclusão válida do bloco | uma vez por participação/versão |
| Concluir Bloco Base | 15 | conclusão válida do bloco | uma vez por participação/versão |
| Concluir unidade | 5 | conclusão válida da unidade | uma vez por atividade/versão |
| Responder avaliação rápida | 2 | submissão válida | uma vez por tentativa elegível; regra final pendente |
| Avaliar unidade por estrelas | 1 | feedback enviado | uma vez por atividade/versão |
| Enviar resultado prático | 20 | submissão aceita tecnicamente | uma vez por atividade ou entrega elegível |
| Resultado selecionado como caso | 50 | seleção aprovada | uma vez por submissão |
| Aprovar prova da trilha | 30 | tentativa aprovada | uma vez por avaliação/versão |
| Aprovar prova final base | 50 | tentativa aprovada | uma vez por avaliação/versão |
| Concluir bônus Codex | 30 | requisitos do bônus satisfeitos | uma vez por participação/versão |
| Aprovar prova final avançada | 50 | tentativa aprovada | uma vez por avaliação/versão |

Todos os valores permanecem configuráveis e pendentes de validação de produto.

## 3. Ledger de pontos

Cada lançamento deve incluir:

- identificador único;
- participante e participação;
- regra e versão;
- quantidade positiva ou negativa;
- motivo;
- evento causal;
- atividade/avaliação/submissão relacionada;
- data de ocorrência e processamento;
- chave de idempotência;
- expiração, caso a política futura a use;
- lançamento compensado, quando aplicável.

## 4. Proteções contra abuso

- uma única premiação por chave de idempotência;
- nenhum ponto por abrir/recarregar uma tela;
- limites para ações repetíveis;
- feedback por estrelas premiado somente uma vez;
- tentativas reprovadas não geram novamente o prêmio de aprovação;
- revisão de anomalias antes de recompensas escassas;
- pontos de seleção de caso apenas após decisão editorial registrada.

## 5. Selos

| Selo | Critério derivado da fonte | Pendências |
|---|---|---|
| Potencial da IA | conclusão do bloco de boas-vindas | critérios exatos de conclusão |
| Base IA | conclusão do bloco base opcional | critérios exatos de conclusão |
| Marketing e Vendas | conteúdo da trilha + prova aprovada | nota, tentativas e prática |
| Gestão com IA | conteúdo da trilha + prova aprovada | nota, tentativas e prática |
| Desenvolvimento com IA | conclusão do bônus avançado | relação com prova e entrega |

A emissão deve armazenar um snapshot dos requisitos satisfeitos e suas versões.

## 6. Certificados

### Certificado Base

Requisitos da fonte:

1. Selo Marketing e Vendas;
2. Selo Gestão com IA;
3. aprovação na Prova Final Base.

O Selo Base IA não aparece como requisito do Certificado Base na fonte.

### Certificado Avançado

Requisitos da fonte:

1. acesso ao bônus após Certificado Base;
2. conclusão do bônus Codex;
3. aprovação na Prova Final Avançada.

### Registro necessário

- número/identificador verificável;
- participante e nome apresentado;
- definição e versão do certificado;
- jornada e versão;
- evidências/requisitos satisfeitos;
- data de emissão;
- validade ou ausência de expiração;
- status: ativo, revogado, expirado;
- motivo de revogação;
- página de validação pública com dados minimizados.

## 7. Recompensas de engajamento

A fonte lista mentorias, office hours, eventos, revisão de projeto, destaque em redes e acesso antecipado. Antes de disponibilizar um catálogo, é necessário definir:

- estoque/capacidade;
- elegibilidade;
- resgate por pontos, seleção ou sorteio;
- validade;
- prioridade e desempate;
- cancelamento;
- dados compartilhados;
- prevenção de tratamento desigual não intencional;
- política para menores de idade, caso aplicável.

## 8. Relação com score comportamental

Por padrão, pontos, selos e certificados não serão features diretas do score. Caso sejam avaliados futuramente:

- devem ser decompostos nos eventos que os originaram;
- deve-se controlar por exposição e oportunidade;
- alterações de regras de pontos precisam ser consideradas;
- o uso deve passar por validação, análise de viés e governança.

## 9. Pendências

- aprovar valores de pontos;
- definir ações recorrentes;
- decidir expiração de pontos;
- definir critérios de resgate;
- confirmar se prática é requisito de selo/certificado;
- definir validade de certificados;
- aprovar texto e layout das credenciais;
- definir processo de revogação e reemissão.
