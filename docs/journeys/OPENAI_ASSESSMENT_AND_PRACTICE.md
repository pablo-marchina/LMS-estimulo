# Avaliações e atividades práticas - Jornada OpenAI

**Versão:** 0.1  
**Status:** Especificação estrutural; instrumentos ainda precisam ser produzidos

## 1. Tipos de avaliação

| Tipo | Momento | Objetivo | Gate | Persistência |
|---|---|---|---|---|
| Avaliação rápida | final de cada unidade | verificar o ponto principal | configurável; proposta inicial: necessária para concluir a unidade, sem nota de aprovação | todas as respostas |
| Estrelas da unidade | após a unidade | clareza, ritmo e utilidade percebida | não | resposta e contexto |
| Avaliação da trilha | final da trilha | feedback de produto | não | resposta e versão da trilha |
| Prova da trilha | após conteúdo e prática opcional | verificar competências da trilha e liberar selo | sim | todas as tentativas |
| Prova final base | após dois selos | verificar integração dos conhecimentos e liberar certificado | sim | todas as tentativas |
| Prova final avançada | após bônus | verificar competências avançadas | sim | todas as tentativas |

## 2. Banco de questões

Cada questão deverá possuir:

- definição e versão;
- competência avaliada;
- tipo;
- enunciado;
- opções, quando aplicável;
- resposta ou rubrica;
- justificativa pedagógica;
- dificuldade estimada;
- status editorial;
- acessibilidade;
- tags de conteúdo;
- regras de randomização;
- histórico de uso e análise futura.

A alteração do enunciado ou da resposta correta cria nova versão. Tentativas históricas permanecem associadas à versão respondida.

## 3. Tipos de questão iniciais

- escolha única;
- múltipla escolha;
- verdadeiro/falso com justificativa;
- ordenação de etapas;
- associação;
- cenário situacional;
- resposta curta avaliada por rubrica;
- análise de prompt ou saída de IA.

Questões abertas com correção automática por IA não devem ser usadas como gate de certificação sem política de validação, qualidade e recurso de revisão.

## 4. Política de tentativa - estrutura necessária

Parâmetros por avaliação:

```text
passing_score
max_attempts
cooldown_duration
question_selection_policy
feedback_policy
show_correct_answer
allow_resume
time_limit
late_submission_policy
manual_review_required
```

A fonte não define esses valores. A aplicação não deve codificar 70%, três tentativas ou qualquer outro valor sem aprovação.

## 5. Atividades práticas

### 5.1 Marketing e vendas

**Opções de evidência declaradas**

- mini campanha de marketing;
- calendário editorial;
- peça, legenda ou imagem;
- script de vendas;
- proposta comercial;
- prompt e resultado correspondente.

**Ambiguidade a resolver:** uma entrega à escolha, uma combinação mínima ou todas as entregas.

### 5.2 Gestão

**Opções de evidência declaradas**

- estrutura de assistente financeiro;
- organização de receitas e despesas;
- análise assistida de contrato de exemplo;
- checklist operacional;
- prompt e resultado correspondente.

**Ambiguidade a resolver:** uma entrega à escolha ou conjunto obrigatório.

### 5.3 Codex

**Opções de evidência declaradas**

- landing page;
- apresentação comercial;
- checklist, cadastro ou dashboard;
- versão evoluída de um artefato;
- documentação breve do problema e da solução.

O escopo mínimo do projeto avançado ainda não foi definido.

## 6. Modelo de submissão

Cada submissão deve registrar:

- participante, negócio e participação;
- jornada, trilha, atividade e versões;
- tipo de entrega;
- texto descritivo;
- arquivos ou links;
- data de criação e envio;
- declaração de autoria;
- presença de dados pessoais/sensíveis declarada;
- autorização separada para uso institucional;
- status de revisão;
- feedback;
- histórico de versões ou reenvios.

## 7. Estados da submissão

`draft -> submitted -> under_review -> accepted | revision_requested | rejected`

Estado separado para divulgação:

`not_considered -> selected -> consent_pending -> approved_for_use -> published -> withdrawn`

Aceitação pedagógica e autorização para divulgação são decisões independentes.

## 8. Rubrica genérica proposta

| Dimensão | Pergunta | Escala proposta |
|---|---|---|
| Adequação ao problema | o artefato responde ao problema descrito? | 0-3 |
| Contextualização | contém informações específicas do negócio? | 0-3 |
| Qualidade do prompt/processo | o processo é claro e reproduzível? | 0-3 |
| Revisão crítica | o participante verificou e melhorou a saída? | 0-3 |
| Aplicabilidade | pode ser utilizado ou testado no negócio? | 0-3 |
| Segurança e privacidade | evita dados inadequados e reconhece limites? | 0-3 |

A rubrica precisa ser adaptada por tipo de atividade antes da publicação.

## 9. Segurança e limites de conteúdo

- Conteúdo financeiro deve deixar claro que organização de informações não substitui contabilidade ou aconselhamento profissional.
- Conteúdo contratual deve ensinar triagem e identificação de pontos para verificação, não aconselhamento jurídico conclusivo.
- Participantes não devem enviar contratos, planilhas ou documentos reais com dados pessoais/sensíveis sem orientação e controles específicos.
- Uploads devem ser validados, limitados, armazenados com acesso restrito e examinados conforme o threat model.
- Conteúdo gerado por IA deve ser revisado pelo participante antes de uso.

## 10. Bloqueios editoriais

- perguntas e respostas ainda inexistentes;
- rubricas específicas ainda inexistentes;
- notas mínimas não definidas;
- tentativas e feedback não definidos;
- escopo das práticas ambíguo;
- processo e capacidade de revisão humana não definidos;
- política de uso de IA na correção não definida;
- termos de autorização e privacidade não aprovados.
