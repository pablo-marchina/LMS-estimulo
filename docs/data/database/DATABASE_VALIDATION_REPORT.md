# Relatório de validação do modelo de banco v0.1

**Data:** 2026-07-08  
**Status:** validação estática concluída; execução PostgreSQL pendente.

## Validações realizadas

- YAML carregado com sucesso;
- 122 tabelas identificadas no baseline v0.2;
- todas as PKs referenciam colunas existentes;
- todas as 212 FKs referenciam tabelas e colunas existentes;
- 121 comandos `CREATE TABLE` gerados;
- balanceamento de parênteses do SQL igual a zero;
- nenhum nome duplicado de índice ou trigger;
- 47 índices explícitos gerados;
- 22 triggers gerados;
- anotações do modelo lógico como `nullable` e `partial` não vazaram para o SQL;
- nomes antigos específicos da Jornada OpenAI não foram usados como estruturas centrais;
- os artefatos de banco não usam nomenclatura de protótipo para descrever a release produtiva.

## Validação ainda não realizada

O ambiente atual não possui servidor/cliente PostgreSQL nem Docker. Portanto, o DDL ainda não foi aplicado em uma instância real.

Antes de aprovar como migration produtiva, executar:

1. `psql -v ON_ERROR_STOP=1 -f database-target-v0.2.sql` em banco descartável;
2. introspecção das 122 tabelas e constraints;
3. testes de inserts válidos/inválidos;
4. testes de triggers append-only;
5. testes de RLS após instalação das policies concretas;
6. rollback ou recriação do zero;
7. análise de dependências e tempos de migration.

## Classificação do SQL

`database-target-v0.2.sql` é a baseline física atual; ela já foi decomposta em migrations M00–M08 no E12. A execução em PostgreSQL real ainda é obrigatória.
