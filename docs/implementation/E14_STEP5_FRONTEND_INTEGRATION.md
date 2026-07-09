# E14.1 — Passo 5 — integração do frontend

**Data:** 2026-07-09  
**Status:** BLOCKED  
**FRONTEND_APPLICATION_STATUS:** BLOCKED  
**OPENAI_CONTENT_STATUS:** BLOCKED

## Resultado

A integração real não pôde começar porque o repositório operacional ainda não contém uma aplicação web executável. A inspeção de `main` não encontrou `package.json`, configuração Next.js, código React ou o diretório alvo `apps/web`.

O Passo 3 permitiu reaproveitar apenas a estrutura visual auditada da fundação externa, que ainda não foi incorporada. O Passo 4 disponibilizou 13 RPCs reais, todos exclusivos da camada de servidor e dependentes da resolução de uma autenticação real para a identidade interna.

Nenhuma tela estática ou alteração manual no banco foi aceita como integração.

## Arquitetura obrigatória

```text
navegador
  -> handler de servidor em apps/web
  -> bridge JWT para identidade interna
  -> serviço tipado exclusivo de servidor
  -> RPC E14
  -> transação com evento e outbox
```

Credenciais privilegiadas nunca podem chegar ao navegador. Comandos mutáveis exigem `Idempotency-Key`; transições concorrentes usam `expected_aggregate_version`.

## Rotas

1. `/entrar`: autenticação e resolução da identidade.
2. `/empreendedor`: estado e início da jornada.
3. `/empreendedor/diagnostico`: início, respostas e conclusão.
4. `/empreendedor/atividade/[stepInstanceId]`: atividade, seções e quick check.
5. `/empreendedor/resultado`: progresso, avaliação e pontos.
6. `/admin`: publicação, matrícula e resultado administrativo.

Cada rota protegida deve ter loading, vazio, erro, não autorizado e pronto. Operações mutáveis também precisam de sucesso, conflito e replay. A atividade diferencia tentativa reprovada e aprovada.

## Acessibilidade

- rótulos e instruções programáticos;
- ordem lógica de títulos e foco;
- operação completa por teclado;
- erros e sucessos visíveis e anunciados;
- estado nunca indicado apenas por cor;
- responsividade sem perda de ação ou evidência.

## Bloqueadores P0

1. Aplicação Next.js ausente.
2. JWT real ainda não ligado à identidade interna.
3. Camada de serviço/BFF inexistente para os RPCs de servidor.

## Critério de saída

O passo somente estará concluído quando as seis rotas forem executáveis e um participante sintético concluir a jornada pela interface, com autenticação e autorização reais, sem interação manual com o banco.

## Próxima ação

Adicionar a aplicação em `apps/web`, implementar o bridge de identidade e a camada de servidor, e construir as seis rotas na ordem definida.
