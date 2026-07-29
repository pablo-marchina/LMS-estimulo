# Regras propostas de progressão — Jornada OpenAI

**Revisado em:** 2026-07-29  
**Status:** proposta editorial; não representa regra oficial ativa

O runtime suporta progressão versionada e configurável. Este documento organiza uma proposta derivada das fontes disponíveis; os registros ativos no banco de desenvolvimento não tornam os parâmetros abaixo oficiais.

## Princípios

- regras são dados estruturados e versionados;
- texto descritivo não é regra executável;
- decisões registram versão e evidências;
- conteúdo consumido, unidade concluída, avaliação aprovada e prática aplicada são estados distintos;
- participantes não migram automaticamente entre versões.

## Grafo proposto

| Origem | Condição | Destino |
|---|---|---|
| Entrada | participação disponível | Boas-vindas |
| Boas-vindas | conclusão válida | Hub |
| Hub | escolha | Base opcional, Marketing ou Gestão |
| Marketing | avaliação aprovada | Selo Marketing |
| Gestão | avaliação aprovada | Selo Gestão |
| Dois selos | regra aprovada | Prova final base |
| Prova base aprovada | critérios satisfeitos | Certificado Base |
| Certificado Base | regra aprovada | Codex |
| Codex e prova aprovados | critérios satisfeitos | Certificado Avançado |

## Conclusão de atividade

O runtime pode separar:

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

Percentual de vídeo, possibilidade de pular, quick check como gate e obrigatoriedade de prática permanecem pendentes.

## Trilhas

Marketing e Gestão são paralelas na proposta. O bloco base é opcional e não deve virar gate silenciosamente. Codex depende de regra editorial aprovada.

## Avaliações

O sistema suporta:

- nota mínima;
- limite e intervalo entre tentativas;
- randomização;
- políticas de feedback;
- retomada;
- revisão manual;
- histórico de tentativas.

Nenhum valor final está aprovado.

## Práticas

As fontes indicam entregas opcionais e revisão humana. Aceitação pedagógica e autorização para divulgação são decisões separadas.

## Pendências

- critérios de conclusão por tipo de mídia;
- gates de quick check e prática;
- notas e tentativas;
- prazo e expiração;
- requisitos de selos e certificados;
- retorno após reprovação;
- migração de versão;
- equivalências acessíveis.

A regra oficial deve ser publicada pelo editor administrativo e validada por E2E real.
