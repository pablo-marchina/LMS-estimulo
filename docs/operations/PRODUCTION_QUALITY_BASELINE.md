# Baseline de qualidade para produção

**Revisado em:** 2026-09-01

## Software reproduzível

- instalação por lockfile e toolchain definida;
- Linux/Windows validam instalação/typecheck/build;
- PostgreSQL é reconstruído desde vazio;
- schema, contratos públicos e contenção de legado são comparados com baselines machine-readable;
- mudança de baseline exige evidência de replay, nunca ajuste para silenciar CI.

## Segurança e privacidade

- sessão/identidade/actor são validados antes de RPC privilegiada;
- browser roles não executam facades server-only;
- administração combina identidade Google, vínculo interno, membership e RBAC;
- domínio de e-mail sozinho não concede acesso;
- ranking não expõe e-mail completo;
- arquivos permanecem privados e URL assinada não vira fato persistente;
- secrets não entram em cliente, Git ou artifacts.

## Correção funcional

- diagnóstico executa configuração de forma determinística sem inventar metodologia;
- múltipla escolha usa conjunto exato;
- aquisição de badge é dirigida por novo `award_id`, não por primeiro browser;
- enriquecimento opcional da home degrada sem apagar dados centrais;
- journey lifecycle segue `draft ↔ published` com edição ao vivo autorizada.

## Evidência visual

Captura deve apontar para o SHA efetivamente revisado. Em PR, ausência de GitHub Deployment com `environment_url` para o head é blocker de evidência, não autorização para usar outro deployment.

## Gate B

Produção institucional ainda exige AWS definida, E2E real, capacidade, isolamento, observabilidade, continuidade, segurança/privacidade, conteúdo e acessibilidade. Valores numéricos de um candidato ficam nos artifacts, não neste baseline.