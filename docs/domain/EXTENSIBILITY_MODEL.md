# Modelo de extensibilidade para novas jornadas

**Versão:** 1.0  
**Revisado em:** 2026-09-01  
**Status:** modelo vigente

## Objetivo

Permitir novas jornadas sem tornar a OpenAI uma condição especial do núcleo e sem exigir versionamento editorial paralelo para cada alteração.

Uma jornada comum deve poder ser criada e operada sem:

- tabela específica;
- enum por parceiro;
- `if (journey.slug === ...)` disperso;
- duplicação de páginas ou orquestração;
- migration apenas para editar conteúdo suportado.

## Configurável por dados

- programa, nome, descrição, público e temas;
- trilhas, etapas, atividades e conteúdos;
- elegibilidade e regras de progressão suportadas;
- quick checks, avaliações, entregas e feedback;
- pontos, badges, certificados e recompensas;
- instrumentação e metadata autorizada.

## Ciclo de vida da jornada

O produto atual usa:

```text
criar draft → editar → publicar → editar ao vivo
                    ↘ despublicar → draft
```

Publicar não cria uma segunda versão de jornada. O schema preserva nomes legados `journey_version*` por compatibilidade, mas o runtime trata o registro operacional como único.

Outras capacidades continuam usando definição–versão–instância quando precisam preservar a regra utilizada, especialmente diagnósticos, documentos legais, avaliações/credenciais onde aplicável.

## Nova jornada

1. criar a jornada em `draft`;
2. configurar programa/temas e elegibilidade;
3. montar trilhas e etapas;
4. cadastrar/reutilizar atividades e conteúdos;
5. configurar avaliações, prática e gamificação;
6. validar preview/editor;
7. publicar o mesmo registro;
8. operar matrículas/progresso;
9. editar ao vivo quando necessário ou despublicar para bloquear o uso.

Nenhum passo comum deve exigir migration específica da jornada.

## Regras e segurança

Regras configuráveis usam estruturas validadas e operadores permitidos; conteúdo do banco nunca vira código arbitrário. Nova capacidade estrutural pode exigir engenharia, mas deve entrar como capacidade genérica.

## Eventos e integrações

Eventos usam nomes de domínio genéricos e IDs no contexto. Integrações externas consomem outbox; não são condicionais específicas da jornada.

## Critérios de aceite

- segunda jornada pode ser criada sem migration específica;
- nenhum tipo central é exclusivo da OpenAI;
- edição/publicação usa o ciclo `draft ↔ published` atual;
- progresso deriva de critérios, não de índice visual hardcoded;
- quick checks e avaliações usam tipos genéricos;
- pontos são idempotentes;
- integrações externas permanecem desacopladas;
- fatos históricos não são reescritos por edição editorial.

Consulte [`../journeys/JOURNEY_LIFECYCLE.md`](../journeys/JOURNEY_LIFECYCLE.md).