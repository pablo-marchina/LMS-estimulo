# E14.1 — Passo 4 — vertical backend

**Data:** 2026-07-09  
**Status:** PARTIAL  
**Runtime:** LIVE_COMPLETE  
**Conteúdo OpenAI:** BLOCKED

A vertical técnica interna foi executada ponta a ponta com dados sintéticos: publicação, matrícula, diagnóstico, caminho, atividade, avaliação, progresso, pontos, eventos e resultado administrativo.

## Evidência principal

- 13 operações de backend disponíveis para a aplicação;
- caminho `standard` atribuído após quatro respostas;
- quatro seções concluídas sem duplicação;
- primeira tentativa reprovada sem pontos;
- segunda tentativa aprovada com nota 100;
- etapa, caminho e jornada concluídos;
- progresso final 1.0;
- dois lançamentos, totalizando 7 pontos;
- 35 eventos e 35 registros de entrega;
- repetição da submissão sem efeitos duplicados.

Também foram comprovados bloqueio de alteração publicada, conflito de versão obsoleta, conflito de repetição com corpo diferente e separação entre as consultas de participante e operador.

## Replay

As 165 alterações remotas bem-sucedidas foram exportadas e validadas localmente:

- 133.886 bytes;
- SHA-256 `8d40700c6798b306d514db5da43a77d0d245756b9d71eda58c4ae462fcd1899f`;
- arquivo local `/mnt/data/e14_step4_remote_replay.sql`.

O transporte do SQL integral para o repositório foi bloqueado ou truncado pelo conector. Nenhum arquivo parcial foi mantido. Esse replay ainda precisa ser publicado por um canal sem truncamento e executado em banco limpo.

## Bloqueadores

- provar autenticação real ligada à identidade interna;
- publicar e reexecutar o replay integral;
- integrar uma aplicação frontend executável;
- remover manualmente a função de exportação neutralizada;
- repetir os diagnósticos oficiais de segurança e desempenho;
- concluir o conteúdo editorial da Jornada OpenAI;
- validar staging obrigatório na AWS antes de produção.

O runtime backend pode orientar a integração seguinte, mas não libera participantes reais nem produção.
