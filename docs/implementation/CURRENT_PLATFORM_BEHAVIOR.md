# Contratos atuais da Plataforma Estímulo

**Revisado em:** 2026-09-01  
**Status:** referência de comportamento implementado para as correções prioritárias

Este documento concentra os contratos observáveis que precisam permanecer verdadeiros após refactors. Ele não substitui migrations, testes ou documentação especializada; serve como mapa para quem entra no projeto sem contexto do PR que originou as correções.

## 1. Entrada e autenticação

### Participante

`/entrar` é exclusivamente a entrada comum do participante. Não exibe atalho “Sou da equipe Estímulo”. Cadastro, confirmação e recuperação permanecem no fluxo participante.

### Administração

A entrada administrativa é `/entrar/administracao` e inicia OAuth Google. No callback Supabase:

1. o código OAuth é trocado por sessão;
2. `auth.getUser()` valida e recupera o usuário atual;
3. o usuário precisa ter e-mail confirmado;
4. o registro do usuário precisa demonstrar identidade Google por `identities` ou `app_metadata.provider/providers`;
5. a identidade interna é resolvida;
6. deve existir membership ativa na organização Estímulo;
7. capabilities específicas continuam sendo verificadas por RBAC.

O callback **não depende de `getClaims()`/AMR para reconhecer Google**. O domínio `@estimulo.org` continua útil em políticas de gestão de contas corporativas, mas domínio sozinho não é autorização administrativa.

## 2. Diagnóstico principal

A configuração continua sendo a autoridade para perguntas, scores, dimensões, perfis e thresholds. O runtime corrigido:

- calcula score de dimensão pela média dos scores das respostas aplicáveis;
- trata thresholds configurados de perfil como limites superiores inclusivos;
- avalia as faixas em ordem crescente do limite máximo, impedindo que uma faixa ampla capture scores que pertencem a faixas inferiores.

Essas regras corrigem a execução da configuração existente. Elas **não inventam metodologia oficial**, pesos, cortes ou psicometria que não tenham sido aprovados/documentados pela Estímulo.

## 3. Quick check

Para `multiple_choice`:

- códigos selecionados são normalizados, ordenados e serializados de forma estável no web;
- o banco separa, trimma e deduplica os códigos;
- toda opção enviada precisa existir;
- a resposta é correta somente se o conjunto selecionado for exatamente igual ao conjunto de opções marcadas como corretas;
- ordem de seleção não muda o resultado.

A correção reutiliza `app_private.e14_context_g(uuid,uuid,uuid,text)`, helper já inventariado. A facade pública legada permanece delegada ao executor original e não recebe grants para `public`, `anon` ou `authenticated`.

## 4. Home e Jornada OpenAI

A home busca jornadas elegíveis para encontrar um destaque publicável mesmo quando o usuário ainda não possui uma jornada atual. A consulta de elegibilidade é **enriquecimento opcional**: falhar nessa consulta não transforma toda a home em erro se os dados centrais carregaram.

Uma jornada em destaque não deve desaparecer apenas porque também aparece/foi removida de outra coleção da página.

## 5. Clickability e navegação

- cards de jornada possuem alvo de abertura no card sem aninhar link/form conflitante com ações visíveis;
- título/thumbnail/área principal de aula podem abrir a aula;
- botões explícitos continuam com prioridade de interação;
- o botão “Entrar” mantém contraste legível;
- `/ajuda` usa o shell/header apropriado do participante.

## 6. Badge acquisition popup

A mensagem de nova conquista é dirigida por `award_id`, não por “primeira visita deste browser”.

- o browser registra baseline mesmo quando a lista inicial de badges é vazia;
- awards históricos na primeira carga não são anunciados;
- awards realmente novos em uma atualização posterior são enfileirados;
- a fila deduplica IDs;
- localStorage ausente/corrompido é tratado como estabelecimento de baseline, não como “nenhum badge visto”;
- falha ao carregar credenciais não grava baseline vazio que possa ocultar uma futura aquisição legítima.

Chave atual: `stimulo-seen-badge-awards-v2`.

## 7. Ranking e privacidade

O ranking não usa código aleatório para fingir anonimização e não expõe e-mail completo. O banco normaliza e mascara o e-mail antes de produzir a identificação exibível. Entrada inválida recebe fallback mascarado genérico.

A posição continua derivada de pontos; o identificador técnico pode atuar apenas como desempate determinístico de apresentação, não como componente do `dense_rank()`.

## 8. E-mail de confirmação Supabase

O template versionado é `supabase/templates/confirmation.html`. O link SSR usa:

- `{{ .RedirectTo }}`;
- `{{ .TokenHash }}`;
- `type=email`;
- rota `/confirm`, que verifica o OTP/token hash no app.

Sincronização hospedada:

```bash
SUPABASE_ACCESS_TOKEN=... \
SUPABASE_PROJECT_REF=... \
npm run sync:supabase-confirmation-email
```

O script faz `PATCH` da configuração Auth e depois `GET` para verificar correspondência exata de assunto e HTML. Tokens/project refs não são versionados.

## 9. Banco e contratos congelados

Baselines legíveis por máquina de RPC pública, helpers opacos e equivalência de schema são autoridade. A correção de quick-check não cria helper opaco ou facade pública nova. A máscara de ranking é uma rotina semântica nova e intencional, coberta por replay/equivalência.

Não alterar contagem/hash de baseline apenas para fazer CI passar. Toda alteração deve ser explicada pela mudança executável e comprovada por replay.

## 10. Evidência visual

Em `pull_request`, `Production visual capture` tenta localizar um GitHub Deployment **bem-sucedido para o SHA exato do head** e exige `environment_url`. Se nenhum preview desse SHA for publicado, a captura falha/aguarda por ausência de alvo; ela não deve auditar produção ou outro preview silenciosamente.

A validação de sintaxe/contrato do auditor é independente da disponibilidade do deployment.

## 11. Validação

As correções são protegidas por testes de aplicação/runtime e pela suíte SQL `scripts/database/priority-platform-corrections/test-priority-platform-corrections.sql`, além dos gates canônicos de banco, reprodutibilidade e web.

Mudanças futuras nesses comportamentos devem atualizar código, testes e esta documentação no mesmo PR.