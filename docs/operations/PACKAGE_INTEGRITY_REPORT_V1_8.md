# Relatório de integridade do pacote v1.8

**Data:** 2026-07-08

## Resultado

Os valores desta seção são atualizados pela verificação final antes da compactação.

- Arquivos: 189
- Markdown: 103
- Links locais verificados: 143
- Links locais quebrados: 0
- Segredos conhecidos persistidos: não
- Migrations canônicas: 11 (`M00–M10`)
- Migrations remotas registradas: 41
- Testes E12: 24 aprovados, 0 falhas
- Edge Functions com transpile válido: 2 de 2
- Security Advisor: 0 lints
- RPCs de fila/scan expostas a `anon/authenticated`: 0
- RPCs de fila/scan disponíveis para `service_role`: 9 de 9
- FKs sem índice no Supabase: 0
- Tabelas RLS sem policy: 0
- Source queue ativa: 0 mensagens
- DLQ ativa: 0 mensagens
- Objetos e registros residuais da prova do worker: 0

## Componentes comprovados

- fila durável PGMQ e DLQ separada;
- identidade estável de job e deduplicação lógica;
- receipt novo a cada receive;
- visibility timeout e extensão de visibilidade;
- retry com reentrega e incremento de receive count;
- acknowledgement idempotente;
- max receive count, DLQ e redrive preservando `job_id`;
- criação transacional do scan job com a confirmação do upload;
- supressão idempotente de resultado de scan repetido;
- Edge Worker real com JWT obrigatório e autenticação HMAC interna;
- scan técnico, release para `protected/` e ack comprovados no runtime;
- cleanup integral do fixture e remoção da extensão HTTP de prova.

## Estado estrutural remoto

- 130 tabelas da aplicação;
- 233 foreign keys;
- 76 check constraints;
- 425 índices incluindo PK e unique;
- 29 triggers;
- 215 policies RLS;
- 57 tabelas com RLS;
- duas filas PGMQ ativas e vazias.

## Limitações registradas

- scheduler/dispatcher automático ainda não foi implementado;
- o scanner atual é somente prova técnica para `e12_storage_proof`;
- concorrência real com múltiplos workers e fault injection ainda não foram executados;
- a paridade com SQS, IAM, S3 e scanner AWS ainda não foi comprovada em staging;
- o teste com JWT real de participante e reutilização do pool permanece pendente;
- avisos `unused_index` não são falhas de integridade e só serão avaliados após carga representativa.

## Links quebrados

Nenhum.
