# Regras propostas de progressão — Jornada OpenAI

**Revisado em:** 2026-09-01  
**Status:** proposta editorial; não representa regra oficial ativa

## Princípios

- regras executáveis são dados estruturados;
- conteúdo consumido, quick check, prática, avaliação e conclusão são fatos distintos;
- edição de jornada segue o registro operacional único `draft ↔ published`;
- mudanças editoriais não fabricam/regravam fatos históricos já registrados;
- parâmetros de progressão só são oficiais quando publicados/aprovados no ambiente correspondente.

## Grafo proposto

| Origem | Condição | Destino |
|---|---|---|
| Entrada | participação disponível | Boas-vindas |
| Boas-vindas | conclusão válida | Hub |
| Hub | escolha | Base opcional, Marketing ou Gestão |
| Marketing | avaliação aprovada | Selo Marketing |
| Gestão | avaliação aprovada | Selo Gestão |
| Dois selos | regra aprovada | Prova final base |
| Prova base | critérios satisfeitos | Certificado Base |
| Certificado Base | regra aprovada | Codex |
| Codex/prova | critérios satisfeitos | Certificado Avançado |

## Estados possíveis

```text
available
started
content_progressed
content_consumed
quick_check_submitted
quick_check_satisfied
practice_started
practice_completed
feedback_submitted
completed
```

## Avaliações

O runtime suporta tentativa, nota mínima, feedback, retomada e revisão conforme configuração. Para quick check `multiple_choice`, todas e somente as alternativas corretas devem estar selecionadas.

## Pendências editoriais

Percentuais mínimos de mídia, gates obrigatórios, notas/tentativas, prazo, certificados, retorno após reprovação e equivalências acessíveis continuam dependentes de decisão editorial. Não existe “migração entre versões da jornada” como requisito do lifecycle atual; mudanças são edição ao vivo ou despublicação/edição do mesmo registro, enquanto fatos históricos permanecem em seus stores próprios.