# Retenção, eliminação, anonimização e legal hold

## Estado seguro atual

Cinco políticas foram criadas como `draft` e sem prazo final. Nenhuma rotina de deleção de produção está habilitada. Isso evita transformar uma estimativa técnica em obrigação institucional.

## Componentes

- política versionada por classe/armazenamento;
- gatilho: criação, término da finalidade/relação/contrato, revogação, prazo legal ou manual;
- ação: apagar, anonimizar, agregar, arquivar restrito, revisão manual ou conservar por hold;
- `retention_runs` para dry run e execução;
- `retention_actions` por alvo;
- `legal_holds` e alvos explícitos;
- trigger que converte ação destrutiva em `blocked_legal_hold` quando houver hold ativo.

## Política operacional proposta

1. executar sempre em `dry_run` primeiro;
2. revisar quantidade, amostra e dependências;
3. bloquear quando houver hold, incidente ou solicitação em andamento;
4. executar em lotes pequenos, idempotentes e auditados;
5. verificar efeitos em eventos, projeções, CRM, arquivos e backups;
6. registrar hash/evidência antes e depois quando aplicável;
7. manter dados agregados somente quando a anonimização for efetiva e documentada.

## Supabase e AWS

Backups de banco do Supabase não incluem os objetos do Storage, portanto banco e arquivos precisam de planos separados. Na AWS, o desenho prevê PITR para o banco e versionamento/restore de objetos, além de testes periódicos conjuntos.

## Informações necessárias

- prazos legais, contratuais e operacionais por finalidade;
- duração da relação com o participante;
- ciclo de vida do crédito e obrigações de prova;
- retenção no HubSpot;
- retenção de logs e auditoria;
- políticas para arquivos enviados;
- critérios de anonimização e preservação de agregados;
- impacto de backups na eliminação efetiva.
