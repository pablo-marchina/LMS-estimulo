# Gate de prontidão para produção

## Resultado atual

```text
ready = false
production_deploy_allowed = false
staging_scaffolding = implemented_not_applied
external_blockers = open
accepted_risk = 0
```

Código, migrations, container standalone e Terraform não autorizam operação real. `passed` exige prova no ambiente-alvo; risco aceito exige decisão formal identificável.

## Evidências técnicas concluídas

- RLS interno abrangente e contratos server-only;
- tabelas server-only sem policies permanecem sem grants para `anon` e `authenticated`;
- redaction e secret scanning de repositório;
- cadastro público com confirmação e sem admin por domínio;
- RBAC administrativo explícito, revogável, temporal e auditável;
- 276 migrations reproduzíveis e testes transacionais no Supabase de desenvolvimento;
- zero avisos de foreign keys sem índice após a migration corretiva;
- maturidade em draft, sem atribuição, crédito ou CRM;
- nota de utilidade 1–5 com histórico append-only e exclusão de crédito;
- scanner externo fail-closed: sem provider, arquivo permanece em `manual_review`;
- política HubSpot allowlist e adapter HTTP real desabilitado sem inventário/token;
- build Next.js standalone, processo não-root e probes live/ready;
- Terraform de staging com guard, imagem por digest, configuração pública no build, secrets por ARN e dados privados/criptografados.

## Evidências ainda não obtidas

- rotação/revogação da credencial historicamente exposta;
- proteção contra senhas vazadas habilitada no provedor de identidade;
- scanner real configurado e testado com clean/infected;
- inventário HubSpot, token, scopes e write/readback em sandbox;
- configuração oficial dos quatro arquétipos;
- conteúdo oficial e assets da Jornada OpenAI;
- autorização/licença para cópia literal do projeto de referência;
- adapters AWS de identidade, RDS, S3 e SQS;
- conta/região/certificado/domínio/secrets AWS;
- imagem OCI construída e escaneada;
- Terraform validate/plan oficial e apply de staging;
- E2E real em staging, rollback, backup, PITR e restore;
- WCAG completa com auditoria assistiva;
- workflows do GitHub Actions executando steps no head atual;
- decisões jurídicas e operacionais descritas abaixo.

## Governança externa obrigatória

1. controlador e escopo jurídico;
2. encarregado ou análise formal de dispensa, com canal público;
3. aviso de privacidade e ROPA;
4. bases legais, consentimentos, retenção, exclusão e legal hold;
5. contratos, DPAs, subprocessadores e transferências;
6. owners, contatos e exercício de resposta a incidentes;
7. RPO/RTO e exercício de continuidade;
8. governança de crédito, revisão humana, contestação, explicabilidade, equidade e monitoramento;
9. aprovação metodológica, editorial e de acessibilidade;
10. homologação do piloto.

## Regra comportamental e de crédito

Dados educacionais e comportamentais permanecem fora de crédito por padrão. Maturidade, arquétipo, respostas, comentários e nota de utilidade não podem influenciar elegibilidade, risco ou decisão sem metodologia validada, revisão de vieses, governança humana, base legal e aprovação explícita. O banco e os adapters devem continuar falhando fechados.

## Regra de deploy

- `main` não deve receber merge enquanto checks obrigatórios ou revisões estiverem pendentes;
- produção exige stack separada e aprovação operacional;
- `confirm_deployment=false` é o default do Terraform;
- nenhum apply automático é permitido pelo repositório atual;
- ausência de prova deve ser registrada como bloqueio, nunca convertida em `passed`.
