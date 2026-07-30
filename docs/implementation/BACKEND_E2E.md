# Backend E2E reproduzível

**Revisado em:** 2026-07-30  
**Estado:** suíte permanente; resultado avaliado por SHA em PostgreSQL efêmero

## Finalidade

O backend E2E comprova o comportamento transacional da vertical técnica depois do replay integral do histórico Git. A execução usa PostgreSQL efêmero e não consulta nem altera o Supabase remoto.

Resultados, contagens e tempos pertencem aos logs e artefatos do workflow do SHA avaliado.

## Pré-condições

1. banco vazio iniciado na versão suportada;
2. replay integral de `supabase/migrations/`;
3. equivalência de schema aprovada;
4. contratos públicos de RPC aprovados;
5. fixtures sintéticas criadas dentro da execução comportamental.

## Fluxo exercitado

1. publicação e replay idempotente de uma versão de jornada;
2. matrícula sintética;
3. início da jornada;
4. diagnóstico e respostas;
5. atribuição de caminho;
6. início e progresso de atividade;
7. avaliação com tentativa reprovada e aprovada;
8. conclusão de etapa, caminho e jornada;
9. eventos, outbox e projeções finais;
10. consultas de participante e operador.

As fixtures existem apenas no banco efêmero e não representam conteúdo oficial.

## Invariantes obrigatórios

- um comando com a mesma idempotency key e o mesmo payload não duplica efeitos;
- reutilização da chave com payload diferente é rejeitada;
- versão agregada obsoleta é rejeitada;
- mutação direta de versão publicada é bloqueada;
- ator sem permissão recebe `FORBIDDEN`;
- participante não acessa contexto de outro usuário ou organização;
- `authenticated` não executa RPCs exclusivas do servidor;
- eventos, outbox, ledger e projeções permanecem coerentes;
- falha intermediária não confirma escrita parcial;
- o resultado final pode ser reproduzido desde banco vazio.

## Provas negativas

A suíte deve cobrir, conforme o contrato vigente:

- `IDEMPOTENCY_KEY_REUSED`;
- `AGGREGATE_VERSION_CONFLICT`;
- `PUBLISHED_VERSION_IMMUTABLE`;
- `FORBIDDEN`;
- RLS e RBAC negativos;
- ausência de execução direta pelo navegador;
- isolamento entre atores e organizações sintéticas.

## Execução

```bash
npm run test:database
```

O entrypoint reconstrói o banco, valida equivalência e contratos e executa o E2E junto das demais suítes de domínio. A execução deve ocorrer uma única vez por banco efêmero.

## Limite

Essa prova valida o domínio e o banco reproduzível do software. Ela não substitui E2E no ambiente AWS definitivo, integração externa em sandbox, capacidade multiusuário, observabilidade, backup, restore ou rollback.
