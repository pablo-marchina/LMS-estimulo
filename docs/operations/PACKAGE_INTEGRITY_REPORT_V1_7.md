# Relatório de integridade do pacote v1.7

**Data:** 2026-07-08

- Arquivos: 163
- Markdown: 98
- Links locais quebrados: 0
- Segredos conhecidos persistidos: não
- Migrations canônicas: 10
- Migrations remotas registradas: 31
- Testes E12: 10 aprovados, 0 falhas
- Security Advisor: 0 lints
- RPCs de storage expostas a `anon/authenticated`: 0
- FKs sem índice no Supabase: 0
- Tabelas RLS sem policy: 0
- Objetos residuais da prova de Storage: 0
- Edge Function de Storage: versão 3, ativa, JWT obrigatório

## Observações

- O M09 canônico incorpora upload intents, confirmação server-side, SHA-256, quarentena, scan append-only e release.
- O bucket técnico permanece privado e vazio.
- O token temporário de prova não existe no pacote nem na função final.
- As extensões `http` e `pg_net`, usadas apenas para a prova física, foram removidas.
- O histórico remoto fragmenta M08 e M09; o mapa de equivalência foi preservado.
- Avisos `unused_index` não são falhas de integridade e serão avaliados após carga representativa.
- O teste E2E com JWT de participante real, a fila, o scanner e a paridade AWS continuam pendentes.

## Links quebrados

Nenhum.
