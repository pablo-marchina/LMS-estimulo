# Motor configurável de diagnóstico

**Revisado em:** 2026-07-31  
**Status:** implementado no runtime PostgreSQL e nas interfaces administrativa/participante

## Escopo

O diagnóstico principal suporta:

- definições e versões em rascunho, publicadas ou retiradas;
- quantidade dinâmica de perguntas, opções, dimensões e perfis;
- inclusão, exclusão e reordenação no rascunho;
- pesos e limites configuráveis por perfil e dimensão;
- sessões e respostas ligadas à versão utilizada;
- resultado e atribuição de arquétipo auditáveis;
- publicação transacional com mapeamento completo entre arquétipos antigos e novos;
- atualização das atribuições existentes e da elegibilidade das jornadas na mesma transação;
- preservação de respostas e resultados históricos;
- editor administrativo e fluxo guiado do participante.

A implementação ativa usa páginas em `apps/web/app/admin/diagnostico`, fluxos participantes e RPCs PostgreSQL versionadas. Não existe um motor paralelo dependente de CRM.

## Diagnóstico principal

Somente uma versão principal fica ativa. Ela é a única funcionalidade autorizada a:

- definir o arquétipo principal;
- recalcular ou migrar atribuições;
- alterar os códigos de arquétipo elegíveis nas jornadas.

Ao publicar uma nova versão, todo arquétipo da versão anterior precisa ser mapeado para um perfil da nova versão. A transação valida a completude antes de retirar a versão antiga.

## Diagnósticos opcionais

Diagnósticos opcionais podem ser publicados no Perfil por público, período, tentativas, intervalo e visibilidade do resultado. Eles usam sessões e resultados próprios e nunca escrevem em atribuições de arquétipo ou elegibilidade de jornadas.

## Versionamento e histórico

```text
definição estável
→ versão em rascunho
→ validação estrutural
→ versão publicada e imutável
→ sessões, respostas e resultados históricos
```

Editar um diagnóstico publicado cria ou atualiza um rascunho. Não existe alteração retroativa das perguntas respondidas.

## Score e abstenção

A configuração não pressupõe quantidade ou nomes fixos de perfis e dimensões. Limites, pesos e critérios pertencem à versão. Quando a evidência não satisfaz as regras, o resultado pode abster-se em vez de fabricar confiança.

## Persistência

O fluxo principal grava de forma transacional:

```text
sessão e respostas
→ resultado
→ atribuição principal
→ migração de referências quando houver nova publicação
→ evento, auditoria e outbox
```

Idempotency keys impedem duplicação; a mesma chave com payload divergente é recusada.

## Integração externa

Resultados permanecem no PostgreSQL. Exportações futuras usam eventos e outbox genérica. A classificação não conhece nem exige destino externo específico.

## Validação

```bash
npm run test:product
npm run test:database
npm run test:application
npm run typecheck:web
npm run build:web
```

A aprovação técnica não substitui validação metodológica, editorial, jurídica ou de acessibilidade das perguntas e textos publicados.
