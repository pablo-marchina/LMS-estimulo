# Captura visual reproduzível

**Revisado em:** 2026-09-01

O workflow `Production visual capture` usa Playwright para registrar evidência desktop/mobile das superfícies públicas, participante e administração.

## Pull requests

Em evento `pull_request`, o workflow **não usa silenciosamente produção nem um preview arbitrário**. Ele consulta GitHub Deployments do SHA exato do head e procura um status `success` com `environment_url`.

```text
PR head SHA
→ GitHub Deployment para o mesmo SHA
→ status success + environment_url
→ E2E_TARGET_URL
→ captura
```

Se nenhum deployment desse SHA for publicado dentro da janela de resolução, o passo `Resolve pull-request preview deployment` falha. Isso é uma ausência de alvo de preview, não uma razão para auditar código diferente.

A etapa `Validate visual capture tooling` é separada e pode passar mesmo sem deployment.

## Execução manual

**Actions → Production visual capture → Run workflow** aceita `target_url`. Sem input, usa `E2E_PRODUCTION_URL` se configurado para a execução manual autorizada. Credenciais E2E vêm de secrets.

## Evidências

O artifact `production-visual-capture-<run id>` contém screenshots e manifestos/proveniência. O workflow registra SHA alvo, ambiente e URL de origem; credenciais não são escritas no artifact.

## Cobertura

- `/`, `/entrar`, `/cadastro`;
- superfícies participantes autenticadas;
- superfícies admin autenticadas;
- templates dinâmicos representativos;
- desktop e mobile;
- overflow, headings, URLs finais, status e falhas.

Captura visual complementa CI funcional. Não transforma um preview Supabase/Vercel em produção institucional.