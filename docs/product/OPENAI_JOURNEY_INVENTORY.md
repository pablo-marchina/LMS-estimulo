# Inventário inicial da Jornada OpenAI

**Fonte:** PDF final de referência e `modules/journey/journey-data.ts`  
**Versão do documento de origem:** rascunho v0.3, informado como versão final de referência para o projeto

## Estrutura identificada

| Bloco | Status | Duração declarada | Resultado/reconhecimento |
|---|---|---:|---|
| Boas-vindas e potencial da IA | Obrigatório | 15 min | Selo Potencial da IA |
| Bloco base opcional | Opcional | 20 min | Selo Base IA |
| Marketing e vendas com IA | Trilha base | 30 min + prova | Selo Marketing e Vendas |
| Gestão com IA | Trilha base | 30 min + prova | Selo Gestão com IA |
| Bônus avançado Codex | Avançado/bloqueado | 30 min + prova final | Selo Desenvolvimento + Certificado Avançado |

## Avaliações previstas

- avaliação rápida ao final de cada aula;
- estrelas da aula;
- avaliação de percepção da trilha;
- prova da trilha;
- prova final base;
- prova final avançada.

## Atividades práticas previstas

- mini campanha de marketing;
- script de vendas/proposta;
- assistente financeiro;
- análise de contrato;
- checklist operacional;
- projeto avançado em Codex.

## Gamificação de referência

O documento propõe pontos para conclusão, avaliações, envio de prática, seleção de caso, provas e bônus. Esses valores devem ser tratados como hipótese de engajamento, não como regra final nem feature de crédito.

## Inconsistências e lacunas encontradas

- O PDF chama a trilha de Marketing de 30 min + prova, mas as durações listadas somam 31 min antes da prova.
- A trilha Gestão também lista 31 min antes da prova.
- A numeração pula B2, 1.3 e possivelmente outras aulas; é necessário confirmar se são omissões intencionais.
- O código define duração total de 145 min, mas o total do documento depende de provas e do bônus e precisa ser recalculado por regra clara.
- `journey-data.ts` codifica a jornada diretamente; não há versão editorial persistida.
- Não existem perguntas, alternativas, critérios de correção, quantidade de tentativas ou rubricas completas.
- “Pausa prática” aparece como princípio, mas não está modelada como entidade/atividade distinta.
- O envio prático é opcional, porém os critérios de validação, revisão e follow-up ainda não estão especificados.
- O Certificado Base depende de dois selos e prova final, mas não está formalizada a política de notas, expiração ou reavaliação.
- O bônus Codex depende do Certificado Base, mas a regra de desbloqueio ainda é texto livre.
- Os materiais ainda não possuem URLs, arquivos finais, acessibilidade, licença e status editorial completos.

## Próximo passo

Converter a jornada para uma especificação versionada com:

- objetivos e competências por bloco;
- conteúdos e ativos;
- regras executáveis de entrada/progressão/conclusão;
- avaliações e tentativas;
- atividades práticas e evidências;
- eventos produzidos por etapa;
- pontos/selos/certificados configuráveis;
- política de atualização de participantes já inscritos.
