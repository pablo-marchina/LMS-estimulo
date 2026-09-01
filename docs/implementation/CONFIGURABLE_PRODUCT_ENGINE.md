# Motor configurável de diagnóstico

**Revisado em:** 2026-09-01  
**Status:** implementado no PostgreSQL e interfaces administrativa/participante

## Escopo

O diagnóstico principal suporta versões de instrumento, perguntas/opções/dimensões/perfis dinâmicos, pesos/thresholds configuráveis, sessões/respostas/resultados auditáveis e publicação transacional com mapeamento de perfis. Diagnósticos opcionais possuem sessões próprias e nunca alteram arquétipo principal ou elegibilidade de jornada.

## Semântica de cálculo vigente

A correção de 31/08 estabiliza a interpretação da configuração existente:

1. para cada dimensão, o runtime calcula a média dos `score` das respostas que contribuíram para ela;
2. thresholds de um perfil são tratados como **limites superiores inclusivos**;
3. perfis/faixas são avaliados em ordem crescente de seu limite máximo, para que uma faixa larga não capture um score que pertence a uma faixa inferior;
4. configuração inconsistente continua sujeita às validações/abstenção do motor.

Exemplo conceitual: se duas faixas válidas terminam em `x` e `y`, com `x < y`, um score `<= x` deve ser testado contra a faixa de `x` antes da faixa de `y`.

## Limite metodológico

Essa regra não autoriza hardcode de nomes, pesos ou cortes. A documentação de pesquisa continua registrando que a metodologia oficial completa precisa ser fornecida/aprovada para afirmar validade dos cutoffs e das contribuições das alternativas.

## Persistência e histórico

```text
sessão + respostas
→ resultado reproduzível
→ atribuição principal, quando aplicável
→ evento/auditoria/outbox
```

Idempotency keys impedem duplicação. Resultados opcionais permanecem separados.

## Validação

```bash
npm run test:product
npm run test:database
npm run test:application
```

A suíte SQL de correções prioritárias também verifica a definição das funções responsáveis pela média e ordenação dos thresholds.