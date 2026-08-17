# Checklist de evidência visual

Antes de declarar uma correção de interface concluída:

- [ ] O estado exato do bug foi aberto no navegador, não apenas a rota base.
- [ ] O estado esperado foi confirmado por seletor/condição específica antes da captura.
- [ ] Desktop e mobile foram capturados em viewport e full-page.
- [ ] Não há overflow horizontal autenticado.
- [ ] Elementos estruturais principais mantêm alinhamento, largura e ordem visual coerentes.
- [ ] Estados dinâmicos obtêm IDs da interface atual; não usam UUIDs congelados como única forma de cobertura.
- [ ] Erros HTTP/console/pageerror são verificados, mas não usados isoladamente como aprovação visual.
- [ ] As capturas do crawler amplo foram inspecionadas visualmente, além dos gates automáticos.
- [ ] Qualquer warning visual é classificado individualmente e resolvido ou justificado antes da aprovação.
