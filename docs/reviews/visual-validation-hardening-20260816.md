# Visual validation hardening — 2026-08-16

## Falha observada

A auditoria visual anterior produziu screenshots e verificou overflow/runtime, mas não abriu o estado dinâmico de aula selecionada em `/empreendedor/jornada/:id?conteudo=:step#aula`. Como a aula é aberta por `form`/server action, e não por um link `<a>`, o crawler de links não a descobriu. O estado quebrado podia portanto ficar fora da matriz mesmo com o workflow verde.

Também havia dois avisos de overflow autenticado em Certificados mobile. O workflow tratava esses casos apenas como warning, embora fossem regressões visuais reais.

## Regras obrigatórias daqui em diante

1. Estados dinâmicos críticos não podem depender só de descoberta por links.
2. A auditoria deve descobrir IDs a partir da interface autenticada atual, nunca de UUIDs congelados.
3. Uma tela só conta como coberta quando o seletor que caracteriza o estado esperado realmente renderiza.
4. A aula selecionada deve ser aberta em desktop e mobile e validar, por geometria, hero, trilhas e aula no mesmo eixo e com largura natural.
5. Overflow horizontal em tela autenticada é falha, não warning.
6. Screenshots full-page e viewport do estado crítico devem ser preservados como evidência.
7. A revisão final deve combinar: crawler amplo, gates geométricos de estados críticos e inspeção humana das evidências. Ausência de erro HTTP/console ou de overflow, isoladamente, não equivale a aprovação visual.

## Regressões cobertas por código

- Jornada/aula usa grid explícito de uma coluna e `min-w-0` nos blocos estruturais.
- Certificados usam tracks `minmax(0, 1fr)` nos grids que antes propagavam largura `min-content` no mobile.
- `production-visual-composition-audit.mjs` reprova se o estado de aula não puder ser descoberto/renderizado, se a composição lateralizar ou estreitar os blocos, ou se houver overflow autenticado.
